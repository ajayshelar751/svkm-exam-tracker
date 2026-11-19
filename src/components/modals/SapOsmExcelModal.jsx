import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Icon from '../common/Icon.jsx';
import { getTodayYYYYMMDD, formatDateDisplay } from '../../utils/helpers.js';

// --- Enterprise Excel Import, Metric Parser & File Rollback Hub ---
export default function SapOsmExcelModal({
  context,
  setContext,
  contexts,
  headerMetrics,
  config,
  currentUser,
  onApplyMetrics,
  onApplyLog,
  onBatchUpdateMetrics,
  onRollbackFile,
  onPurgeContextMetrics,
  showToast,
  showConfirm,
  onClose
}) {
  const [activeTab, setActiveTab] = useState("sap"); // 'sap' | 'acad_report' | 'osm' | 'calling_sheet' | 'custom' | 'history'
  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [cohortSearch, setCohortSearch] = useState("");
  const [selectedSemFilter, setSelectedSemFilter] = useState("ALL");
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [importMode, setImportMode] = useState("replace"); // 'replace' | 'selective' | 'merge'
  const [selectedCohorts, setSelectedCohorts] = useState({});
  const [showDebarredModal, setShowDebarredModal] = useState(false);
  const [customColMap, setCustomColMap] = useState({
    studentCol: "",
    pwdCol: "",
    debarredCol: "",
    moduleCol: ""
  });

  // SAP Session Code to Standard Semester Map
  const SESS_MAP = {
    "16": "Sem I",
    "17": "Sem II",
    "18": "Sem III",
    "19": "Sem IV",
    "20": "Sem V",
    "21": "Sem VI",
    "22": "Sem VII",
    "23": "Sem VIII"
  };

  // Helper to reliably resolve the SheetJS XLSX engine across ESM, CJS, and window global
  const getXlsxEngine = () => {
    if (XLSX && (XLSX.read || XLSX.utils)) return XLSX;
    if (typeof window !== 'undefined' && window.XLSX) return window.XLSX;
    return null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setParsing(true);

    try {
      let xlsxEngine = getXlsxEngine();
      if (!xlsxEngine && typeof window !== 'undefined' && window.ensureSheetJSLoaded) {
        await window.ensureSheetJSLoaded();
        xlsxEngine = getXlsxEngine();
      }
      if (!xlsxEngine) {
        throw new Error("SheetJS library is not loaded. Please verify ./xlsx.full.min.js exists in the local folder or refresh the page.");
      }
    } catch(loadErr) {
      setParseError(loadErr.message);
      setParsing(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const xlsxEngine = getXlsxEngine();
        if (!xlsxEngine) {
          throw new Error("SheetJS library is not loaded. Please verify ./xlsx.full.min.js exists in the local folder.");
        }
        const bstr = evt.target.result;
        const wb = xlsxEngine.read(bstr, { type: "binary", cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson = xlsxEngine.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          throw new Error("The selected Excel sheet contains no data rows.");
        }

        const availableCols = Object.keys(rawJson[0] || {});

        // Auto pre-populate custom column mapping guess
        const guessStudentCol = availableCols.find(k => /student.*id|sap.*id|roll.*no|enroll/i.test(k)) || availableCols[0] || "";
        const guessPwdCol = availableCols.find(k => /disability|pwd|handicap/i.test(k)) || "";
        const guessDebarredCol = availableCols.find(k => /debar|defaulter|attendance.*%|eligib|status/i.test(k)) || "";
        const guessModuleCol = availableCols.find(k => /module|course|subject|paper/i.test(k)) || "";
        setCustomColMap({
          studentCol: guessStudentCol,
          pwdCol: guessPwdCol,
          debarredCol: guessDebarredCol,
          moduleCol: guessModuleCol
        });

        // ==========================================
        // 1. SAP STUDENT MASTER PARSER
        // ==========================================
        if (activeTab === "sap") {
          const collegeVotes = {};
          const detectedYears = new Set();
          const cohortsMap = {};
          let totalPwdInFile = 0;

          // Helper to match program by code in config.programs
          const matchProgramInConfig = (pCode) => {
            const pCodeStr = String(pCode).trim();
            const configProgs = config?.programs || {};
            for (const [colId, progList] of Object.entries(configProgs)) {
              const found = (progList || []).find(p => p.startsWith(pCodeStr + " -") || p.startsWith(pCodeStr));
              if (found) {
                return { collegeId: colId, matchedProgram: found };
              }
            }
            return { collegeId: null, matchedProgram: null };
          };

          rawJson.forEach(row => {
            const keys = Object.keys(row);
            const pCodeKey = keys.find(k => /program\s*code/i.test(k)) || keys[0];
            const pCode = String(row[pCodeKey] || "").trim();
            if (!pCode) return;

            const sessKey = keys.find(k => /academic\s*sess/i.test(k)) || keys[4];
            const sessRaw = String(row[sessKey] || "").trim();
            const semMapped = SESS_MAP[sessRaw] || (sessRaw ? ("Sem " + sessRaw) : "Sem I");

            const yrKey = keys.find(k => /academic\s*year/i.test(k));
            if (yrKey && row[yrKey]) {
              const yrVal = String(row[yrKey]).trim();
              if (yrVal) detectedYears.add(yrVal);
            }

            const disKey = keys.find(k => /disability/i.test(k));
            const disVal = disKey ? String(row[disKey] || "").trim() : "";
            const isPwd = disVal && disVal.toLowerCase() !== "none" && disVal !== "-" && disVal !== "0";
            if (isPwd) totalPwdInFile++;

            const { collegeId, matchedProgram } = matchProgramInConfig(pCode);
            if (collegeId) {
              collegeVotes[collegeId] = (collegeVotes[collegeId] || 0) + 1;
            }

            const cohortKey = `${pCode}__${semMapped}`;
            if (!cohortsMap[cohortKey]) {
              cohortsMap[cohortKey] = {
                programCode: pCode,
                programName: matchedProgram || `Program ${pCode}`,
                collegeId: collegeId || (config?.colleges?.[0]?.id || "NMC"),
                semester: semMapped,
                sessionCode: sessRaw,
                studentCount: 0,
                pwdCount: 0
              };
            }
            cohortsMap[cohortKey].studentCount++;
            if (isPwd) cohortsMap[cohortKey].pwdCount++;
          });

          let detectedCollege = null;
          let maxVotes = 0;
          for (const [cId, count] of Object.entries(collegeVotes)) {
            if (count > maxVotes) {
              maxVotes = count;
              detectedCollege = cId;
            }
          }
          if (!detectedCollege) detectedCollege = context?.college || (config?.colleges?.[0]?.id || "NMC");

          let normalizedYear = context?.batch || "2026-27";
          if (detectedYears.size > 0) {
            const firstYr = Array.from(detectedYears)[0];
            if (/^\d{4}$/.test(firstYr)) {
              const yNum = parseInt(firstYr, 10);
              normalizedYear = `${yNum}-${String(yNum + 1).slice(-2)}`;
            } else {
              normalizedYear = firstYr;
            }
          }

          const cohortsList = Object.values(cohortsMap).sort((a, b) => {
            if (a.programCode !== b.programCode) return a.programCode.localeCompare(b.programCode);
            return a.semester.localeCompare(b.semester);
          });

          // Pre-select all cohorts by default
          const initialSelection = {};
          cohortsList.forEach(c => {
            initialSelection[`${c.programCode}__${c.semester}`] = true;
          });
          setSelectedCohorts(initialSelection);

          setParsedData({
            type: "sap",
            fileName: file.name,
            totalRows: rawJson.length,
            detectedCollege,
            detectedAcademicYear: normalizedYear,
            totalPwdInFile,
            cohorts: cohortsList,
            availableCols
          });
        }
        // ==========================================
        // 2. ACAD REPORT (MODULES & DEBARRED) PARSER
        // ==========================================
        else if (activeTab === "acad_report") {
          let debarredCount = 0;
          const detectedModules = new Set();
          const studentSet = new Set();
          const debarredList = [];

          rawJson.forEach(row => {
            const keys = Object.keys(row);
            
            // Find student identifier
            const idKey = keys.find(k => /student.*id|sap.*id|roll.*no|enroll/i.test(k)) || keys[0];
            const studentId = String(row[idKey] || "").trim();
            if (studentId) studentSet.add(studentId);

            // Find subject/module/course
            const modKey = keys.find(k => /module|course|subject|paper/i.test(k));
            if (modKey && row[modKey]) {
              const modVal = String(row[modKey]).trim();
              if (modVal) detectedModules.add(modVal);
            }

            // Find debarred / attendance status
            const debKey = keys.find(k => /debar|defaulter|attendance.*%|eligib|status|remarks/i.test(k));
            let isDebarred = false;
            if (debKey && row[debKey]) {
              const val = String(row[debKey]).trim().toLowerCase();
              if (val.includes("debar") || val.includes("defaulter") || val.includes("not elig") || val === "fail" || val === "d") {
                isDebarred = true;
              } else if (!isNaN(parseFloat(val)) && parseFloat(val) < 75.0 && parseFloat(val) > 0) {
                isDebarred = true;
              }
            }

            if (isDebarred) {
              debarredCount++;
              if (debarredList.length < 150) {
                debarredList.push({
                  id: studentId || `Row ${debarredList.length + 1}`,
                  details: debKey ? String(row[debKey]) : "Debarred (<75% Attendance)"
                });
              }
            }
          });

          const totalEligible = Math.max(0, (studentSet.size || rawJson.length) - debarredCount);
          const distinctModulesCount = detectedModules.size;

          setParsedData({
            type: "acad_report",
            fileName: file.name,
            totalRows: rawJson.length,
            totalStudentsFound: studentSet.size || rawJson.length,
            distinctModulesCount,
            detectedModulesList: Array.from(detectedModules),
            debarredCount,
            totalEligible,
            debarredSample: debarredList,
            availableCols
          });
        }
        // ==========================================
        // 3. OSM EVALUATION RAW DATA PARSER
        // ==========================================
        else if (activeTab === "osm") {
          let evaluatedScripts = 0;
          let pendingScripts = 0;
          const examiners = new Set();

          rawJson.forEach(row => {
            const keys = Object.keys(row);
            const statusKey = keys.find(k => /status|eval.*status|marking/i.test(k));
            const status = statusKey ? String(row[statusKey]).toLowerCase() : "";
            if (status.includes("eval") || status.includes("done") || status.includes("complete")) {
              evaluatedScripts++;
            } else {
              pendingScripts++;
            }

            const exKey = keys.find(k => /examiner|evaluator|teacher/i.test(k));
            if (exKey && row[exKey]) examiners.add(String(row[exKey]).trim());
          });

          setParsedData({
            type: "osm",
            fileName: file.name,
            totalRows: rawJson.length,
            evaluatedScripts: evaluatedScripts || rawJson.length,
            pendingScripts,
            distinctExaminers: examiners.size,
            availableCols
          });
        }
        // ==========================================
        // 4. CALLING SHEET / SEATING PARSER
        // ==========================================
        else if (activeTab === "calling_sheet") {
          const rooms = new Set();
          const blocks = new Set();
          rawJson.forEach(row => {
            const keys = Object.keys(row);
            const roomKey = keys.find(k => /room|hall|class/i.test(k));
            if (roomKey && row[roomKey]) rooms.add(String(row[roomKey]).trim());

            const blockKey = keys.find(k => /block|batch|desk/i.test(k));
            if (blockKey && row[blockKey]) blocks.add(String(row[blockKey]).trim());
          });

          setParsedData({
            type: "calling_sheet",
            fileName: file.name,
            totalRows: rawJson.length,
            totalAllottedStudents: rawJson.length,
            distinctRooms: rooms.size || 1,
            distinctBlocks: blocks.size || 1,
            availableCols
          });
        }
        // ==========================================
        // 5. CUSTOM / UNIVERSAL COLUMN MAPPER
        // ==========================================
        else {
          setParsedData({
            type: "custom",
            fileName: file.name,
            totalRows: rawJson.length,
            sampleRows: rawJson.slice(0, 5),
            availableCols,
            rawJson
          });
        }

        setParsing(false);
      } catch (err) {
        console.error("Excel parse error:", err);
        setParseError(err.message || "Failed to parse Excel file.");
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError("File reading failed. Please re-select the file.");
      setParsing(false);
    };
    reader.readAsBinaryString(file);
  };

  // Helper to check if cohort matches currently active context
  const isCohortActiveContext = (cohort) => {
    if (!context) return false;
    const sameCol = (cohort.collegeId === context.college);
    const sameSem = (cohort.semester === context.semester);
    const progMatch = context.program && (
      context.program.startsWith(cohort.programCode + " -") ||
      context.program.startsWith(cohort.programCode) ||
      context.program === cohort.programName
    );
    return sameCol && sameSem && progMatch;
  };

  // 1-Click: Apply Cohort to Current Active Context
  const handleApplyCohortToActive = (cohort) => {
    if (!onApplyMetrics) return;
    
    if (setContext && (!isCohortActiveContext(cohort))) {
      setContext(prev => ({
        ...prev,
        college: cohort.collegeId || prev.college,
        program: cohort.programName || prev.program,
        semester: cohort.semester || prev.semester,
        batch: parsedData?.detectedAcademicYear || prev.batch
      }));
    }

    const currentTotal = headerMetrics?.totalStudents || 0;
    const finalTotal = (importMode === "merge") ? (currentTotal + cohort.studentCount) : cohort.studentCount;
    const currentPwd = headerMetrics?.pwdStudents || 0;
    const finalPwd = (importMode === "merge") ? (currentPwd + cohort.pwdCount) : cohort.pwdCount;

    onApplyMetrics({
      ...headerMetrics,
      totalStudents: finalTotal,
      pwdStudents: finalPwd,
      batch: parsedData?.detectedAcademicYear || context?.batch,
      isUploadedFromExcel: true,
      lastImportedFile: fileName || parsedData?.fileName
    });

    if (window.showPortalToast) {
      window.showPortalToast(`Applied (${importMode === 'merge' ? 'Merged' : 'Replaced'}) ${cohort.programName} (${cohort.semester}): ${finalTotal} Students, ${finalPwd} PWD!`, "success");
    }
  };

  // 1-Click: Apply Acad Report metrics
  const handleApplyAcadReportToActive = () => {
    if (!onApplyMetrics || !parsedData) return;
    onApplyMetrics({
      ...headerMetrics,
      numModules: parsedData.distinctModulesCount || 0,
      debarredStudents: parsedData.debarredCount || 0,
      isUploadedFromExcel: true,
      lastImportedFile: fileName || parsedData?.fileName
    });
    if (window.showPortalToast) {
      window.showPortalToast(`Applied Acad Report: ${parsedData.distinctModulesCount} Active Modules & ${parsedData.debarredCount} Debarred Students!`, "success");
    }
  };

  // 1-Click: Apply OSM Evaluation metrics to Active Session
  const handleApplyOsmToActive = () => {
    if (!onApplyMetrics || !parsedData) return;
    onApplyMetrics({
      ...headerMetrics,
      evaluatedScripts: parsedData.evaluatedScripts || 0,
      pendingScripts: parsedData.pendingScripts || 0,
      distinctExaminers: parsedData.distinctExaminers || 0,
      isUploadedFromExcel: true,
      lastImportedFile: fileName || parsedData?.fileName
    });
    if (window.showPortalToast) {
      window.showPortalToast(`Applied OSM Metrics: ${parsedData.evaluatedScripts} Evaluated Scripts & ${parsedData.distinctExaminers} Examiners!`, "success");
    }
  };

  // 1-Click: Apply Calling Sheet / Seating metrics to Active Session
  const handleApplyCallingSheetToActive = () => {
    if (!onApplyMetrics || !parsedData) return;
    onApplyMetrics({
      ...headerMetrics,
      totalAllottedStudents: parsedData.totalAllottedStudents || 0,
      distinctRooms: parsedData.distinctRooms || 1,
      distinctBlocks: parsedData.distinctBlocks || 1,
      isUploadedFromExcel: true,
      lastImportedFile: fileName || parsedData?.fileName
    });
    if (window.showPortalToast) {
      window.showPortalToast(`Applied Calling Sheet: ${parsedData.totalAllottedStudents} Seating Allotted across ${parsedData.distinctRooms} Rooms!`, "success");
    }
  };

  // 1-Click: Batch Sync Cohorts to Supabase PostgreSQL with Mode & Snapshot
  const handleBatchSyncCohorts = async () => {
    if (!parsedData?.cohorts || !onBatchUpdateMetrics) return;
    
    // Filter by selective checkboxes
    const cohortsToSync = parsedData.cohorts.filter(c => 
      importMode === "selective" ? !!selectedCohorts[`${c.programCode}__${c.semester}`] : true
    );

    if (cohortsToSync.length === 0) {
      if (window.showPortalToast) window.showPortalToast("No cohorts selected for import.", "warning");
      return;
    }

    setBatchSyncing(true);
    try {
      await onBatchUpdateMetrics({
        college: parsedData.detectedCollege,
        academicYear: parsedData.detectedAcademicYear,
        cohorts: cohortsToSync,
        mode: importMode,
        fileName: fileName || parsedData.fileName
      });
    } catch (e) {
      console.error(e);
      if (window.showPortalToast) {
        window.showPortalToast(e?.message ? `Sync error: ${e.message}` : "Failed to batch synchronize cohorts. Please check network.", "error");
      }
    } finally {
      setBatchSyncing(false);
    }
  };

  // Toggle selection for all filtered cohorts
  const handleToggleSelectAll = (checked) => {
    const next = { ...selectedCohorts };
    filteredCohorts.forEach(c => {
      next[`${c.programCode}__${c.semester}`] = checked;
    });
    setSelectedCohorts(next);
  };

  // Filter cohorts by search or semester
  const filteredCohorts = useMemo(() => {
    if (!parsedData?.cohorts) return [];
    return parsedData.cohorts.filter(c => {
      const matchSearch = !cohortSearch ||
        c.programCode.toLowerCase().includes(cohortSearch.toLowerCase()) ||
        c.programName.toLowerCase().includes(cohortSearch.toLowerCase());
      const matchSem = (selectedSemFilter === "ALL") || (c.semester === selectedSemFilter);
      return matchSearch && matchSem;
    });
  }, [parsedData?.cohorts, cohortSearch, selectedSemFilter]);

  const activeContextCohort = useMemo(() => {
    if (!parsedData?.cohorts) return null;
    return parsedData.cohorts.find(c => isCohortActiveContext(c));
  }, [parsedData?.cohorts, context]);

  const activeContextKey = context ? `${context.college}__${context.batch}__${context.program}__${context.semester}__${context.examCycle}` : "";

  const importHistoryList = config?.importHistory || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 to-white dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Icon name="upload" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Enterprise Excel Import, Metric Parser &amp; Rollback Hub</span>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Client RAM • Zero Storage
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-extract counts, replace existing session metrics with diff checks, and rollback previous files on-demand.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Tab Selector: Multi-Excel Options & Rollback */}
        <div className="px-5 pt-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Select Operation or Excel Document Type</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold lowercase">in-memory parser &amp; snapshot undo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
            {[
              { id: "sap", label: "1. SAP Student Master", icon: "users", badge: "Cohorts & PWD" },
              { id: "acad_report", label: "2. Acad Report", icon: "layers", badge: "Debarred & Modules" },
              { id: "osm", label: "3. OSM Evaluation", icon: "check-circle", badge: "Evaluated Scripts" },
              { id: "calling_sheet", label: "4. Calling Sheet", icon: "grid", badge: "Seating" },
              { id: "custom", label: "5. Column Mapper", icon: "sliders", badge: "Universal" },
              { id: "history", label: "6. Uploaded Files", icon: "rotate-ccw", badge: `${importHistoryList.filter(h => h.status !== 'ROLLED_BACK').length} Files Ingested` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); if (tab.id !== 'history') { setParseError(""); } }}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex flex-col items-start transition border ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-sm'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="truncate">{tab.label}</span>
                </div>
                <span className={`text-[9px] mt-0.5 ${tab.id === 'history' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Zero File Storage Banner */}
          <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">Zero File Storage Policy:</span>
              <span className="text-emerald-700 dark:text-emerald-400">
                Raw spreadsheets are processed entirely in browser memory. Only derived numerical counts are synchronized to Supabase PostgreSQL.
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/70 px-1.5 py-0.5 rounded text-emerald-900 dark:text-emerald-200">
              CLIENT RAM
            </span>
          </div>

          {/* TAB 6: UPLOADED FILES & ROLLBACK LEDGER */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Icon name="database" size={16} className="text-indigo-600" />
                    <span>File Ingestion Ledger &amp; Rollback History</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Every file import creates a restore point. Clicking <strong>Rollback Records</strong> reverts affected session metrics back to their exact pre-import snapshot.
                  </p>
                </div>
                {activeContextKey && onPurgeContextMetrics && (
                  <button
                    type="button"
                    onClick={() => onPurgeContextMetrics(activeContextKey)}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Icon name="trash-2" size={13} />
                    <span>Purge Active Context Metrics to 0</span>
                  </button>
                )}
              </div>

              {importHistoryList.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Icon name="folder" size={24} />
                  </div>
                  <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Ingested Files Recorded Yet</h5>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    When you import a SAP Student Master, Acad Report, or OSM file in this session, it will be registered here with pre-import snapshots for 1-click rollback.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">File Name &amp; Type</th>
                        <th className="p-3">Imported At</th>
                        <th className="p-3">Imported By</th>
                        <th className="p-3 text-center">Mode</th>
                        <th className="p-3 text-center">Affected Cohorts</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importHistoryList.map((item, idx) => {
                        const isRolledBack = item.status === "ROLLED_BACK";
                        return (
                          <tr key={item.id || idx} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${isRolledBack ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''}`}>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Icon name="file-text" size={14} className="text-indigo-600" />
                                <span>{item.fileName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">{item.fileType || "EXCEL"}</span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {item.importedAt ? new Date(item.importedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{item.importedByName || "CED Admin"}</div>
                              <div className="text-[10px] text-slate-400">{item.importedByEmail || ""}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                item.mode === 'merge' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}>
                                {item.mode || "Replace"}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {item.affectedContextKeys?.length || item.cohortsCount || 0}
                            </td>
                            <td className="p-3 text-center">
                              {isRolledBack ? (
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[10px]">
                                  Rolled Back
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] flex items-center justify-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Active In DB</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isRolledBack ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  Restored on {item.rolledBackAt ? new Date(item.rolledBackAt).toLocaleDateString() : ""}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onRollbackFile && onRollbackFile(item.id)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center gap-1"
                                  title="Revert all metrics touched by this file back to exact pre-import state"
                                >
                                  <Icon name="rotate-ccw" size={12} />
                                  <span>Rollback File</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DROPZONE (Tabs 1 - 5) */}
          {activeTab !== "history" && (
            <div>
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Icon name="file-text" size={24} />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-center">
                  {fileName ? fileName : (
                    activeTab === 'sap' ? 'Select or Drop SAP Student Master Excel (e.g. NMC Student Master Data 2026.XLSX)' :
                    activeTab === 'acad_report' ? 'Select or Drop Acad Report Excel (Attendance, Eligibility & Course Modules)' :
                    activeTab === 'osm' ? 'Select or Drop OSM Evaluation Raw Excel' :
                    activeTab === 'calling_sheet' ? 'Select or Drop Calling Sheet / Seating Excel' :
                    'Select or Drop any Excel Spreadsheet (.xlsx, .xls, .csv)'
                  )}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {parsing ? "Parsing spreadsheet in browser memory..." : "Click to browse or drag & drop file here"}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={parsing}
                />
              </label>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Icon name="alert-circle" size={16} className="text-rose-500 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* IMPORT MODE SELECTOR (Visible when file is parsed on SAP or Acad) */}
          {parsedData && activeTab !== "history" && (
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Icon name="sliders" size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-900 dark:text-white">Choose Data Import &amp; Application Mode:</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {[
                  { id: "replace", label: "Clean Replace (Recommended)", desc: "Overwrites existing counts with file data" },
                  { id: "selective", label: "Selective Overwrite", desc: "Select specific cohorts to overwrite" },
                  { id: "merge", label: "Merge / Additive", desc: "Adds to existing session counts" }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setImportMode(m.id)}
                    className={`px-3 py-1 rounded-md font-semibold text-xs transition ${
                      importMode === m.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={m.desc}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: SAP STUDENT MASTER PARSED RESULTS             */}
          {/* ==================================================== */}
          {parsedData?.type === "sap" && activeTab === "sap" && (
            <div className="space-y-4">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Auto-Detected College</div>
                  <div className="text-base font-extrabold text-indigo-950 dark:text-white mt-0.5">
                    {parsedData.detectedCollege}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Matched from Program Codes</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Academic Year</div>
                  <div className="text-base font-extrabold text-blue-950 dark:text-white mt-0.5">
                    {parsedData.detectedAcademicYear}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400">Auto-populated from Excel</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Total Students</div>
                  <div className="text-base font-extrabold text-emerald-950 dark:text-white mt-0.5">
                    {parsedData.totalRows.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Across {parsedData.cohorts.length} Cohorts</div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                  <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">PWD Candidates</div>
                  <div className="text-base font-extrabold text-purple-950 dark:text-white mt-0.5">
                    {parsedData.totalPwdInFile}
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400">Disability column scanned</div>
                </div>
              </div>

              {/* Active Context Callout */}
              {activeContextCohort ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300 uppercase block">
                      Active Context Match Detected
                    </span>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                      {activeContextCohort.programName} • {activeContextCohort.semester} ({activeContextCohort.collegeId})
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 ml-2">
                      &rarr; <strong>{activeContextCohort.studentCount}</strong> Students, <strong>{activeContextCohort.pwdCount}</strong> PWD
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      Current DB total: {headerMetrics?.totalStudents || 0} students &rarr; Diff: {(activeContextCohort.studentCount - (headerMetrics?.totalStudents || 0)) > 0 ? `+${activeContextCohort.studentCount - (headerMetrics?.totalStudents || 0)}` : (activeContextCohort.studentCount - (headerMetrics?.totalStudents || 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onPurgeContextMetrics && activeContextKey && (
                      <button
                        type="button"
                        onClick={() => onPurgeContextMetrics(activeContextKey)}
                        className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title="Clear metrics for this session to 0"
                      >
                        Purge to 0
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyCohortToActive(activeContextCohort)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                    >
                      <Icon name="check" size={13} />
                      <span>Apply ({importMode.toUpperCase()}) to Active</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Current context ({context?.college} • {context?.program} • {context?.semester}) not in this file. Select a cohort row below to apply.</span>
                </div>
              )}

              {/* Cohorts Table Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={cohortSearch}
                    onChange={(e) => setCohortSearch(e.target.value)}
                    placeholder="Search program code or name..."
                    className="w-full max-w-xs px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <select
                    value={selectedSemFilter}
                    onChange={(e) => setSelectedSemFilter(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Semesters</option>
                    <option value="Sem I">Sem I (16)</option>
                    <option value="Sem II">Sem II (17)</option>
                    <option value="Sem III">Sem III (18)</option>
                    <option value="Sem IV">Sem IV (19)</option>
                    <option value="Sem V">Sem V (20)</option>
                    <option value="Sem VI">Sem VI (21)</option>
                    <option value="Sem VII">Sem VII (22)</option>
                    <option value="Sem VIII">Sem VIII (23)</option>
                  </select>
                </div>

                {/* Batch Sync to Supabase */}
                {onBatchUpdateMetrics && (
                  <button
                    type="button"
                    onClick={handleBatchSyncCohorts}
                    disabled={batchSyncing}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <Icon name="database" size={13} />
                    <span>
                      {batchSyncing ? "Syncing..." : `Sync Selected Cohorts (${importMode.toUpperCase()} Mode)`}
                    </span>
                  </button>
                )}
              </div>

              {/* Cohorts Table with Diff Badges */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={filteredCohorts.length > 0 && filteredCohorts.every(c => !!selectedCohorts[`${c.programCode}__${c.semester}`])}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="rounded text-indigo-600"
                          title="Select / Unselect all"
                        />
                      </th>
                      <th className="p-2">Prog Code</th>
                      <th className="p-2">Program Name</th>
                      <th className="p-2 text-center">Semester</th>
                      <th className="p-2 text-right">File Count</th>
                      <th className="p-2 text-center">Diff / Impact</th>
                      <th className="p-2 text-right">PWD</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCohorts.map((c, i) => {
                      const isMatch = isCohortActiveContext(c);
                      const cohortKey = `${c.programCode}__${c.semester}`;
                      const isSelected = !!selectedCohorts[cohortKey];

                      // Compare against current contexts in memory
                      const targetCtxKey = `${c.collegeId}__${parsedData.detectedAcademicYear}__${c.programName}__${c.semester}__Regular`;
                      const existingMetrics = contexts?.[targetCtxKey]?.headerMetrics || {};
                      const existingCount = existingMetrics.totalStudents ?? 0;
                      const diffCount = c.studentCount - existingCount;

                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${isMatch ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => setSelectedCohorts(prev => ({ ...prev, [cohortKey]: e.target.checked }))}
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{c.programCode}</td>
                          <td className="p-2 text-slate-800 dark:text-slate-200">{c.programName}</td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                              {c.semester}
                            </span>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900 dark:text-white">{c.studentCount}</td>
                          <td className="p-2 text-center">
                            {existingCount === 0 ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                New (+{c.studentCount})
                              </span>
                            ) : diffCount === 0 ? (
                              <span className="text-[10px] text-slate-400">
                                Unchanged ({existingCount})
                              </span>
                            ) : diffCount > 0 ? (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                {existingCount} &rarr; {c.studentCount} (+{diffCount})
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                {existingCount} &rarr; {c.studentCount} ({diffCount})
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {c.pwdCount > 0 ? (
                              <span className="text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 rounded">
                                {c.pwdCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleApplyCohortToActive(c)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                isMatch
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isMatch ? "Active Match" : "Apply"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: ACAD REPORT PARSED RESULTS                    */}
          {/* ==================================================== */}
          {parsedData?.type === "acad_report" && activeTab === "acad_report" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Active Modules / Papers</div>
                  <div className="text-xl font-extrabold text-indigo-950 dark:text-white mt-0.5">
                    {parsedData.distinctModulesCount}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Unique Subjects Detected</div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">Debarred Students</div>
                  <div className="text-xl font-extrabold text-rose-950 dark:text-white mt-0.5">
                    {parsedData.debarredCount}
                  </div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400">&lt;75% Attendance Defaulters</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Eligible Students</div>
                  <div className="text-xl font-extrabold text-emerald-950 dark:text-white mt-0.5">
                    {parsedData.totalEligible.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Total Enrolled - Debarred</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleApplyAcadReportToActive}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition"
                  >
                    Apply ({importMode.toUpperCase()}) to Active
                  </button>
                  {parsedData.debarredCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDebarredModal(true)}
                      className="w-full py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition"
                    >
                      View Debarred List ({parsedData.debarredCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Detected Modules List */}
              {parsedData.detectedModulesList?.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Detected Course Papers / Modules ({parsedData.detectedModulesList.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.detectedModulesList.map((m, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: OSM RAW DATA PARSED RESULTS                   */}
          {/* ==================================================== */}
          {parsedData?.type === "osm" && activeTab === "osm" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Evaluated Scripts</div>
                  <div className="text-xl font-extrabold text-emerald-950 dark:text-white mt-0.5">
                    {parsedData.evaluatedScripts.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Answer Booklets Completed</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Pending Evaluation</div>
                  <div className="text-xl font-extrabold text-amber-950 dark:text-white mt-0.5">
                    {parsedData.pendingScripts.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400">Awaiting Examiner Scoring</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Distinct Examiners</div>
                  <div className="text-xl font-extrabold text-indigo-950 dark:text-white mt-0.5">
                    {parsedData.distinctExaminers}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Allocated Faculty Evaluators</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Ready to link evaluated answer booklets count directly to current session activity tracking:
                </span>
                <button
                  type="button"
                  onClick={handleApplyOsmToActive}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition"
                >
                  Apply Evaluation Progress to Session
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: CALLING SHEET PARSED RESULTS                  */}
          {/* ==================================================== */}
          {parsedData?.type === "calling_sheet" && activeTab === "calling_sheet" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Allotted Students</div>
                  <div className="text-xl font-extrabold text-indigo-950 dark:text-white mt-0.5">
                    {parsedData.totalAllottedStudents.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Seating Capacity Filled</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Exam Halls / Rooms</div>
                  <div className="text-xl font-extrabold text-blue-950 dark:text-white mt-0.5">
                    {parsedData.distinctRooms}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400">Door Plan Venues</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Seating Blocks</div>
                  <div className="text-xl font-extrabold text-emerald-950 dark:text-white mt-0.5">
                    {parsedData.distinctBlocks}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Junior Supervisor Blocks</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Apply seating allotment numbers to current examination session:
                </span>
                <button
                  type="button"
                  onClick={handleApplyCallingSheetToActive}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition"
                >
                  Apply Allotted Seating &amp; Rooms
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: UNIVERSAL COLUMN MAPPER RESULTS               */}
          {/* ==================================================== */}
          {parsedData?.type === "custom" && activeTab === "custom" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Map Custom Excel Columns to CED Metrics:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Student Roll / SAP ID</label>
                    <select
                      value={customColMap.studentCol}
                      onChange={(e) => setCustomColMap(prev => ({ ...prev, studentCol: e.target.value }))}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- None --</option>
                      {parsedData.availableCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">PWD / Disability Column</label>
                    <select
                      value={customColMap.pwdCol}
                      onChange={(e) => setCustomColMap(prev => ({ ...prev, pwdCol: e.target.value }))}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- None --</option>
                      {parsedData.availableCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Debarred / Status Column</label>
                    <select
                      value={customColMap.debarredCol}
                      onChange={(e) => setCustomColMap(prev => ({ ...prev, debarredCol: e.target.value }))}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- None --</option>
                      {parsedData.availableCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Course / Module Column</label>
                    <select
                      value={customColMap.moduleCol}
                      onChange={(e) => setCustomColMap(prev => ({ ...prev, moduleCol: e.target.value }))}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- None --</option>
                      {parsedData.availableCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!parsedData.rawJson) return;
                      let studentsCount = 0;
                      let pwdCount = 0;
                      let debarredCount = 0;
                      const modulesSet = new Set();
                      const stdSet = new Set();

                      parsedData.rawJson.forEach(row => {
                        if (customColMap.studentCol && row[customColMap.studentCol]) {
                          stdSet.add(String(row[customColMap.studentCol]).trim());
                        }
                        if (customColMap.pwdCol && row[customColMap.pwdCol]) {
                          const v = String(row[customColMap.pwdCol]).trim().toLowerCase();
                          if (v && v !== "none" && v !== "-" && v !== "0") pwdCount++;
                        }
                        if (customColMap.debarredCol && row[customColMap.debarredCol]) {
                          const v = String(row[customColMap.debarredCol]).trim().toLowerCase();
                          if (v.includes("debar") || v.includes("defaulter") || (parseFloat(v) < 75 && parseFloat(v) > 0)) {
                            debarredCount++;
                          }
                        }
                        if (customColMap.moduleCol && row[customColMap.moduleCol]) {
                          modulesSet.add(String(row[customColMap.moduleCol]).trim());
                        }
                      });

                      studentsCount = stdSet.size || parsedData.rawJson.length;
                      onApplyMetrics({
                        ...headerMetrics,
                        totalStudents: studentsCount,
                        pwdStudents: pwdCount,
                        debarredStudents: debarredCount,
                        numModules: modulesSet.size || headerMetrics?.numModules || 0,
                        isUploadedFromExcel: true,
                        lastImportedFile: fileName || parsedData.fileName
                      });

                      if (window.showPortalToast) {
                        window.showPortalToast(`Custom Import Applied (${importMode.toUpperCase()}): ${studentsCount} Students, ${pwdCount} PWD, ${debarredCount} Debarred!`, "success");
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    Run Custom Mapping &amp; Replace Active Metrics
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedData ? `Parsed ${parsedData.totalRows} rows in memory` : "Ready to accept raw Excel data"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>

      {/* Debarred Students List Modal */}
      {showDebarredModal && parsedData?.debarredSample && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon name="alert-triangle" size={16} className="text-rose-500" />
                <span>Attendance Defaulters List (&lt;75%)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowDebarredModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {parsedData.debarredSample.map((deb, idx) => (
                <div key={idx} className="p-2 bg-rose-50/60 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-rose-900 dark:text-rose-200">{deb.id}</span>
                  <span className="text-[11px] text-rose-700 dark:text-rose-300">{deb.details}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDebarredModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
