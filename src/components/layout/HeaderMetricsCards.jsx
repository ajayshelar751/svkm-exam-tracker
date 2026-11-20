import React, { useState, useMemo } from 'react';
import Icon from '../common/Icon.jsx';
import { formatExamMonthYear } from '../../utils/helpers.js';
import SessionModulesModal from '../modals/SessionModulesModal.jsx';
import SessionStudentsModal from '../modals/SessionStudentsModal.jsx';

// --- Section A: Session Summary Cards (4-Card Focused Responsive Grid) ---
export default function HeaderMetricsCards({
  metrics = {},
  onUpdateMetrics,
  context = {},
  currentLogs = {},
  onOpenSapOsmModal
}) {
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  // Auto-derived Exam Month & Year from Exam Start Date
  const autoDerivedMonthYear = useMemo(() => {
    if (metrics.examStartDate) {
      return formatExamMonthYear(metrics.examStartDate);
    }
    const isReExam = context?.examCycle === "Re-Exam";
    let targetDate = "";
    if (isReExam) {
      targetDate = currentLogs?.["act_135"]?.performedDate || currentLogs?.["act_23"]?.performedDate || "";
    } else {
      targetDate = currentLogs?.["act_23"]?.performedDate || currentLogs?.["act_135"]?.performedDate || "";
    }
    return formatExamMonthYear(targetDate);
  }, [metrics.examStartDate, context?.examCycle, currentLogs]);

  const displayMonthYear = metrics.examMonthYear ?? autoDerivedMonthYear ?? "";
  const isAutoSynced = autoDerivedMonthYear && (metrics.examMonthYear === autoDerivedMonthYear || !metrics.examMonthYear);

  const effectiveWritModules = (metrics.numModules !== undefined && metrics.numModules !== null && metrics.numModules > 0)
    ? metrics.numModules
    : (metrics.modulesBreakdown?.writ || (Array.isArray(metrics.modulesList) && metrics.modulesList.length > 0 ? metrics.modulesList.filter(m => m.examType === "WRIT").length : 0));

  const totalSubjectCount = (metrics.modulesBreakdown?.total > 0)
    ? metrics.modulesBreakdown.total
    : (Array.isArray(metrics.modulesList) ? metrics.modulesList.length : (effectiveWritModules || 0));

  const hasExcelData = (metrics.totalStudents > 0) || (effectiveWritModules > 0) || (totalSubjectCount > 0) || Boolean(metrics.isUploadedFromExcel);

  return (
    <div className="my-2.5 no-print">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* 1: ACADEMIC YEAR (Non-editable) */}
        {context?.examCycle === "Re-Exam" ? (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-wider text-amber-800 dark:text-amber-300 uppercase flex items-center justify-between">
              <span>ACAD. YEAR &amp; BATCHES</span>
              <Icon name="calendar" size={14} className="text-amber-500" />
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {metrics.batch || context.batch || "—"}
              </div>
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate" title={metrics.appearingBatches || "Current + Prior Batches"}>
                {metrics.appearingBatches || "Re-Exam Batches"}
              </div>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate mt-1">
              Exam Year &amp; Cohorts
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
              <span>ACADEMIC YEAR</span>
              <Icon name="calendar" size={14} className="text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {metrics.batch || context.batch || "—"}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Regular Batch Session</div>
          </div>
        )}

        {/* 2: EXAM MONTH & YEAR (Non-editable) */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-indigo-700 dark:text-indigo-300 uppercase flex items-center justify-between">
            <span>EXAM MONTH &amp; YEAR</span>
            <Icon name="clock" size={14} className="text-indigo-500" />
          </div>
          <div className="mt-1 text-base font-bold text-indigo-950 dark:text-indigo-200 truncate" title={displayMonthYear || "Not specified"}>
            {displayMonthYear || "—"}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate mt-1">
            {isAutoSynced ? "Auto from Start Date" : displayMonthYear ? "Session Month" : "Not Set"}
          </div>
        </div>

        {/* 3: MODULES (Clickable with Subject List Viewer Modal) */}
        <div
          onClick={() => setShowModulesModal(true)}
          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition group select-none"
          title="Click to view full subjects list and marks scale breakdown"
        >
          <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">MODULES</span>
            <Icon name="layers" size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {effectiveWritModules > 0 ? effectiveWritModules : (totalSubjectCount > 0 ? totalSubjectCount : "—")}
            </span>
            {Boolean(effectiveWritModules > 0 || totalSubjectCount > 0) && (
              <span className="text-xs font-semibold text-slate-400">
                {effectiveWritModules > 0 ? "WRIT" : "SUBS"}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {metrics.modulesBreakdown ? (
              <span className="truncate block font-mono text-[10px] text-slate-500 dark:text-slate-400">
                {metrics.modulesBreakdown.writ || 0}W · {metrics.modulesBreakdown.lab || 0}L · {metrics.modulesBreakdown.ica || 0}I
              </span>
            ) : totalSubjectCount > 0 ? (
              `${totalSubjectCount} Ingested Papers`
            ) : (
              "Pending Audit Report"
            )}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline mt-1">
            View Subjects ›
          </div>
        </div>

        {/* 4: STUDENTS (Clickable with Student Directory Modal) */}
        <div
          onClick={() => setShowStudentsModal(true)}
          className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-md transition group select-none ${
            hasExcelData
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
          title="Click to view enrolled students list, Roll Numbers, SAP IDs, and PWD status"
        >
          <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span className={hasExcelData ? 'text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-600' : 'group-hover:text-emerald-600'}>
              STUDENTS
            </span>
            <Icon name="users" size={14} className={hasExcelData ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500'} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {metrics.totalStudents !== undefined && metrics.totalStudents !== null && metrics.totalStudents > 0
                ? metrics.totalStudents.toLocaleString()
                : (context?.examCycle === "Re-Exam" && ((metrics.regBatchStudents || 0) + (metrics.prevBatchStudents || 0)) > 0)
                ? ((metrics.regBatchStudents || 0) + (metrics.prevBatchStudents || 0)).toLocaleString()
                : "0"}
            </span>
            {metrics.pwdStudents > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {metrics.pwdStudents} PWD
              </span>
            )}
          </div>
          <div className="text-[10px] truncate mt-0.5">
            {hasExcelData ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                ✓ Uploaded from Excel
              </span>
            ) : (
              <span className="text-slate-400">Pending Excel Import</span>
            )}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline mt-1">
            View Students ›
          </div>
        </div>

      </div>

      {/* Session Modules & Subjects Directory Modal */}
      <SessionModulesModal
        isOpen={showModulesModal}
        onClose={() => setShowModulesModal(false)}
        context={context}
        headerMetrics={metrics}
      />

      {/* Session Enrolled Students Directory Modal */}
      <SessionStudentsModal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        context={context}
        headerMetrics={metrics}
      />
    </div>
  );
}
