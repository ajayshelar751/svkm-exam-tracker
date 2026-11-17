import React, { useState, useMemo } from 'react';
import Icon from '../common/Icon.jsx';
import { INITIAL_PHASES } from '../../constants/config.js';
import { ROLE_RANKS } from '../../constants/roles.js';
import {
  isActivityApplicableForCycle,
  computeActivityStatus,
  formatExamMonthYear,
  formatDateDisplay
} from '../../utils/helpers.js';
import { exportExecutiveDashboardExcel } from '../../utils/excelExport.js';

// --- Executive Dashboard & Detailed Reports ---
export default function ExecutiveDashboardView({
  activities,
  contexts = {},
  config,
  onNavigateToContextPhase,
  onNavigateToContext
}) {
  const [dashBatch, setDashBatch] = useState(() => config.currentBatch || "ALL");
  const [dashCollege, setDashCollege] = useState("ALL");
  const [dashCycle, setDashCycle] = useState("ALL");
  const [dashSem, setDashSem] = useState("ALL");
  const [tableSearch, setTableSearch] = useState("");
  const [sortField, setSortField] = useState("college");
  const [sortAsc, setSortAsc] = useState(true);

  // Reset Filters
  const handleResetFilters = () => {
    setDashBatch(config.currentBatch || "ALL");
    setDashCollege("ALL");
    setDashCycle("ALL");
    setDashSem("ALL");
    setTableSearch("");
  };

  const allPhases = useMemo(() => {
    const list = config?.phases && config.phases.length > 0 ? [...config.phases] : [...INITIAL_PHASES];
    activities.forEach(a => {
      if (a.phase && !list.includes(a.phase)) list.push(a.phase);
    });
    return list;
  }, [activities, config?.phases]);

  // Hide phase columns in RAG matrix that do not apply to dashCycle
  const visiblePhases = useMemo(() => {
    return allPhases.filter(ph => {
      return activities.some(act => act.phase === ph && (dashCycle === "ALL" || isActivityApplicableForCycle(act, dashCycle)));
    });
  }, [allPhases, activities, dashCycle]);

  // Session records matching active dashboard filters
  const sessionRecords = useMemo(() => {
    const list = [];
    Object.entries(contexts || {}).forEach(([ctxKey, ctxData]) => {
      const parts = ctxKey.split('__');
      if (parts.length < 5) return;
      const [colId, batch, progId, sem, cycle] = parts;

      if (dashBatch !== "ALL" && batch !== dashBatch) return;
      if (dashCollege !== "ALL" && colId !== dashCollege) return;
      if (dashCycle !== "ALL" && cycle !== dashCycle) return;
      if (dashSem !== "ALL") {
        if (dashSem === "ODD" && !["Sem I", "Sem III", "Sem V", "Sem VII"].includes(sem)) return;
        else if (dashSem === "EVEN" && !["Sem II", "Sem IV", "Sem VI", "Sem VIII"].includes(sem)) return;
        else if (dashSem !== "ODD" && dashSem !== "EVEN" && sem !== dashSem) return;
      }

      const m = ctxData?.headerMetrics || {};
      const totStudents = Number(m.totalStudents ?? (cycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0)) || 0;
      if (totStudents <= 0) return; // Strict Gate: Exclude 0-student sessions from all dashboard reports

      const logs = ctxData?.logs || {};
      const collegeObj = (config?.colleges || []).find(c => c.id === colId);
      const collegeName = collegeObj ? collegeObj.name : colId;

      let applicableCount = 0;
      let completedCount = 0;
      let sessionQueries = 0;

      activities.forEach(act => {
        if (!isActivityApplicableForCycle(act, cycle)) return;
        const log = logs[act.id] || {};
        const status = computeActivityStatus(act, log, sem);
        if (status === "SKIPPED" || status === "NA" || log.isNA) return;

        applicableCount++;
        if (log.queryDetails && !log.queryDetails.resolved) sessionQueries++;
        if (status === "COMPLETED") completedCount++;
      });

      const progressPct = applicableCount > 0 ? Math.round((completedCount / applicableCount) * 100) : 0;
      const autoMonth = formatExamMonthYear(logs["act_135"]?.performedDate || logs["act_23"]?.performedDate);
      const examMonthYear = m.examMonthYear || autoMonth || "";

      list.push({
        ctxKey,
        college: colId,
        collegeName,
        batch,
        program: progId,
        semester: sem,
        examCycle: cycle,
        examMonthYear,
        totalStudents: m.totalStudents ?? (cycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0),
        regBatchStudents: m.regBatchStudents || 0,
        prevBatchStudents: m.prevBatchStudents || 0,
        appearingBatches: m.appearingBatches || "",
        pwdStudents: m.pwdStudents || 0,
        debarredStudents: m.debarredStudents || 0,
        ufmCases: m.ufmCases || 0,
        numModules: m.numModules || 0,
        applicableTasks: applicableCount,
        completedTasks: completedCount,
        progressPct,
        queries: sessionQueries,
        logs
      });
    });
    return list;
  }, [contexts, activities, config, dashBatch, dashCollege, dashCycle, dashSem]);

  // Aggregate KPI summary for filtered sessions
  const summary = useMemo(() => {
    let totalStudents = 0;
    let totalRegStudents = 0;
    let totalPrevStudents = 0;
    let totalPwd = 0;
    let totalDebarred = 0;
    let totalUfm = 0;
    let totalQueries = 0;
    let totalCompleted = 0;
    let totalActiveTasks = 0;

    sessionRecords.forEach(s => {
      totalStudents += s.totalStudents;
      totalRegStudents += s.regBatchStudents;
      totalPrevStudents += s.prevBatchStudents;
      totalPwd += s.pwdStudents;
      totalDebarred += s.debarredStudents;
      totalUfm += s.ufmCases;
      totalQueries += s.queries;
      totalCompleted += s.completedTasks;
      totalActiveTasks += s.applicableTasks;
    });

    const overallPct = totalActiveTasks > 0 ? Math.round((totalCompleted / totalActiveTasks) * 100) : 0;
    return {
      totalStudents,
      totalRegStudents,
      totalPrevStudents,
      totalPwd,
      totalDebarred,
      totalUfm,
      totalQueries,
      totalCompleted,
      totalActiveTasks,
      overallPct
    };
  }, [sessionRecords]);

  // Filtered heatmap data
  const heatmapData = useMemo(() => {
    const collegesList = dashCollege === "ALL" 
      ? config.colleges 
      : config.colleges.filter(c => c.id === dashCollege);

    const matrix = {};
    collegesList.forEach(col => {
      matrix[col.id] = { college: col, phaseStats: {}, overall: { completed: 0, total: 0, pct: 0 } };
      visiblePhases.forEach(ph => {
        matrix[col.id].phaseStats[ph] = { completed: 0, total: 0, pct: 0 };
      });
    });

    sessionRecords.forEach(s => {
      const colId = s.college;
      if (!matrix[colId]) return;

      activities.forEach(act => {
        if (!isActivityApplicableForCycle(act, s.examCycle)) return;
        if (!visiblePhases.includes(act.phase)) return;
        const log = s.logs[act.id] || {};
        const status = computeActivityStatus(act, log, s.semester);
        if (status === "SKIPPED" || status === "NA" || log.isNA) return;

        matrix[colId].phaseStats[act.phase].total++;
        matrix[colId].overall.total++;

        if (status === "COMPLETED") {
          matrix[colId].phaseStats[act.phase].completed++;
          matrix[colId].overall.completed++;
        }
      });
    });

    Object.values(matrix).forEach(row => {
      visiblePhases.forEach(ph => {
        const st = row.phaseStats[ph];
        st.pct = st.total > 0 ? Math.round((st.completed / st.total) * 100) : 0;
      });
      row.overall.pct = row.overall.total > 0 ? Math.round((row.overall.completed / row.overall.total) * 100) : 0;
    });

    return matrix;
  }, [config.colleges, dashCollege, visiblePhases, sessionRecords, activities]);

  // Filtered bottlenecks
  const bottlenecks = useMemo(() => {
    const counts = {};
    sessionRecords.forEach(s => {
      activities.forEach(act => {
        if (!isActivityApplicableForCycle(act, s.examCycle)) return;
        const log = s.logs[act.id] || {};
        if (log.isNA) return;
        const status = computeActivityStatus(act, log, s.semester);
        if (status === "SKIPPED") return;

        const isQ = log.queryDetails && !log.queryDetails.resolved;
        const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > (ROLE_RANKS[act.performedBy] ?? -1));
        const isPendingVerif = log.performedDate && !reqs.every(r => log.verifications?.[r]?.verified);

        if (isQ || isPendingVerif) {
          if (!counts[act.id]) {
            counts[act.id] = { activity: act, queries: 0, pendingVerifs: 0 };
          }
          if (isQ) counts[act.id].queries++;
          if (isPendingVerif) counts[act.id].pendingVerifs++;
        }
      });
    });

    return Object.values(counts)
      .sort((a, b) => (b.queries * 2 + b.pendingVerifs) - (a.queries * 2 + a.pendingVerifs))
      .slice(0, 6);
  }, [sessionRecords, activities]);

  // Filtered and sorted table sessions
  const filteredAndSortedSessions = useMemo(() => {
    let result = sessionRecords.filter(s => {
      if (!tableSearch.trim()) return true;
      const q = tableSearch.toLowerCase().trim();
      return (
        s.program.toLowerCase().includes(q) ||
        s.collegeName.toLowerCase().includes(q) ||
        s.college.toLowerCase().includes(q) ||
        s.examMonthYear.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q) ||
        s.semester.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (typeof vA === 'string') {
        vA = vA.toLowerCase();
        vB = (vB || '').toLowerCase();
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? ((vA ?? 0) - (vB ?? 0)) : ((vB ?? 0) - (vA ?? 0));
    });

    return result;
  }, [sessionRecords, tableSearch, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportFiltered = () => {
    exportExecutiveDashboardExcel(
      filteredAndSortedSessions,
      summary,
      { batch: dashBatch, college: dashCollege, cycle: dashCycle, sem: dashSem },
      config
    );
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Top Title Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icon name="bar-chart-3" size={22} className="text-indigo-600 dark:text-indigo-400" />
            <span>Executive Dashboard &amp; Multi-College Examination Reports</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-College, Academic Year-Wise &amp; Exam-Wise Verification Status, KPIs &amp; Audit Oversight
          </p>
        </div>
      </div>

      {/* Executive Filter & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="calendar" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">Acad. Year:</span>
            <select
              value={dashBatch}
              onChange={(e) => setDashBatch(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Academic Years</option>
              {config.batches.map(b => (
                <option key={b} value={b} className="dark:bg-slate-900">{b}</option>
              ))}
            </select>
          </div>

          {/* College Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="building" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">College:</span>
            <select
              value={dashCollege}
              onChange={(e) => setDashCollege(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL" className="dark:bg-slate-900">All Colleges</option>
              {config.colleges.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Exam Cycle Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Icon name="layers" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-500">Exam Cycle:</span>
            <select
              value={dashCycle}
              onChange={(e) => setDashCycle(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Cycles</option>
              <option value="Regular" className="dark:bg-slate-900">Regular</option>
              <option value="Re-Exam" className="dark:bg-slate-900">Re-Exam</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Sem:</span>
            <select
              value={dashSem}
              onChange={(e) => setDashSem(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Semesters</option>
              <option value="ODD" className="dark:bg-slate-900">Odd Semesters (I, III, V, VII)</option>
              <option value="EVEN" className="dark:bg-slate-900">Even Semesters (II, IV, VI, VIII)</option>
              {config.semesters.map(s => (
                <option key={s} value={s} className="dark:bg-slate-900">{s}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition"
            title="Reset All Filters to Default"
          >
            <Icon name="refresh-cw" size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Export Excel Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFiltered}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow flex items-center gap-1.5 transition text-xs"
            title="Export Filtered Executive Dashboard & Session Reports to Excel (.xlsx)"
          >
            <Icon name="download" size={14} />
            <span>Export Filtered Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Filtered) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Overall Compliance</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.overallPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{summary.totalCompleted} / {summary.totalActiveTasks} Tasks</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Active Queries</div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {summary.totalQueries}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Discrepancies Flagged</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Students</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {summary.totalStudents}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {dashCycle === "Re-Exam" || summary.totalRegStudents > 0
              ? `Reg: ${summary.totalRegStudents} | Prev: ${summary.totalPrevStudents}`
              : "Across Filtered Sessions"}
          </div>
        </div>

        <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/60 shadow-sm">
          <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">PWD Students</div>
          <div className="text-xl font-bold text-purple-900 dark:text-purple-200 mt-1">
            {summary.totalPwd}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Special Concessions</div>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm">
          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Debarred Students</div>
          <div className="text-xl font-bold text-rose-900 dark:text-rose-200 mt-1">
            {summary.totalDebarred}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Attendance Defaulters</div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">UFM Pending</div>
          <div className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">
            {summary.totalUfm}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">UMIC Committee Cases</div>
        </div>
      </div>

      {/* Cross-College & Cross-Phase RAG Heatmap Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Phase-by-Phase College RAG Progress Matrix</span>
              <span className="text-[10px] font-normal text-slate-400">({visiblePhases.length} Applicable Phases Shown)</span>
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> &gt;= 80% (Green)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> 40% - 79% (Amber)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> &lt; 40% (Red)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 text-left">College</th>
                {visiblePhases.map((ph) => {
                  const pNum = ph.split(':')[0] || ph;
                  const pLabel = ph.split(':')[1] || ph;
                  return (
                    <th key={ph} className="py-2.5 px-2 max-w-[130px] truncate" title={ph}>
                      {pNum}: {pLabel}
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 bg-indigo-50/50 dark:bg-indigo-950/30">Overall %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(() => {
                const activeColleges = (dashCollege === "ALL" ? config.colleges : config.colleges.filter(c => c.id === dashCollege))
                  .filter(col => (heatmapData[col.id]?.overall?.total || 0) > 0);
                if (activeColleges.length === 0) {
                  return (
                    <tr>
                      <td colSpan={visiblePhases.length + 2} className="py-8 text-center text-slate-400 italic">
                        No active colleges or programs with enrolled students found for current filter criteria.
                      </td>
                    </tr>
                  );
                }
                return activeColleges.map(col => {
                  const row = heatmapData[col.id] || { phaseStats: {}, overall: { pct: 0 } };
                  return (
                    <tr key={col.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-left font-bold text-slate-900 dark:text-white">
                        {col.name}
                      </td>

                      {visiblePhases.map(ph => {
                        const st = row.phaseStats[ph] || { completed: 0, total: 0, pct: 0 };
                        let cellClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60";
                        if (st.pct >= 80) {
                          cellClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60";
                        } else if (st.pct >= 40) {
                          cellClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60";
                        }

                        return (
                          <td key={ph} className="py-2.5 px-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToContextPhase && onNavigateToContextPhase(col.id, ph)}
                              className={`w-full py-1.5 px-1 rounded-xl font-bold border transition text-[11px] shadow-sm hover:scale-[1.03] ${cellClass}`}
                              title={`Click to jump to ${col.name} - ${ph}`}
                            >
                              {st.pct}%
                              <div className="text-[9px] font-normal opacity-80">{st.completed}/{st.total}</div>
                            </button>
                          </td>
                        );
                      })}

                      {/* Overall College Cell */}
                      <td className="py-2.5 px-2 font-bold bg-indigo-50/50 dark:bg-indigo-950/30">
                        <div className="inline-block px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-sm font-mono text-xs">
                          {row.overall.pct}%
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW SECTION: Academic Year, College & Exam-Wise Detailed Status Report */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="file-text" size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Academic Year, College &amp; Exam-Wise Detailed Status Report</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredAndSortedSessions.length} active examination session(s) matching selected filters
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search program, college or month..."
              className="w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={14} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
              <tr className="text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                <th onClick={() => handleSort('batch')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600">
                  Acad. Year {sortField === 'batch' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('college')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600">
                  College {sortField === 'college' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('program')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600">
                  Program {sortField === 'program' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('semester')} className="py-2.5 px-2 cursor-pointer hover:text-indigo-600 text-center">
                  Sem {sortField === 'semester' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('examCycle')} className="py-2.5 px-2 cursor-pointer hover:text-indigo-600 text-center">
                  Cycle {sortField === 'examCycle' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('examMonthYear')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600">
                  Exam Month &amp; Year {sortField === 'examMonthYear' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('totalStudents')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600">
                  Students {sortField === 'totalStudents' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="py-2.5 px-3">PWD / Debar / UFM</th>
                <th onClick={() => handleSort('progressPct')} className="py-2.5 px-3 cursor-pointer hover:text-indigo-600 min-w-[130px]">
                  Progress {sortField === 'progressPct' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('queries')} className="py-2.5 px-2 cursor-pointer hover:text-indigo-600 text-center">
                  Queries {sortField === 'queries' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAndSortedSessions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    No examination sessions match the active filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedSessions.map(s => {
                  const ragColor = s.progressPct >= 80 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" 
                    : s.progressPct >= 40 
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" 
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";

                  return (
                    <tr key={s.ctxKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white font-mono">{s.batch}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {s.collegeName}
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">({s.college})</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-indigo-900 dark:text-indigo-300">{s.program}</td>
                      <td className="py-2.5 px-2 text-center font-bold">{s.semester}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.examCycle === "Re-Exam" 
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" 
                            : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}>
                          {s.examCycle}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {s.examMonthYear || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">{s.totalStudents}</span>
                        {s.examCycle === "Re-Exam" && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            (Reg: {s.regBatchStudents} | Prev: {s.prevBatchStudents})
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold" title="PWD Students">
                            PWD: {s.pwdStudents}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold" title="Debarred Students">
                            Debar: {s.debarredStudents}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold" title="UFM Pending Cases">
                            UFM: {s.ufmCases}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${s.progressPct}%` }}
                            />
                          </div>
                          <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${ragColor}`}>
                            {s.progressPct}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {s.completedTasks} / {s.applicableTasks} Tasks
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {s.queries > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
                            ⚠️ {s.queries}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigateToContext && onNavigateToContext(s.college, s.batch, s.program, s.semester, s.examCycle)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-lg font-semibold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 transition shadow-sm ml-auto text-xs"
                          title="Open this Session in Activity Tracker"
                        >
                          <Icon name="external-link" size={12} />
                          <span>Open Workspace</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pending Bottlenecks */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Icon name="alert-triangle" size={16} className="text-amber-500" />
          <span>Top Verification Bottlenecks &amp; Queries Requiring Action</span>
        </h3>
        {bottlenecks.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">No active verification bottlenecks found in filtered sessions.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {bottlenecks.map(b => (
              <div key={b.activity.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>#{b.activity.srNo} {b.activity.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                    {b.activity.performedBy}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{b.activity.phase}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px]">
                  {b.queries > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                      ⚠️ {b.queries} Query Flagged
                    </span>
                  )}
                  {b.pendingVerifs > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                      ⌛ {b.pendingVerifs} Pending Sign-off
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
