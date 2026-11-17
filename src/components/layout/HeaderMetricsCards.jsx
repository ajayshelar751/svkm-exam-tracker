import React, { useMemo } from 'react';
import Icon from '../common/Icon.jsx';
import { formatExamMonthYear } from '../../utils/helpers.js';

// --- Section A: Session Summary Cards (8-Card Responsive Grid) ---
export default function HeaderMetricsCards({
  metrics = {},
  onUpdateMetrics,
  context = {},
  currentLogs = {},
  onOpenSapOsmModal
}) {
  // Auto-derived Exam Month & Year from Exam Start Date
  const autoDerivedMonthYear = useMemo(() => {
    const isReExam = context?.examCycle === "Re-Exam";
    let targetDate = "";
    if (isReExam) {
      targetDate = currentLogs?.["act_135"]?.performedDate || currentLogs?.["act_23"]?.performedDate || "";
    } else {
      targetDate = currentLogs?.["act_23"]?.performedDate || currentLogs?.["act_135"]?.performedDate || "";
    }
    return formatExamMonthYear(targetDate);
  }, [context?.examCycle, currentLogs]);

  const displayMonthYear = metrics.examMonthYear ?? autoDerivedMonthYear ?? "";
  const isAutoSynced = autoDerivedMonthYear && (metrics.examMonthYear === autoDerivedMonthYear || !metrics.examMonthYear);

  const hasExcelData = (metrics.totalStudents > 0) || metrics.isUploadedFromExcel;

  return (
    <div className="my-3 no-print">
      <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>Session Metadata &amp; Student Metrics</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              <Icon name="lock" size={10} className="text-slate-400" />
              <span>Non-Editable • Excel-Derived</span>
            </span>
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">
            Context: {context?.college} • {context?.program} • {context?.semester}
          </span>
        </div>
        {onOpenSapOsmModal && (
          <button
            type="button"
            onClick={onOpenSapOsmModal}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-sm"
            title="Import Excel files (SAP Student Master, Acad Report, OSM Evaluation) to replace metrics or rollback previous files (Zero file storage)"
          >
            <Icon name="upload" size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span>Import &amp; Rollback Excel</span>
            <span className="text-[10px] bg-indigo-200/70 dark:bg-indigo-900 px-1 rounded text-indigo-900 dark:text-indigo-200 font-mono">In-Memory</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
        
        {/* 1: ACADEMIC YEAR (Non-editable) */}
        {context?.examCycle === "Re-Exam" ? (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-wider text-amber-800 dark:text-amber-300 uppercase flex items-center justify-between">
              <span>ACAD. YEAR &amp; BATCHES</span>
              <Icon name="calendar" size={13} className="text-amber-500" />
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {metrics.batch || context.batch || "—"}
              </div>
              <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 truncate" title={metrics.appearingBatches || "Current + Prior Batches"}>
                {metrics.appearingBatches || "Re-Exam Batches"}
              </div>
            </div>
            <div className="text-[9px] text-amber-700 dark:text-amber-400 font-medium truncate mt-0.5">
              Exam Year &amp; Cohorts
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
              <span>ACADEMIC YEAR</span>
              <Icon name="calendar" size={13} className="text-slate-400" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {metrics.batch || context.batch || "—"}
            </div>
            <div className="text-[10px] text-slate-400">Regular Batch Session</div>
          </div>
        )}

        {/* 2: EXAM MONTH & YEAR (Non-editable) */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-indigo-700 dark:text-indigo-300 uppercase flex items-center justify-between">
            <span>EXAM MONTH &amp; YEAR</span>
            <Icon name="clock" size={13} className="text-indigo-500" />
          </div>
          <div className="mt-1 text-sm font-bold text-indigo-950 dark:text-indigo-200 truncate" title={displayMonthYear || "Not specified"}>
            {displayMonthYear || "—"}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">
            {isAutoSynced ? "Auto from Start Date" : displayMonthYear ? "Session Month" : "Not Set"}
          </div>
        </div>

        {/* 3: PROGRAMS (Non-editable) */}
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span>PROGRAMS</span>
            <Icon name="book-open" size={13} className="text-slate-400" />
          </div>
          <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            {metrics.numPrograms ?? 1}
          </div>
          <div className="text-[10px] text-slate-400">Under this Session</div>
        </div>

        {/* 4: MODULES (Non-editable, no sample count) */}
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span>MODULES</span>
            <Icon name="layers" size={13} className="text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {(metrics.numModules !== undefined && metrics.numModules !== null && metrics.numModules > 0) ? metrics.numModules : "—"}
            </span>
            {metrics.numModules > 0 && <span className="text-xs font-semibold text-slate-400">WRIT</span>}
          </div>
          <div className="text-[10px] text-slate-400">
            {metrics.numModules > 0 ? `${metrics.numModules} Active Papers` : "Pending Acad Report"}
          </div>
        </div>

        {/* 5: STUDENTS (Non-editable, no sample 480) */}
        {context?.examCycle === "Re-Exam" ? (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-bold tracking-wider text-indigo-700 dark:text-indigo-300 uppercase flex items-center justify-between">
              <span>RE-EXAM STUDENTS</span>
              <Icon name="users" size={13} className="text-indigo-500" />
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <div>
                <span className="text-[9px] font-medium text-slate-500 block">Reg Batch:</span>
                <span>{metrics.regBatchStudents ?? 0}</span>
              </div>
              <div>
                <span className="text-[9px] font-medium text-slate-500 block">Prev Yr:</span>
                <span>{metrics.prevBatchStudents ?? 0}</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mt-1 truncate">
              Total Appearing: {metrics.totalStudents ?? ((metrics.regBatchStudents || 0) + (metrics.prevBatchStudents || 0))}
            </div>
          </div>
        ) : (
          <div className={`p-2.5 rounded-xl border shadow-sm flex flex-col justify-between ${hasExcelData ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
              <span className={hasExcelData ? 'text-emerald-700 dark:text-emerald-300' : ''}>STUDENTS</span>
              <Icon name="users" size={13} className={hasExcelData ? 'text-emerald-500' : 'text-slate-400'} />
            </div>
            <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              {metrics.totalStudents !== undefined && metrics.totalStudents !== null && metrics.totalStudents > 0
                ? metrics.totalStudents.toLocaleString()
                : "0"}
            </div>
            <div className="text-[10px] truncate">
              {hasExcelData ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  ✓ Uploaded from Excel
                </span>
              ) : (
                <span className="text-slate-400">Pending Excel Import</span>
              )}
            </div>
          </div>
        )}

        {/* 6: PWD (Non-editable) */}
        <div className={`p-2.5 rounded-xl border shadow-sm flex flex-col justify-between ${metrics.pwdStudents > 0 ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="text-[10px] font-bold tracking-wider uppercase flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span>PWD</span>
            <span className={`w-2 h-2 rounded-full ${metrics.pwdStudents > 0 ? 'bg-purple-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
          </div>
          <div className="mt-1 text-base font-bold text-purple-900 dark:text-purple-200">
            {metrics.pwdStudents ?? 0}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400">Comp. Time / Writer</div>
        </div>

        {/* 7: DEBARRED (Non-editable) */}
        <div className={`p-2.5 rounded-xl border shadow-sm flex flex-col justify-between ${metrics.debarredStudents > 0 ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="text-[10px] font-bold tracking-wider uppercase flex items-center justify-between text-rose-700 dark:text-rose-300">
            <span>DEBARRED</span>
            <span className={`w-2 h-2 rounded-full ${metrics.debarredStudents > 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
          </div>
          <div className="mt-1 text-base font-bold text-rose-900 dark:text-rose-200">
            {metrics.debarredStudents ?? 0}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400">
            {metrics.debarredStudents > 0 ? `${metrics.debarredStudents} Defaulters` : "Pending Acad Report"}
          </div>
        </div>

        {/* 8: UFM PENDING (Non-editable) */}
        <div className={`p-2.5 rounded-xl border shadow-sm flex flex-col justify-between ${metrics.ufmCases > 0 ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="text-[10px] font-bold tracking-wider uppercase flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span>UFM PENDING</span>
            <span className={`w-2 h-2 rounded-full ${metrics.ufmCases > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
          </div>
          <div className="mt-1 text-base font-bold text-amber-900 dark:text-amber-200">
            {metrics.ufmCases ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400">UMIC Action Pending</div>
        </div>

      </div>
    </div>
  );
}
