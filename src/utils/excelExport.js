import * as XLSX from 'xlsx';
import {
  formatDateDisplay,
  getTodayYYYYMMDD,
  formatExamMonthYear,
  isActivityApplicableForCycle,
  getActivityExamScope,
  computeActivityStatus,
  getStaffStudentScope
} from './helpers.js';

// --- Excel & JSON Backup Utilities ---
export function exportCurrentViewExcel(activities, currentLogs, context, headerMetrics) {
  const xlsxLib = (XLSX && XLSX.utils) ? XLSX : window.XLSX;
  if (!xlsxLib) {
    if (window.showPortalToast) window.showPortalToast("SheetJS library is still loading. Please try again in a moment.", "warning");
    return;
  }

  const rows = [];
  // Context metadata block
  rows.push(["SVKM'S CONTROLLER OF EXAMINATIONS DIVISION (CED)"]);
  rows.push(["EXAMINATION ACTIVITY TRACKER & VERIFICATION REPORT"]);
  rows.push(["College:", context.college, "Batch (Academic Year):", context.batch]);
  rows.push(["Program:", context.program, "Semester:", context.semester, "Cycle:", context.examCycle]);
  rows.push(["Export Timestamp:", new Date().toLocaleString()]);
  rows.push([]);

  // Session Summary Metrics
  rows.push(["SESSION METADATA SUMMARY"]);
  const derivedMonth = headerMetrics.examMonthYear || formatExamMonthYear(headerMetrics.examStartDate) || (context.examCycle === "Re-Exam" ? (formatExamMonthYear(currentLogs["act_135"]?.performedDate || currentLogs["act_23"]?.performedDate)) : (formatExamMonthYear(currentLogs["act_23"]?.performedDate || currentLogs["act_135"]?.performedDate))) || "N/A";
  if (context.examCycle === "Re-Exam") {
    rows.push([
      "Exam Month & Year", derivedMonth,
      "Exam Start Date", headerMetrics.examStartDate || "N/A",
      "Exam End Date", headerMetrics.examEndDate || "N/A",
      "Total Appearing Students", headerMetrics.totalStudents || 0,
      "Regular Batch Students", headerMetrics.regBatchStudents || 0,
      "Prev. Year / Backlog Students", headerMetrics.prevBatchStudents || 0,
      "Appearing Batches", headerMetrics.appearingBatches || "Current + Prior Batches",
      "PWD Students", headerMetrics.pwdStudents || 0,
      "Debarred Students", headerMetrics.debarredStudents || 0,
      "UFM Cases Pending", headerMetrics.ufmCases || 0,
      "Modules (WRIT)", headerMetrics.numModules || 0
    ]);
  } else {
    rows.push([
      "Exam Month & Year", derivedMonth,
      "Exam Start Date", headerMetrics.examStartDate || "N/A",
      "Exam End Date", headerMetrics.examEndDate || "N/A",
      "Total Students", headerMetrics.totalStudents || 0,
      "PWD Students", headerMetrics.pwdStudents || 0,
      "Debarred Students", headerMetrics.debarredStudents || 0,
      "UFM Cases Pending", headerMetrics.ufmCases || 0,
      "Modules (WRIT)", headerMetrics.numModules || 0
    ]);
  }
  rows.push([]);

  // Table Headers
  rows.push([
    "Sr. No.",
    "Phase",
    "Activity Name",
    "Maker Role",
    "Condition",
    "Applicable",
    "Status",
    "Performed Date",
    "Performed By",
    "Value / Timing",
    "Remarks",
    "ASST_COORD Verified",
    "ASST_COORD Sign-off",
    "COORD Verified",
    "COORD Sign-off",
    "AR Verified",
    "AR Sign-off",
    "DY_COE Verified",
    "DY_COE Sign-off",
    "COE Verified",
    "COE Sign-off"
  ]);

  const applicableActivities = activities.filter(act => isActivityApplicableForCycle(act, context.examCycle));

  applicableActivities.forEach(act => {
    const log = currentLogs[act.id] || {};
    const status = computeActivityStatus(act, log, context.semester);

    const getVerifText = (role) => {
      const v = log.verifications?.[role];
      if (!v || !v.verified) return "No";
      return `Yes (${formatDateDisplay(v.date)} - ${v.userName || 'Verified'})`;
    };

    rows.push([
      act.srNo,
      act.phase,
      act.name,
      act.performedBy,
      act.cond,
      log.isNA ? "N/A" : "Applicable",
      status,
      log.performedDate ? formatDateDisplay(log.performedDate) : "",
      log.performedByUser?.name || "",
      log.metricValue || "",
      log.remarks || "",
      log.verifications?.ASST_COORD?.verified ? "YES" : "NO",
      getVerifText('ASST_COORD'),
      log.verifications?.COORD?.verified ? "YES" : "NO",
      getVerifText('COORD'),
      log.verifications?.AR?.verified ? "YES" : "NO",
      getVerifText('AR'),
      log.verifications?.DY_COE?.verified ? "YES" : "NO",
      getVerifText('DY_COE'),
      log.verifications?.COE?.verified ? "YES" : "NO",
      getVerifText('COE')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Current_View");
  
  const cleanFilename = `SVKM_Exam_Tracker_${context.college}_${context.program.replace(/[^a-zA-Z0-9]/g, '_')}_${context.semester}_${context.examCycle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

function exportFullDatabaseExcel(activities, contexts, config, users) {
  const xlsxLib = (XLSX && (XLSX.utils || XLSX.read)) ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
  if (!xlsxLib) {
    if (window.showPortalToast) window.showPortalToast("SheetJS library is still loading. Please try again in a moment.", "warning");
    return;
  }

  const wb = xlsxLib.utils.book_new();

  // Sheet 1: Activity_Logs
  const logRows = [
    [
      "Context Key", "College", "Batch", "Program", "Semester", "Exam Cycle",
      "Sr. No.", "Activity Name", "Phase", "Maker Role", "Status",
      "Performed Date", "Performed By", "Value/Timing", "Remarks",
      "ASST_COORD Verified", "COORD Verified", "AR Verified", "DY_COE Verified", "COE Verified"
    ]
  ];

  Object.entries(contexts).forEach(([ctxKey, ctxData]) => {
    const parts = ctxKey.split('__');
    const [cCollege, cBatch, cProgram, cSem, cCycle] = parts;
    const logs = ctxData.logs || {};

    activities.forEach(act => {
      const log = logs[act.id];
      if (log && (log.performedDate || log.isNA || log.remarks || Object.keys(log.verifications || {}).length > 0)) {
        logRows.push([
          ctxKey, cCollege, cBatch, cProgram, cSem, cCycle,
          act.srNo, act.name, act.phase, act.performedBy,
          computeActivityStatus(act, log, cSem),
          log.performedDate || "",
          log.performedByUser?.name || "",
          log.metricValue || "",
          log.remarks || "",
          log.verifications?.ASST_COORD?.verified ? log.verifications.ASST_COORD.date : "NO",
          log.verifications?.COORD?.verified ? log.verifications.COORD.date : "NO",
          log.verifications?.AR?.verified ? log.verifications.AR.date : "NO",
          log.verifications?.DY_COE?.verified ? log.verifications.DY_COE.date : "NO",
          log.verifications?.COE?.verified ? log.verifications.COE.date : "NO"
        ]);
      }
    });
  });

  const wsLogs = XLSX.utils.aoa_to_sheet(logRows);
  XLSX.utils.book_append_sheet(wb, wsLogs, "Activity_Logs");

  // Sheet 2: Header_Metrics
  const metricRows = [
    ["Context Key", "College", "Batch", "Exam Month & Year", "Program", "Semester", "Exam Cycle", "Total Students", "Reg Batch Students", "Prev Batch Students", "Appearing Batches", "PWD Students", "Debarred Students", "UFM Cases", "Modules (WRIT)"]
  ];
  Object.entries(contexts).forEach(([ctxKey, ctxData]) => {
    const parts = ctxKey.split('__');
    const [cCollege, cBatch, cProgram, cSem, cCycle] = parts;
    const m = ctxData.headerMetrics || {};
    metricRows.push([
      ctxKey, cCollege, cBatch,
      m.examMonthYear || "",
      cProgram, cSem, cCycle,
      m.totalStudents || 0,
      m.regBatchStudents || 0,
      m.prevBatchStudents || 0,
      m.appearingBatches || "",
      m.pwdStudents || 0,
      m.debarredStudents || 0,
      m.ufmCases || 0,
      m.numModules || 0
    ]);
  });
  const wsMetrics = XLSX.utils.aoa_to_sheet(metricRows);
  XLSX.utils.book_append_sheet(wb, wsMetrics, "Header_Metrics");

  // Sheet 3: Master_Activities
  const actRows = [
    ["Sr. No.", "Activity Name", "Phase", "Maker Role", "Condition Rule", "Exam Scope", "Required Verifiers"]
  ];
  activities.forEach(act => {
    actRows.push([
      act.srNo, act.name, act.phase, act.performedBy, act.cond,
      getActivityExamScope(act),
      (act.requiredVerifiers || []).join(', ')
    ]);
  });
  const wsActs = XLSX.utils.aoa_to_sheet(actRows);
  XLSX.utils.book_append_sheet(wb, wsActs, "Master_Activities");

  // Sheet 4: Staff_Directory
  const staffRows = [
    ["User ID", "Name", "Email", "Role", "Is Admin", "Assigned Colleges", "Assigned Programs", "Students in Scope", "Scope Breakdown", "Active"]
  ];
  users.forEach(u => {
    const scope = getStaffStudentScope(u, contexts, config);
    const breakdownStr = Object.entries(scope.byCollege || {})
      .filter(([_, count]) => count > 0)
      .map(([col, count]) => `${col}: ${count.toLocaleString()}`)
      .join(', ') || "None";

    staffRows.push([
      u.id, u.name, u.email, u.role, u.isAdmin ? "YES" : "NO",
      (u.assignedColleges || []).join(', '),
      JSON.stringify(u.assignedPrograms || {}),
      scope.totalStudents,
      breakdownStr,
      u.active ? "ACTIVE" : "INACTIVE"
    ]);
  });
  const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);
  XLSX.utils.book_append_sheet(wb, wsStaff, "Staff_Directory");

  XLSX.writeFile(wb, `SVKM_Exam_Tracker_MultiCollege_Database_${getTodayYYYYMMDD()}.xlsx`);
}

export function exportExecutiveDashboardExcel(filteredSessions, summary, filterState, config, staffMetrics = []) {
  const xlsxLib = (XLSX && XLSX.utils) ? XLSX : window.XLSX;
  if (!xlsxLib) {
    if (window.showPortalToast) window.showPortalToast("SheetJS library is still loading. Please try again in a moment.", "warning");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive_Summary
  const summaryRows = [
    ["SVKM'S CONTROLLER OF EXAMINATIONS DIVISION (CED)"],
    ["EXECUTIVE DASHBOARD & EXAMINATION COMPLIANCE SUMMARY"],
    [
      "Academic Year Filter:", filterState.batch || "ALL",
      "College Filter:", filterState.college || "ALL",
      "Cycle Filter:", filterState.cycle || "ALL",
      "Semester Filter:", filterState.sem || "ALL"
    ],
    ["Export Timestamp:", new Date().toLocaleString()],
    [],
    ["EXECUTIVE KEY PERFORMANCE INDICATORS"],
    ["Overall Compliance %", `${summary.overallPct}%`],
    ["Completed Tasks", summary.totalCompleted],
    ["Total Applicable Tasks", summary.totalActiveTasks],
    ["Active Queries Flagged", summary.totalQueries],
    ["Total Students", summary.totalStudents],
    ["Regular Batch Students", summary.totalRegStudents || 0],
    ["Prev. Year / Backlog Students", summary.totalPrevStudents || 0],
    ["PWD Students (Writer / Comp. Time)", summary.totalPwd],
    ["Debarred Students (Defaulters)", summary.totalDebarred],
    ["UFM Pending Cases (UMIC)", summary.totalUfm]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive_Summary");

  // Sheet 2: Detailed_Status_Report
  const sessionRows = [
    [
      "Acad. Year", "College Code", "College Name", "Program", "Semester", "Exam Cycle",
      "Exam Month & Year", "Total Students", "Reg Batch Students", "Prev Yr Students",
      "Appearing Batches", "PWD Students", "Debarred Students", "UFM Cases",
      "Completed Tasks", "Applicable Tasks", "Compliance %", "Active Queries"
    ]
  ];
  filteredSessions.forEach(s => {
    sessionRows.push([
      s.batch,
      s.college,
      s.collegeName || s.college,
      s.program,
      s.semester,
      s.examCycle,
      s.examMonthYear || "N/A",
      s.totalStudents,
      s.regBatchStudents || 0,
      s.prevBatchStudents || 0,
      s.appearingBatches || "",
      s.pwdStudents,
      s.debarredStudents,
      s.ufmCases,
      s.completedTasks,
      s.applicableTasks,
      `${s.progressPct}%`,
      s.queries
    ]);
  });
  const wsSessions = XLSX.utils.aoa_to_sheet(sessionRows);
  XLSX.utils.book_append_sheet(wb, wsSessions, "Detailed_Status_Report");

  // Sheet 3: Staff_Performance_Analysis
  if (Array.isArray(staffMetrics) && staffMetrics.length > 0) {
    const staffRows = [
      [
        "Staff Name", "Email", "Role", "Admin", "Assigned Colleges",
        "Students in Scope", "Cohorts in Scope", "Total Tasks Assigned",
        "Tasks Completed", "Pending Maker Tasks", "Pending Verifications",
        "Total Pending", "Active Queries", "Completion %", "RAG Status"
      ]
    ];

    staffMetrics.forEach(st => {
      const colList = (st.accessibleColleges || []).join(', ') || 'ALL';
      staffRows.push([
        st.name,
        st.email,
        st.role,
        st.isAdmin ? "Yes" : "No",
        colList,
        st.totalStudents,
        st.cohortCount,
        st.totalAssigned,
        st.totalCompleted,
        st.makerPending,
        st.verifierPending,
        st.totalPending,
        st.openQueries,
        `${st.completionRate}%`,
        st.ragStatus
      ]);
    });

    const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);
    XLSX.utils.book_append_sheet(wb, wsStaff, "Staff_Performance_Analysis");
  }

  XLSX.writeFile(wb, `SVKM_Executive_Exam_Report_${getTodayYYYYMMDD()}.xlsx`);
}

function downloadJsonBackup(fullData) {
  const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SVKM_Exam_Tracker_Backup_${getTodayYYYYMMDD()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function restoreJsonBackup(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.config || !parsed.users || !parsed.activities) {
        throw new Error("Invalid backup structure. Missing essential master keys.");
      }
      onSuccess(parsed);
    } catch (err) {
      onError(err.message);
    }
  };
  reader.onerror = () => onError("Failed to read file.");
  reader.readAsText(file);
}
