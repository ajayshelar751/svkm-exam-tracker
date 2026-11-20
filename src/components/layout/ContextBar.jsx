import React, { useMemo, useEffect } from 'react';
import Icon from '../common/Icon.jsx';
import { getContextKey, formatExamMonthYear } from '../../utils/helpers.js';

// --- Context Selector Bar ---
export default function ContextBar({
  currentUser,
  config,
  context,
  setContext,
  contexts = {},
  headerMetrics = {},
  onUpdateMetrics
}) {
  // Allowed colleges
  const allowedColleges = useMemo(() => {
    if (currentUser.isAdmin || ['COE', 'DY_COE'].includes(currentUser.role) || currentUser.assignedColleges?.includes('ALL')) {
      return config.colleges;
    }
    return config.colleges.filter(c => (currentUser.assignedColleges || []).includes(c.id));
  }, [currentUser, config.colleges]);

  // Helper to determine allowed programs for any college
  const getAllowedProgramsForCollege = (colId) => {
    const allProgs = config.programs[colId] || [];
    if (currentUser.isAdmin || ['COE', 'DY_COE'].includes(currentUser.role) || currentUser.assignedColleges?.includes('ALL')) {
      return allProgs;
    }
    const userCollegeProgs = currentUser.assignedPrograms?.[colId];
    if (!userCollegeProgs || userCollegeProgs.length === 0 || userCollegeProgs.includes('ALL')) {
      return allProgs;
    }
    const normUserProgs = userCollegeProgs.map(p => String(p).trim().toLowerCase());
    return allProgs.filter(p => normUserProgs.includes(String(p).trim().toLowerCase()));
  };

  // Allowed programs for selected college
  const allowedPrograms = useMemo(() => {
    return getAllowedProgramsForCollege(context.college);
  }, [currentUser, config.programs, context.college]);

  const handleCollegeChange = (colId) => {
    const allowed = getAllowedProgramsForCollege(colId);
    const firstProg = allowed[0] || (config.programs[colId]?.[0] || "");
    setContext(prev => ({
      ...prev,
      college: colId,
      program: firstProg
    }));
  };

  // Student counts per semester for the current college/batch/program/cycle
  const semesterStudentCounts = useMemo(() => {
    const counts = {};
    (config.semesters || []).forEach(s => {
      const key = getContextKey(context.college, context.batch, context.program, s, context.examCycle);
      const ctx = contexts[key];
      const m = ctx?.headerMetrics || {};
      const tot = Number(m.totalStudents ?? (context.examCycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0)) || 0;
      counts[s] = tot;
    });
    return counts;
  }, [config.semesters, context.college, context.batch, context.program, context.examCycle, contexts]);

  const hasAnyActiveSem = useMemo(() => {
    return Object.values(semesterStudentCounts).some(c => c > 0);
  }, [semesterStudentCounts]);

  // Auto-switch to active semester if current one is inactive but other active semesters exist
  useEffect(() => {
    if (hasAnyActiveSem && context.semester && semesterStudentCounts[context.semester] === 0) {
      const firstActiveSem = (config.semesters || []).find(s => (semesterStudentCounts[s] || 0) > 0);
      if (firstActiveSem && firstActiveSem !== context.semester) {
        setContext(prev => ({ ...prev, semester: firstActiveSem }));
      }
    }
  }, [hasAnyActiveSem, semesterStudentCounts, context.semester, config.semesters, setContext]);

  // Handlers for Exam Start & End Dates
  const handleStartDateChange = (val) => {
    if (!onUpdateMetrics) return;
    const nextMetrics = {
      ...headerMetrics,
      examStartDate: val
    };
    if (val) {
      const m = formatExamMonthYear(val);
      if (m) nextMetrics.examMonthYear = m;
    }
    onUpdateMetrics(nextMetrics);
  };

  const handleEndDateChange = (val) => {
    if (!onUpdateMetrics) return;
    onUpdateMetrics({
      ...headerMetrics,
      examEndDate: val
    });
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-2 px-4 no-print">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* College */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="building" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">College:</span>
            <select
              value={context.college}
              onChange={(e) => handleCollegeChange(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {allowedColleges.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="calendar" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">Acad. Year:</span>
            <select
              value={context.batch}
              onChange={(e) => setContext(prev => ({ ...prev, batch: e.target.value }))}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {config.batches.map(b => (
                <option key={b} value={b} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="book-open" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">Program:</span>
            <select
              value={context.program}
              onChange={(e) => setContext(prev => ({ ...prev, program: e.target.value }))}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {allowedPrograms.map(p => (
                <option key={p} value={p} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Semester (Deactivated for 0-student semesters) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Sem:</span>
            <select
              value={context.semester}
              onChange={(e) => setContext(prev => ({ ...prev, semester: e.target.value }))}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {config.semesters.map(s => {
                const count = semesterStudentCounts[s] || 0;
                const isInactive = hasAnyActiveSem && count === 0;
                return (
                  <option
                    key={s}
                    value={s}
                    disabled={isInactive}
                    className={
                      isInactive
                        ? "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800"
                        : "dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    }
                  >
                    {s} {count > 0 ? `(${count})` : (hasAnyActiveSem ? "(0 - Inactive)" : "")}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Exam Cycle */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Cycle:</span>
            <select
              value={context.examCycle}
              onChange={(e) => setContext(prev => ({ ...prev, examCycle: e.target.value }))}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {config.examCycles.map(ec => (
                <option key={ec} value={ec} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                  {ec}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Start Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="calendar" size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-500">Exam Start:</span>
            <input
              type="date"
              value={headerMetrics.examStartDate || ""}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs"
              title="Exam Start Date"
            />
          </div>

          {/* Exam End Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="calendar" size={14} className="text-rose-600 dark:text-rose-400" />
            <span className="font-semibold text-slate-500">Exam End:</span>
            <input
              type="date"
              value={headerMetrics.examEndDate || ""}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs"
              title="Exam End Date"
            />
          </div>
        </div>

        {/* Current Active Context Badge */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800">
            {context.college} · {context.batch} · {context.program} · {context.semester} · {context.examCycle}
          </span>
        </div>
      </div>
    </div>
  );
}
