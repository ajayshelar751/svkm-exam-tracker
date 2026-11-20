import React, { useState, useMemo } from 'react';
import Icon from '../common/Icon.jsx';

export default function SessionStudentsModal({
  isOpen,
  onClose,
  context = {},
  headerMetrics = {}
}) {
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'PWD'
  const [searchQuery, setSearchQuery] = useState("");

  // Robust students retrieval: check prop, with persistent fallback from local storage cache
  const studentsList = useMemo(() => {
    if (Array.isArray(headerMetrics?.studentsList) && headerMetrics.studentsList.length > 0) {
      return headerMetrics.studentsList;
    }
    try {
      const storageKeys = ['svkm_exam_portal_v1', 'svkm_exam_tracker_data'];
      for (const sKey of storageKeys) {
        const raw = localStorage.getItem(sKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const ctxKey = `${context.college}__${context.batch}__${context.program}__${context.semester}__${context.examCycle || 'Regular'}`;
          const cached = parsed.contexts?.[ctxKey]?.headerMetrics?.studentsList;
          if (Array.isArray(cached) && cached.length > 0) return cached;

          // Also check if any context for this college, program, and semester matches
          if (context.program && context.semester) {
            for (const [k, v] of Object.entries(parsed.contexts || {})) {
              if (k.includes(context.program) && k.includes(context.semester) && Array.isArray(v?.headerMetrics?.studentsList) && v.headerMetrics.studentsList.length > 0) {
                return v.headerMetrics.studentsList;
              }
            }
          }
        }
      }
    } catch (e) {}
    return [];
  }, [headerMetrics?.studentsList, context]);

  const pwdStudentsCount = useMemo(() => {
    if (studentsList.length > 0) {
      return studentsList.filter(s => s.isPwd || (s.disability && !['none', 'no', 'n', 'nil', '', 'na', 'n/a'].includes(String(s.disability).toLowerCase()))).length;
    }
    return headerMetrics?.pwdStudents || 0;
  }, [studentsList, headerMetrics?.pwdStudents]);

  const totalStudentsCount = useMemo(() => {
    return studentsList.length > 0 ? studentsList.length : (headerMetrics?.totalStudents || 0);
  }, [studentsList, headerMetrics?.totalStudents]);

  const filteredStudents = useMemo(() => {
    return studentsList.filter(s => {
      const isPwd = s.isPwd || (s.disability && !['none', 'no', 'n', 'nil', '', 'na', 'n/a'].includes(String(s.disability).toLowerCase()));
      if (filterType === "PWD" && !isPwd) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchRoll = (s.rollNo || "").toLowerCase().includes(q);
        const matchNumber = (s.studentNumber || "").toLowerCase().includes(q);
        const matchName = (s.name || "").toLowerCase().includes(q);
        const matchDisability = (s.disability || "").toLowerCase().includes(q);
        if (!matchRoll && !matchNumber && !matchName && !matchDisability) return false;
      }
      return true;
    });
  }, [studentsList, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Icon name="users" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Session Enrolled Students Directory</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {totalStudentsCount} Students
                </span>
                {pwdStudentsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    {pwdStudentsCount} PWD
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {context.college} · {context.batch} · {context.program} · {context.semester} · {context.examCycle || "Regular"}
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
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Enrolled</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {totalStudentsCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Booked in this Session</div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
            <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Specially Abled (PWD)</div>
            <div className="text-lg font-extrabold text-purple-900 dark:text-purple-200 mt-0.5">
              {pwdStudentsCount}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400">Compensatory Time / Writer</div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">General Category</div>
            <div className="text-lg font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
              {Math.max(0, totalStudentsCount - pwdStudentsCount).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Regular Exam Seating</div>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === "ALL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              All Students ({totalStudentsCount})
            </button>
            <button
              onClick={() => setFilterType("PWD")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === "PWD"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              }`}
            >
              Specially Abled / PWD ({pwdStudentsCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Roll No, SAP ID, Name..."
              className="w-64 pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

        {/* Students Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Icon name="users" size={32} className="mx-auto opacity-50 text-slate-400" />
              <div className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                {studentsList.length === 0 ? "No individual student records ingested yet" : "No students match your active filter"}
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {studentsList.length === 0
                  ? "Import the '1. SAP Student Master [ZST_MASTERDATA_MULTI]' Excel file to load the student directory with Roll Numbers and Names."
                  : "Try clearing your search query or selecting 'All Students'."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-28 text-center">Student Roll No.</th>
                  <th className="py-2.5 px-3 w-36 font-mono text-center">Student Number</th>
                  <th className="py-2.5 px-4">Student Name (Last Name First Name Father First Name)</th>
                  <th className="py-2.5 px-3 w-40 text-center">Disability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredStudents.map((s, idx) => {
                  const isPwd = s.isPwd || (s.disability && !['none', 'no', 'n', 'nil', '', 'na', 'n/a'].includes(String(s.disability).toLowerCase()));
                  return (
                    <tr
                      key={s.studentNumber || idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${isPwd ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''}`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">{s.rollNo || "—"}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.studentNumber}</td>
                      <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200 uppercase">{s.name || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        {isPwd ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            {s.disability || "Specially Abled"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">None</span>
                        )}
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
            Showing <strong className="text-slate-900 dark:text-white">{filteredStudents.length}</strong> of <strong className="text-slate-900 dark:text-white">{studentsList.length}</strong> students for this cohort.
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
