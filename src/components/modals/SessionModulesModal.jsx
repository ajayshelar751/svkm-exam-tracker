import React, { useState, useMemo } from 'react';
import Icon from '../common/Icon.jsx';

export default function SessionModulesModal({
  isOpen,
  onClose,
  context = {},
  headerMetrics = {}
}) {
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'WRIT' | 'LAB' | 'ICA'
  const [searchQuery, setSearchQuery] = useState("");

  // Robust modules retrieval: check prop, with persistent fallback from local storage cache
  const modulesList = useMemo(() => {
    if (Array.isArray(headerMetrics?.modulesList) && headerMetrics.modulesList.length > 0) {
      return headerMetrics.modulesList;
    }
    try {
      const storageKeys = ['svkm_exam_portal_v1', 'svkm_exam_tracker_data'];
      for (const sKey of storageKeys) {
        const raw = localStorage.getItem(sKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const ctxKey = `${context.college}__${context.batch}__${context.program}__${context.semester}__${context.examCycle || 'Regular'}`;
          const cached = parsed.contexts?.[ctxKey]?.headerMetrics?.modulesList;
          if (Array.isArray(cached) && cached.length > 0) return cached;

          // Also check if any context for this college and program matches
          if (context.program && context.semester) {
            for (const [k, v] of Object.entries(parsed.contexts || {})) {
              if (k.includes(context.program) && k.includes(context.semester) && Array.isArray(v?.headerMetrics?.modulesList) && v.headerMetrics.modulesList.length > 0) {
                return v.headerMetrics.modulesList;
              }
            }
          }
        }
      }
    } catch (e) {}
    return [];
  }, [headerMetrics?.modulesList, context]);

  const breakdown = useMemo(() => {
    if (headerMetrics?.modulesBreakdown && (headerMetrics.modulesBreakdown.total > 0 || headerMetrics.modulesBreakdown.writ > 0)) {
      return headerMetrics.modulesBreakdown;
    }
    try {
      const storageKeys = ['svkm_exam_portal_v1', 'svkm_exam_tracker_data'];
      for (const sKey of storageKeys) {
        const raw = localStorage.getItem(sKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const ctxKey = `${context.college}__${context.batch}__${context.program}__${context.semester}__${context.examCycle || 'Regular'}`;
          const cached = parsed.contexts?.[ctxKey]?.headerMetrics?.modulesBreakdown;
          if (cached && (cached.total > 0 || cached.writ > 0)) return cached;
        }
      }
    } catch (e) {}
    return {
      total: modulesList.length,
      writ: modulesList.filter(m => m.examType === "WRIT" || m.examMode === "WRIT").length,
      lab: modulesList.filter(m => m.examType === "LAB" || m.examMode === "LAB").length,
      ica: modulesList.filter(m => m.examType === "ICA" || m.examMode === "ICA").length
    };
  }, [headerMetrics?.modulesBreakdown, modulesList, context]);

  const filteredModules = useMemo(() => {
    return modulesList.filter(mod => {
      if (filterType !== "ALL" && mod.examType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = (mod.code || "").toLowerCase().includes(q);
        const matchName = (mod.name || "").toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [modulesList, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Icon name="layers" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Session Examination Modules &amp; Subjects</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {modulesList.length} Subjects
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {context.college} · {context.batch} · {context.program} · {context.semester}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Summary KPI Chips */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Modules</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {breakdown.total || modulesList.length}
            </div>
            <div className="text-[10px] text-slate-400">Unique Offerings</div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
            <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Written Theory (WRIT)</div>
            <div className="text-lg font-extrabold text-blue-900 dark:text-blue-200 mt-0.5">
              {breakdown.writ || 0}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400">Main Exam Papers</div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
            <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Practical / Lab (LAB)</div>
            <div className="text-lg font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
              {breakdown.lab || 0}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400">Practical &amp; Activity Labs</div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
            <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Internal Continuous (ICA)</div>
            <div className="text-lg font-extrabold text-purple-900 dark:text-purple-200 mt-0.5">
              {breakdown.ica || 0}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400">Project / Internal Only</div>
          </div>
        </div>

        {/* Toolbar: Search & Exam Type Filter */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterType === "ALL" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              All ({breakdown.total || modulesList.length})
            </button>
            <button
              onClick={() => setFilterType("WRIT")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterType === "WRIT" ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              }`}
            >
              WRIT ({breakdown.writ || 0})
            </button>
            <button
              onClick={() => setFilterType("LAB")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterType === "LAB" ? "bg-amber-600 text-white shadow-sm" : "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
            >
              LAB ({breakdown.lab || 0})
            </button>
            <button
              onClick={() => setFilterType("ICA")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterType === "ICA" ? "bg-purple-600 text-white shadow-sm" : "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              }`}
            >
              ICA ({breakdown.ica || 0})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or subject title..."
              className="w-56 pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={13} />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Subjects Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredModules.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Icon name="layers" size={32} className="mx-auto opacity-50" />
              <div className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                {modulesList.length === 0 ? "No module records ingested yet" : "No modules match your active filter"}
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {modulesList.length === 0 ? "Import the '2. Acad Report' Excel file to load the syllabus papers, exam modes, and marks scales." : "Try clearing your search query or selecting 'All'."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">Module Code</th>
                  <th className="py-2.5 px-3">Subject Description</th>
                  <th className="py-2.5 px-2 text-center w-20">Exam Mode</th>
                  <th className="py-2.5 px-2 text-center w-16">Credit</th>
                  <th className="py-2.5 px-2 text-center w-20" title="Appraisal Type 1 Scale (Internal / Continual)">Scale 1</th>
                  <th className="py-2.5 px-2 text-center w-20" title="Appraisal Type 2 Scale (External / End-Term)">Scale 2</th>
                  <th className="py-2.5 px-2 text-center w-24">Booked Students</th>
                  <th className="py-2.5 px-3 text-center w-24">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredModules.map((m, idx) => {
                  const badgeCls = m.examType === "WRIT"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    : m.examType === "LAB"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";

                  return (
                    <tr key={m.code || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{m.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.name}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}>
                          {m.examType || m.examMode || "WRIT"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-700 dark:text-slate-300">{m.credit || "—"}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {m.appraisal1Scale ? m.appraisal1Scale : "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {m.appraisal2Scale ? m.appraisal2Scale : "—"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{m.bookedStudents || 0}</span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {m.duration && m.duration !== "00:00:00" ? m.duration : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            Showing <strong className="text-slate-900 dark:text-white">{filteredModules.length}</strong> of <strong className="text-slate-900 dark:text-white">{modulesList.length}</strong> subjects for this cohort.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
