import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Icon from '../common/Icon.jsx';
import { getTodayYYYYMMDD, formatDateDisplay } from '../../utils/helpers.js';
import SessionModulesModal from './SessionModulesModal.jsx';

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
  const canUserImport = Boolean(currentUser?.isAdmin || ['COE', 'DY_COE'].includes(currentUser?.role) || currentUser?.canImportExcel);
  const canUserRemove = Boolean(currentUser?.isAdmin || ['COE', 'DY_COE'].includes(currentUser?.role) || currentUser?.canRemoveData);

  const [activeTab, setActiveTab] = useState(() => canUserImport ? "sap" : "history"); // 'sap' | 'acad_report' | 'osm' | 'calling_sheet' | 'custom' | 'history'
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
  const [previewCohortSubjects, setPreviewCohortSubjects] = useState(null);
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
        // 2. ACAD REPORT (MODULES & COHORTS) PARSER
        // ==========================================
        else if (activeTab === "acad_report") {
          // Identify columns with robust pattern matching
          const schoolCol = availableCols.find(k => /school\s*name|college\s*name|institution/i.test(k));
          const acadYearCol = availableCols.find(k => /current.*acad.*year|academic.*year/i.test(k));
          const progAbbrevCol = availableCols.find(k => /program\s*abbrev/i.test(k)) || availableCols.find(k => /prog.*code|program/i.test(k));
          const progNameCol = availableCols.find(k => /program\s*name/i.test(k));
          const sessionCol = availableCols.find(k => /current\s*session|semester|session/i.test(k));
          const modAbbrevCol = availableCols.find(k => /module\s*abbrev|course\s*abbrev|subject\s*code|module\s*code|course\s*code/i.test(k)) || availableCols.find(k => /module|course|subject/i.test(k));
          const modDescCol = availableCols.find(k => /module\s*desc|course\s*desc|module\s*name|subject\s*desc|subject\s*name/i.test(k));
          const bookedCol = availableCols.find(k => /booked\s*stud|enrolled/i.test(k));
          const examModeCol = availableCols.find(k => /exam\s*mode|^mode$/i.test(k));
          const onlyIcaCol = availableCols.find(k => /only\s*ica/i.test(k));
          const onlyNueCol = availableCols.find(k => /only.*nue/i.test(k));
          const scale1Col = availableCols.find(k => /appraisal.*1.*scale|type\s*1.*scale|scale\s*1/i.test(k));
          const scale2Col = availableCols.find(k => /appraisal.*2.*scale|type\s*2.*scale|scale\s*2/i.test(k));
          const creditCol = availableCols.find(k => /module\s*credit|credits?/i.test(k));
          const durationCol = availableCols.find(k => /duration/i.test(k));
          const debarCol = availableCols.find(k => /debar|defaulter|attendance.*%|eligib|status/i.test(k));
          const studentIdCol = availableCols.find(k => /student.*id|sap.*id|roll.*no|enroll/i.test(k));

          // Helper to normalize semester strings (e.g. "Semester I", "Sem 1", "16" -> "Sem I")
          const normalizeSemester = (val) => {
            if (!val) return "Sem I";
            const s = String(val).trim();
            if (/^(sem|semester)?\s*i$/i.test(s) || s === "1" || s === "16") return "Sem I";
            if (/^(sem|semester)?\s*ii$/i.test(s) || s === "2" || s === "17") return "Sem II";
            if (/^(sem|semester)?\s*iii$/i.test(s) || s === "3" || s === "18") return "Sem III";
            if (/^(sem|semester)?\s*iv$/i.test(s) || s === "4" || s === "19") return "Sem IV";
            if (/^(sem|semester)?\s*v$/i.test(s) || s === "5" || s === "20") return "Sem V";
            if (/^(sem|semester)?\s*vi$/i.test(s) || s === "6" || s === "21") return "Sem VI";
            if (/^(sem|semester)?\s*vii$/i.test(s) || s === "7" || s === "22") return "Sem VII";
            if (/^(sem|semester)?\s*viii$/i.test(s) || s === "8" || s === "23") return "Sem VIII";
            if (/^sem/i.test(s)) return s;
            return "Sem " + s;
          };

          // Helper to strip "S0" from marks appraisal scale (e.g. S040 -> 40, S060 -> 60)
          const stripS0 = (val) => {
            if (val === null || val === undefined) return "";
            const str = String(val).trim();
            return str.replace(/^S0/i, "").trim();
          };

          // College identification by school name voting
          let detectedCollege = context?.college || "NMC";
          if (schoolCol) {
            const schoolVotes = {};
            rawJson.forEach(row => {
              const sc = String(row[schoolCol] || "").trim();
              if (sc) schoolVotes[sc] = (schoolVotes[sc] || 0) + 1;
            });
            const topSchool = Object.entries(schoolVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
            if (/narsee|nmc|nm\b/i.test(topSchool)) {
              detectedCollege = "NMC";
            } else if (/usha|upg/i.test(topSchool)) {
              detectedCollege = "UPG";
            } else if (/mithibai/i.test(topSchool)) {
              detectedCollege = "MITHIBAI";
            } else if (config?.colleges) {
              const matched = config.colleges.find(c => topSchool.toLowerCase().includes(c.id.toLowerCase()) || topSchool.toLowerCase().includes(c.name.toLowerCase()));
              if (matched) detectedCollege = matched.id;
            }
          }

          // Academic Year identification
          let normalizedYear = context?.batch || "2026-27";
          if (acadYearCol) {
            const yrRow = rawJson.find(r => r[acadYearCol] && String(r[acadYearCol]).trim());
            if (yrRow) {
              const yrVal = String(yrRow[acadYearCol]).trim();
              if (/^\d{4}$/.test(yrVal)) {
                const yNum = parseInt(yrVal, 10);
                normalizedYear = `${yNum}-${String(yNum + 1).slice(-2)}`;
              } else if (yrVal) {
                normalizedYear = yrVal;
              }
            }
          }

          const cohortsMap = {};
          let totalBookedAcrossFile = 0;
          let totalWritAcrossFile = 0;
          let totalLabAcrossFile = 0;
          let totalIcaAcrossFile = 0;
          const globalModuleSet = new Set();
          let debarredCount = 0;
          const debarredList = [];

          rawJson.forEach(row => {
            // Check booked students > 0
            let bookedNum = 0;
            if (bookedCol && row[bookedCol] !== undefined && row[bookedCol] !== "") {
              bookedNum = parseInt(row[bookedCol], 10);
              if (isNaN(bookedNum)) bookedNum = 0;
            } else {
              bookedNum = 1; // Default to 1 if booked students column absent
            }

            // Exclude rows where booked students is 0 or negative
            if (bookedNum <= 0) return;

            // Debarred check (if file contains attendance / debarment data)
            if (debarCol && row[debarCol]) {
              const debVal = String(row[debarCol]).trim().toLowerCase();
              if (debVal.includes("debar") || debVal.includes("defaulter") || debVal.includes("not elig") || debVal === "fail" || debVal === "d") {
                debarredCount++;
                if (debarredList.length < 150) {
                  debarredList.push({
                    id: String(studentIdCol ? row[studentIdCol] : `Row ${debarredList.length + 1}`),
                    details: String(row[debarCol])
                  });
                }
              }
            }

            const rawProgAbbrev = progAbbrevCol ? String(row[progAbbrevCol] || "").trim() : (context?.program ? context.program.split(" - ")[0] : "General");
            const rawProgName = progNameCol ? String(row[progNameCol] || "").trim() : rawProgAbbrev;
            if (!rawProgAbbrev) return;

            const rawSession = sessionCol ? String(row[sessionCol] || "").trim() : (context?.semester || "Sem I");
            const semester = normalizeSemester(rawSession);

            const cohortKey = `${rawProgAbbrev}__${semester}`;
            if (!cohortsMap[cohortKey]) {
              let fullProgString = `${rawProgAbbrev} - ${rawProgName}`;
              const configProgs = config?.programs?.[detectedCollege] || [];
              const found = configProgs.find(p => p.startsWith(rawProgAbbrev + " -") || p.startsWith(rawProgAbbrev) || (rawProgName && p.toLowerCase().includes(rawProgName.toLowerCase())));
              if (found) fullProgString = found;

              cohortsMap[cohortKey] = {
                programCode: rawProgAbbrev,
                programName: rawProgName || rawProgAbbrev,
                fullProgramString,
                collegeId: detectedCollege,
                semester: semester,
                modulesMap: new Map(),
                maxBooked: 0
              };
            }

            const cohort = cohortsMap[cohortKey];

            // Module identification
            const modAbbrev = modAbbrevCol ? String(row[modAbbrevCol] || "").trim() : "";
            const modDesc = modDescCol ? String(row[modDescCol] || "").trim() : modAbbrev;
            if (!modAbbrev) return;

            globalModuleSet.add(modAbbrev);

            // Clean scales: strip "S0" prefix
            const scale1 = scale1Col ? stripS0(row[scale1Col]) : "";
            const scale2 = scale2Col ? stripS0(row[scale2Col]) : "";

            // Exam type determination: WRIT / LAB / ICA
            const rawExamMode = examModeCol ? String(row[examModeCol] || "").trim().toUpperCase() : "";
            const rawNue = onlyNueCol ? String(row[onlyNueCol] || "").trim().toUpperCase() : "";
            const rawOnlyIca = onlyIcaCol ? String(row[onlyIcaCol] || "").trim().toUpperCase() : "";

            let examType = "WRIT";
            if (rawNue === "ONLY ICA" || rawNue === "Y" || rawOnlyIca === "YES") {
              examType = "ICA";
            } else if (rawExamMode.includes("LAB") || rawExamMode.includes("PRAC")) {
              examType = "LAB";
            } else if (rawExamMode.includes("ICA")) {
              examType = "ICA";
            } else if (rawExamMode.includes("WRIT")) {
              examType = "WRIT";
            } else {
              examType = "WRIT";
            }

            const creditVal = creditCol ? String(row[creditCol] || "").trim() : "";
            const durationVal = durationCol ? String(row[durationCol] || "").trim() : "";

            if (!cohort.modulesMap.has(modAbbrev)) {
              cohort.modulesMap.set(modAbbrev, {
                code: modAbbrev,
                name: modDesc || modAbbrev,
                examType,
                examMode: examType,
                rawExamMode,
                appraisal1Scale: scale1,
                appraisal2Scale: scale2,
                credit: creditVal,
                duration: durationVal,
                bookedStudents: bookedNum
              });
            } else {
              const existing = cohort.modulesMap.get(modAbbrev);
              if (bookedNum > existing.bookedStudents) {
                existing.bookedStudents = bookedNum;
              }
              if (!existing.appraisal1Scale && scale1) existing.appraisal1Scale = scale1;
              if (!existing.appraisal2Scale && scale2) existing.appraisal2Scale = scale2;
            }

            if (bookedNum > cohort.maxBooked) {
              cohort.maxBooked = bookedNum;
            }
          });

          // Build cohortsList
          const cohortsList = Object.values(cohortsMap).map(cohort => {
            const modulesList = Array.from(cohort.modulesMap.values()).sort((a, b) => a.code.localeCompare(b.code));
            const writCount = modulesList.filter(m => m.examType === "WRIT").length;
            const labCount = modulesList.filter(m => m.examType === "LAB").length;
            const icaCount = modulesList.filter(m => m.examType === "ICA").length;
            const totalModules = modulesList.length;

            totalWritAcrossFile += writCount;
            totalLabAcrossFile += labCount;
            totalIcaAcrossFile += icaCount;
            totalBookedAcrossFile += cohort.maxBooked;

            return {
              programCode: cohort.programCode,
              programName: cohort.programName,
              fullProgramString: cohort.fullProgramString,
              collegeId: cohort.collegeId,
              semester: cohort.semester,
              writCount,
              labCount,
              icaCount,
              totalModules,
              numModules: writCount, // Primary KPI number is WRIT (Theory)
              modulesBreakdown: {
                total: totalModules,
                writ: writCount,
                lab: labCount,
                ica: icaCount
              },
              modulesList,
              studentCount: cohort.maxBooked
            };
          }).sort((a, b) => {
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
            type: "acad_report",
            fileName: file.name,
            totalRows: rawJson.length,
            detectedCollege,
            detectedAcademicYear: normalizedYear,
            cohorts: cohortsList,
            totalWritAcrossFile,
            totalLabAcrossFile,
            totalIcaAcrossFile,
            totalBookedAcrossFile,
            distinctModulesCount: globalModuleSet.size,
            debarredCount,
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

  // 1-Click: Apply specific Acad Report cohort to Active Session
  const handleApplyAcadReportCohortToActive = (cohort) => {
    if (!onApplyMetrics || !cohort) return;

    if (setContext && (!isCohortActiveContext(cohort))) {
      setContext(prev => ({
        ...prev,
        college: cohort.collegeId || prev.college,
        program: cohort.fullProgramString || cohort.programName || prev.program,
        semester: cohort.semester || prev.semester,
        batch: parsedData?.detectedAcademicYear || prev.batch
      }));
    }

    onApplyMetrics({
      ...headerMetrics,
      numModules: cohort.writCount, // Primary KPI on card is Total WRIT Theory
      modulesBreakdown: cohort.modulesBreakdown,
      modulesList: cohort.modulesList,
      isUploadedFromExcel: true,
      lastImportedFile: fileName || parsedData?.fileName
    });

    if (window.showPortalToast) {
      window.showPortalToast(`Applied Acad Report: ${cohort.writCount} Theory Papers (WRIT), ${cohort.totalModules} Total Modules for ${cohort.programCode} (${cohort.semester})!`, "success");
    }
  };

  // 1-Click: Apply Acad Report metrics
  const handleApplyAcadReportToActive = () => {
    if (!onApplyMetrics || !parsedData) return;
    if (activeContextCohort) {
      handleApplyAcadReportCohortToActive(activeContextCohort);
    } else if (parsedData.cohorts && parsedData.cohorts.length > 0) {
      handleApplyAcadReportCohortToActive(parsedData.cohorts[0]);
    } else {
      onApplyMetrics({
        ...headerMetrics,
        numModules: parsedData.distinctModulesCount || 0,
        debarredStudents: parsedData.debarredCount || 0,
        isUploadedFromExcel: true,
        lastImportedFile: fileName || parsedData?.fileName
      });
      if (window.showPortalToast) {
        window.showPortalToast(`Applied Acad Report: ${parsedData.distinctModulesCount} Active Modules!`, "success");
      }
    }
  };

  // 1-Click: Batch Sync Acad Report Cohorts to Database
  const handleBatchSyncAcadReportCohorts = async () => {
    if (!parsedData?.cohorts || !onBatchUpdateMetrics) return;

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
        cohorts: cohortsToSync.map(c => ({
          programCode: c.programCode,
          programName: c.fullProgramString || c.programName,
          semester: c.semester,
          numModules: c.writCount, // Primary is WRIT
          modulesBreakdown: c.modulesBreakdown,
          modulesList: c.modulesList,
          studentCount: c.studentCount || 0
        })),
        mode: importMode,
        fileName: fileName || parsedData.fileName
      });
      if (window.showPortalToast) {
        window.showPortalToast(`Successfully synchronized ${cohortsToSync.length} cohorts to database!`, "success");
      }
    } catch (e) {
      console.error(e);
      if (window.showPortalToast) {
        window.showPortalToast(e?.message ? `Sync error: ${e.message}` : "Failed to batch synchronize cohorts.", "error");
      }
    } finally {
      setBatchSyncing(false);
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
                {canUserRemove && activeContextKey && onPurgeContextMetrics && (
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
                              ) : canUserRemove ? (
                                <button
                                  type="button"
                                  onClick={() => onRollbackFile && onRollbackFile(item.id)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center gap-1"
                                  title="Revert all metrics touched by this file back to exact pre-import state"
                                >
                                  <Icon name="rotate-ccw" size={12} />
                                  <span>Rollback File</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Restricted</span>
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
            !canUserImport ? (
              <div className="p-6 text-center border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 rounded-2xl">
                <Icon name="lock" size={24} className="text-amber-500 mx-auto mb-2" />
                <div className="font-bold text-xs text-amber-800 dark:text-amber-200">Excel Import Authority Required</div>
                <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-1">
                  Your staff account does not have authority to import Excel spreadsheets. Contact an Administrator or COE to grant this authority.
                </p>
              </div>
            ) : (
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
            )
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
                    {canUserRemove && onPurgeContextMetrics && activeContextKey && (
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
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Detected Cohorts</div>
                  <div className="text-xl font-extrabold text-indigo-950 dark:text-white mt-0.5">
                    {parsedData.cohorts?.length || 0}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                    {parsedData.detectedCollege} • {parsedData.detectedAcademicYear}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Written Theory (WRIT)</div>
                  <div className="text-xl font-extrabold text-blue-950 dark:text-white mt-0.5">
                    {parsedData.totalWritAcrossFile || 0}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400">Core Written Exam Papers</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Practical &amp; ICA</div>
                  <div className="text-xl font-extrabold text-amber-950 dark:text-white mt-0.5">
                    {(parsedData.totalLabAcrossFile || 0)} L · {(parsedData.totalIcaAcrossFile || 0)} I
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400">Lab &amp; Internal Subjects</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Total Booked Students</div>
                  <div className="text-xl font-extrabold text-emerald-950 dark:text-white mt-0.5">
                    {(parsedData.totalBookedAcrossFile || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Across {parsedData.distinctModulesCount || 0} unique modules
                  </div>
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
                      &rarr; <strong>{activeContextCohort.writCount}</strong> Theory Papers (WRIT), <strong>{activeContextCohort.labCount}</strong> LAB, <strong>{activeContextCohort.icaCount}</strong> ICA (Total: <strong>{activeContextCohort.totalModules}</strong>)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewCohortSubjects(activeContextCohort)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <Icon name="layers" size={13} />
                      <span>View Subjects ({activeContextCohort.totalModules})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAcadReportCohortToActive(activeContextCohort)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                    >
                      <Icon name="check" size={13} />
                      <span>Apply to Active</span>
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
                    <option value="Sem I">Sem I</option>
                    <option value="Sem II">Sem II</option>
                    <option value="Sem III">Sem III</option>
                    <option value="Sem IV">Sem IV</option>
                    <option value="Sem V">Sem V</option>
                    <option value="Sem VI">Sem VI</option>
                    <option value="Sem VII">Sem VII</option>
                    <option value="Sem VIII">Sem VIII</option>
                  </select>
                </div>

                {/* Batch Sync to Supabase */}
                {onBatchUpdateMetrics && (
                  <button
                    type="button"
                    onClick={handleBatchSyncAcadReportCohorts}
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

              {/* Cohorts Table */}
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
                      <th className="p-2 text-center">WRIT (Theory)</th>
                      <th className="p-2 text-center">LAB</th>
                      <th className="p-2 text-center">ICA</th>
                      <th className="p-2 text-center">Total Modules</th>
                      <th className="p-2 text-right">Booked Students</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCohorts.map((c, i) => {
                      const isMatch = isCohortActiveContext(c);
                      const cohortKey = `${c.programCode}__${c.semester}`;
                      const isSelected = !!selectedCohorts[cohortKey];

                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${isMatch ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedCohorts(prev => ({
                                  ...prev,
                                  [cohortKey]: e.target.checked
                                }));
                              }}
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {c.programCode}
                          </td>
                          <td className="p-2 truncate max-w-xs text-slate-700 dark:text-slate-300" title={c.programName}>
                            {c.programName}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {c.semester}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {c.writCount} WRIT
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {c.labCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {c.labCount} LAB
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {c.icaCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {c.icaCount} ICA
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-800 dark:text-slate-200">
                            {c.totalModules}
                          </td>
                          <td className="p-2 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                            {c.studentCount?.toLocaleString() || 0}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewCohortSubjects(c)}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
                                title="Inspect module subjects, scales & credits"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplyAcadReportCohortToActive(c)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                  isMatch
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                }`}
                              >
                                {isMatch ? "Active" : "Apply"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Debarred notification if defaulters found */}
              {parsedData.debarredCount > 0 && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
                    <Icon name="alert-triangle" size={15} className="text-rose-600" />
                    <span><strong>{parsedData.debarredCount}</strong> Attendance Defaulters (&lt;75%) detected in file.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDebarredModal(true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
                  >
                    View Debarred List
                  </button>
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

      {/* Cohort Subject Preview Modal */}
      {previewCohortSubjects && (
        <SessionModulesModal
          isOpen={!!previewCohortSubjects}
          onClose={() => setPreviewCohortSubjects(null)}
          context={{
            college: previewCohortSubjects.collegeId || parsedData?.detectedCollege,
            batch: parsedData?.detectedAcademicYear || context?.batch,
            program: previewCohortSubjects.programName,
            semester: previewCohortSubjects.semester
          }}
          headerMetrics={{
            modulesList: previewCohortSubjects.modulesList,
            modulesBreakdown: previewCohortSubjects.modulesBreakdown,
            numModules: previewCohortSubjects.writCount
          }}
        />
      )}

    </div>
  );
}
