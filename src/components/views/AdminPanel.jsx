import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../common/Icon.jsx';
import StaffFormModal from '../modals/StaffFormModal.jsx';
import ActivityFormModal from '../modals/ActivityFormModal.jsx';
import { INITIAL_PHASES } from '../../constants/config.js';
import { hashPassword } from '../../utils/crypto.js';
import { getActivityExamScope, getStaffStudentScope, normalizeProgramName } from '../../utils/helpers.js';
import { exportCurrentViewExcel } from '../../utils/excelExport.js';

// --- Admin Control Panel ---
export default function AdminPanel({
  users,
  activities,
  contexts,
  config,
  currentLogs,
  context,
  headerMetrics,
  onSaveUser,
  onDeleteUser,
  onResetPassword,
  onSaveActivity,
  onDeleteActivity,
  onSaveConfig,
  onCascadeRenameCollege,
  onCascadeRenameProgram,
  onCascadeRenamePhase,
  onCascadeReorderPhases,
  onCascadeRenameBatch,
  onRestoreBackup,
  onResetToSeed,
  onPurgeSampleData,
  onOpenAuditModal,
  showConfirm,
  showToast
}) {
  const activePhases = useMemo(() => {
    const list = config?.phases && config.phases.length > 0 ? [...config.phases] : [...INITIAL_PHASES];
    activities.forEach(a => {
      if (a.phase && !list.includes(a.phase)) list.push(a.phase);
    });
    return list;
  }, [config?.phases, activities]);
  const [editingCollegeId, setEditingCollegeId] = useState(null);
  const [editColName, setEditColName] = useState("");
  const [editColCode, setEditColCode] = useState("");

  const [editingProgName, setEditingProgName] = useState(null);
  const [editProgVal, setEditProgVal] = useState("");

  const [editingPhaseName, setEditingPhaseName] = useState(null);
  const [editPhaseVal, setEditPhaseVal] = useState("");
  const [newPhaseInput, setNewPhaseInput] = useState("");

  const [editingBatchVal, setEditingBatchVal] = useState(null);
  const [editBatchVal, setEditBatchVal] = useState("");
  const [adminTab, setAdminTab] = useState("staff");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffBatchFilter, setStaffBatchFilter] = useState(context?.batch || config?.currentBatch || config?.batches?.[0] || 'ALL');
  const [staffCycleFilter, setStaffCycleFilter] = useState("ALL");
  const [staffSortField, setStaffSortField] = useState("name");
  const [staffSortAsc, setStaffSortAsc] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Auto-sync batch filter if currently on obsolete batch
  useEffect(() => {
    if (config?.currentBatch && (staffBatchFilter === '2025-26' || !staffBatchFilter)) {
      setStaffBatchFilter(config.currentBatch);
    }
  }, [config?.currentBatch]);
  const staffStudentStats = useMemo(() => {
    const statsMap = {};
    (users || []).forEach(u => {
      statsMap[u.id] = getStaffStudentScope(u, contexts, config, staffBatchFilter, staffCycleFilter);
    });
    return statsMap;
  }, [users, contexts, config, staffBatchFilter, staffCycleFilter]);

  const handleStaffSort = (field) => {
    if (staffSortField === field) {
      setStaffSortAsc(prev => !prev);
    } else {
      setStaffSortField(field);
      setStaffSortAsc(field === 'students' ? false : true);
    }
  };

  // Activity Master State
  const [actSearch, setActSearch] = useState("");
  const [actPhaseFilter, setActPhaseFilter] = useState("ALL");
  const [actScopeFilter, setActScopeFilter] = useState("ALL");
  const [editingAct, setEditingAct] = useState(null);
  const [isAddingAct, setIsAddingAct] = useState(false);

  // Colleges & Batches State
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeCode, setNewCollegeCode] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [newProgramName, setNewProgramName] = useState("");
  const [progCollegeSelect, setProgCollegeSelect] = useState(config?.colleges?.[0]?.id || "");

  // Filtered and sorted staff
  const filteredStaff = useMemo(() => {
    return (users || [])
      .filter(u => {
        const q = staffSearch.toLowerCase().trim();
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (staffSortField === 'students') {
          const aCount = staffStudentStats[a.id]?.totalStudents || 0;
          const bCount = staffStudentStats[b.id]?.totalStudents || 0;
          return staffSortAsc ? aCount - bCount : bCount - aCount;
        }
        if (staffSortField === 'role') {
          return staffSortAsc ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role);
        }
        return staffSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
  }, [users, staffSearch, staffSortField, staffSortAsc, staffStudentStats]);

  // Filtered activities (sorted by Sr. No.)
  const filteredActs = useMemo(() => {
    return activities
      .filter(a => {
        if (actPhaseFilter !== "ALL" && a.phase !== actPhaseFilter) return false;
        if (actScopeFilter !== "ALL") {
          const sc = getActivityExamScope(a);
          if (sc !== actScopeFilter) return false;
        }
        if (actSearch.trim()) {
          const q = actSearch.toLowerCase().trim();
          return a.name.toLowerCase().includes(q) || String(a.srNo).includes(q);
        }
        return true;
      })
      .sort((a, b) => (a.srNo || 0) - (b.srNo || 0));
  }, [activities, actPhaseFilter, actScopeFilter, actSearch]);

  const phases = useMemo(() => {
    const list = [];
    activities.forEach(a => {
      if (!list.includes(a.phase)) list.push(a.phase);
    });
    return list;
  }, [activities]);

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-4 space-y-4 pb-24 no-print">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icon name="settings" size={22} className="text-indigo-600 dark:text-indigo-400" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Staff Credentials & Assignments, 230-Item Activity Master, Colleges, Batches, and System Backups
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setAdminTab("staff")}
            className={`px-3 py-1.5 rounded-lg transition ${
              adminTab === "staff" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Staff & Assignments
          </button>
          <button
            onClick={() => setAdminTab("activities")}
            className={`px-3 py-1.5 rounded-lg transition ${
              adminTab === "activities" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Activity Master (230)
          </button>
          <button
            onClick={() => setAdminTab("colleges")}
            className={`px-3 py-1.5 rounded-lg transition ${
              adminTab === "colleges" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Colleges, Programs, Phases & Batches
          </button>
          <button
            onClick={() => setAdminTab("backup")}
            className={`px-3 py-1.5 rounded-lg transition ${
              adminTab === "backup" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Backup & Excel
          </button>
        </div>
      </div>

      {/* Tab 1: Staff, Roles & Assignments */}
      {adminTab === "staff" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff name or email..."
                  className="w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="search" size={14} />
                </div>
              </div>

              {/* Batch Scope Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batch:</span>
                <select
                  value={staffBatchFilter}
                  onChange={(e) => setStaffBatchFilter(e.target.value)}
                  className="text-xs bg-transparent text-slate-900 dark:text-white font-medium border-0 focus:ring-0 cursor-pointer pr-1"
                >
                  <option value="ALL">All Batches</option>
                  {(config.batches || []).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Exam Cycle Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cycle:</span>
                <select
                  value={staffCycleFilter}
                  onChange={(e) => setStaffCycleFilter(e.target.value)}
                  className="text-xs bg-transparent text-slate-900 dark:text-white font-medium border-0 focus:ring-0 cursor-pointer pr-1"
                >
                  <option value="ALL">All Cycles</option>
                  <option value="Regular">Regular Only</option>
                  <option value="Re-Exam">Re-Exam Only</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsAddingUser(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition"
            >
              <Icon name="plus" size={14} />
              <span>Add New Staff Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                  <th 
                    onClick={() => handleStaffSort('name')}
                    className="py-2.5 px-3 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition select-none"
                    title="Click to sort by staff name"
                  >
                    <div className="flex items-center gap-1">
                      <span>Staff Name & Email</span>
                      {staffSortField === 'name' ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{staffSortAsc ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-[9px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleStaffSort('role')}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition select-none"
                    title="Click to sort by role"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Role</span>
                      {staffSortField === 'role' && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{staffSortAsc ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center">Is Admin</th>
                  <th className="py-2.5 px-3">Assigned Colleges</th>
                  <th className="py-2.5 px-3">Assigned Programs</th>
                  <th 
                    onClick={() => handleStaffSort('students')}
                    className="py-2.5 px-3 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition select-none"
                    title="Click to sort by total students in scope"
                  >
                    <div className="flex items-center gap-1">
                      <span>Students in Scope</span>
                      {staffSortField === 'students' ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{staffSortAsc ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-[9px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStaff.map(u => {
                  const stats = staffStudentStats[u.id] || { totalStudents: 0, byCollege: {}, cohortCount: 0 };
                  const activeColleges = Object.entries(stats.byCollege).filter(([_, count]) => count > 0);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {u.isAdmin ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                            Admin
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {u.assignedColleges?.includes('ALL') ? 'ALL Colleges' : u.assignedColleges?.join(', ')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {(() => {
                          if (!u.assignedPrograms) return <span className="text-slate-400 text-[11px]">—</span>;
                          if (u.assignedPrograms?.ALL?.includes('ALL')) {
                            return <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">ALL Programs</span>;
                          }
                          const entries = Object.entries(u.assignedPrograms).filter(([_, list]) => Array.isArray(list) && list.length > 0);
                          if (entries.length === 0) return <span className="text-slate-400 text-[11px]">—</span>;
                          return (
                            <div className="space-y-0.5 max-w-[200px]" title={JSON.stringify(u.assignedPrograms)}>
                              {entries.map(([col, progs]) => (
                                <div key={col} className="text-[11px] truncate">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{col}:</span>{' '}
                                  <span className="text-slate-500">{progs.includes('ALL') ? 'ALL' : progs.join(', ')}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      {/* Students in Scope Column with Per-College Breakdown */}
                      <td className="py-2.5 px-3">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {stats.totalStudents.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400">students</span>
                          </div>
                          {activeColleges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1 max-w-[280px]">
                              {activeColleges.map(([colCode, count]) => {
                                const colObj = (config?.colleges || []).find(c => c.id === colCode || c.code === colCode);
                                const colTitle = colObj ? `${colObj.name}: ${count.toLocaleString()} students` : `${colCode}: ${count.toLocaleString()} students`;
                                return (
                                  <span
                                    key={colCode}
                                    title={colTitle}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60"
                                  >
                                    {colCode}: {count.toLocaleString()}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              0 active cohorts
                            </div>
                          )}
                          {stats.cohortCount > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {stats.cohortCount} cohort{stats.cohortCount === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onResetPassword(u.id)}
                            className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition"
                            title="Reset Password to Pass@123"
                          >
                            Reset Pass
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit User"
                          >
                            <Icon name="edit-2" size={14} />
                          </button>
                          {u.role !== 'COE' ? (
                            <button
                              onClick={() => onDeleteUser(u.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                              title="Delete User"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          ) : (
                            <span
                              className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed inline-block"
                              title="Institutional Rule: COE Account is protected and cannot be deleted"
                            >
                              <Icon name="lock" size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Master Manager (230 Activities) */}
      {adminTab === "activities" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={actSearch}
                  onChange={(e) => setActSearch(e.target.value)}
                  placeholder="Search activity by name or #..."
                  className="w-64 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="search" size={14} />
                </div>
              </div>

              <select
                value={actPhaseFilter}
                onChange={(e) => setActPhaseFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="ALL">All Phases</option>
                {phases.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={actScopeFilter}
                onChange={(e) => setActScopeFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">All Exam Scopes</option>
                <option value="REGULAR_ONLY">Regular Exam Only</option>
                <option value="REEXAM_ONLY">Re-Exam Only</option>
                <option value="BOTH">Both (Regular &amp; Re-Exam)</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddingAct(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5"
            >
              <Icon name="plus" size={14} />
              <span>Add New Activity</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px]">
                  <th className="py-2.5 px-2 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Activity Name</th>
                  <th className="py-2.5 px-3">Phase</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Exam Scope</th>
                  <th className="py-2.5 px-2 text-center">Maker</th>
                  <th className="py-2.5 px-2 text-center">Condition</th>
                  <th className="py-2.5 px-3">Required Verifiers</th>
                  <th className="py-2.5 px-2 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredActs.map(a => {
                  const scope = getActivityExamScope(a);
                  const badgeColor = scope === "REGULAR_ONLY"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                    : scope === "REEXAM_ONLY"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-500">{a.srNo}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{a.name}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">{a.phase}</td>
                      <td className="py-2 px-3">
                        <select
                          value={scope}
                          onChange={(e) => onSaveActivity({ ...a, examScope: e.target.value })}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border focus:outline-none cursor-pointer ${badgeColor}`}
                          title="Change Exam Scope (Regular Only, Re-Exam Only, or Both Cycles)"
                        >
                          <option value="REGULAR_ONLY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Regular Only</option>
                          <option value="REEXAM_ONLY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Re-Exam Only</option>
                          <option value="BOTH" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Both Cycles</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{a.performedBy}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {a.cond}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                        {(a.requiredVerifiers || []).join(' → ')}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingAct(a)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Activity"
                          >
                            <Icon name="edit-2" size={14} />
                          </button>
                          <button
                            onClick={() => {
                            showConfirm({
                              title: "Delete Master Activity",
                              message: `Are you sure you want to delete Activity #${a.srNo}: "${a.name}"? This removes it permanently from the activity master list.`,
                              confirmText: "Delete",
                              cancelText: "Cancel",
                              type: "danger",
                              onConfirm: () => onDeleteActivity(a.id)
                            });
                          }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Activity"
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Colleges, Programs, Phases & Batches Manager (2x2 Grid) */}
      {adminTab === "colleges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Colleges Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>Colleges ({config?.colleges?.length || 0})</span>
                <Icon name="building" size={16} className="text-indigo-600" />
              </h3>

              <div className="space-y-2 mt-3 max-h-[260px] overflow-y-auto pr-1">
                {(config?.colleges || []).map(c => (
                  editingCollegeId === c.id ? (
                    <div key={c.id} className="p-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editColName}
                          onChange={(e) => setEditColName(e.target.value)}
                          placeholder="College Name"
                          className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                        <input
                          type="text"
                          value={editColCode}
                          onChange={(e) => setEditColCode(e.target.value.toUpperCase())}
                          placeholder="Code"
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingCollegeId(null)}
                          className="px-2.5 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!editColName.trim() || !editColCode.trim()) {
                              showToast("College Name and Shortform/Code are required.", "warning");
                              return;
                            }
                            const newCode = editColCode.trim().toUpperCase();
                            onCascadeRenameCollege(c.id, newCode, editColName.trim());
                            setEditingCollegeId(null);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Icon name="check" size={12} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                        <span className="ml-1 text-[10px] text-slate-400 font-mono font-semibold">({c.id})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCollegeId(c.id);
                            setEditColName(c.name);
                            setEditColCode(c.id);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          title="Edit College Name and Shortform"
                        >
                          <Icon name="edit-2" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (config.colleges.length <= 1) {
                              showToast("Must keep at least 1 college.", "warning");
                              return;
                            }
                            showConfirm({
                              title: "Delete College",
                              message: `Delete college ${c.name} (${c.id})? This will remove its associated programs and session access.`,
                              type: "danger",
                              onConfirm: () => {
                                const next = config.colleges.filter(x => x.id !== c.id);
                                onSaveConfig({ ...config, colleges: next });
                                showToast(`Deleted college ${c.name}`, "info");
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete College"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New College Name..."
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Shortform (e.g. UPG)..."
                  value={newCollegeCode}
                  onChange={(e) => setNewCollegeCode(e.target.value.toUpperCase())}
                  className="w-28 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase"
                />
              </div>
              <button
                onClick={() => {
                  if (!newCollegeName.trim()) return;
                  const code = (newCollegeCode.trim() || newCollegeName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)).toUpperCase();
                  if (config.colleges.some(x => x.id === code)) {
                    showToast(`College with code ${code} already exists.`, "warning");
                    return;
                  }
                  const next = [...config.colleges, { id: code, name: newCollegeName.trim(), code }];
                  const nextProgs = { ...config.programs, [code]: config.programs[code] || [] };
                  onSaveConfig({ ...config, colleges: next, programs: nextProgs });
                  setNewCollegeName("");
                  setNewCollegeCode("");
                  showToast(`Added college ${newCollegeName.trim()} (${code})`, "success");
                }}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Add College
              </button>
            </div>
          </div>

          {/* Card 2: Programs by College Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Programs by College
                </h3>
                <select
                  value={progCollegeSelect}
                  onChange={(e) => setProgCollegeSelect(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg px-2 py-1 font-bold"
                >
                  {(config?.colleges || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 mt-3 max-h-[260px] overflow-y-auto pr-1">
                {(config?.programs?.[progCollegeSelect] || []).map(p => (
                  editingProgName === p ? (
                    <div key={p} className="flex items-center gap-1.5 p-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                      <input
                        type="text"
                        value={editProgVal}
                        onChange={(e) => setEditProgVal(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!editProgVal.trim()) return;
                          onCascadeRenameProgram(progCollegeSelect, p, editProgVal.trim());
                          setEditingProgName(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Save"
                      >
                        <Icon name="check" size={14} />
                      </button>
                      <button
                        onClick={() => setEditingProgName(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        title="Cancel"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ) : (
                    <div key={p} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{p}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingProgName(p);
                            setEditProgVal(p);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          title="Edit / Rename Program"
                        >
                          <Icon name="edit-2" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            showConfirm({
                              title: "Delete Program",
                              message: `Delete program "${p}" from ${progCollegeSelect}?`,
                              type: "danger",
                              onConfirm: () => {
                                const curList = config.programs[progCollegeSelect] || [];
                                const next = curList.filter(x => x !== p);
                                onSaveConfig({
                                  ...config,
                                  programs: { ...config.programs, [progCollegeSelect]: next }
                                });
                                showToast(`Deleted program ${p}`, "info");
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete Program"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="New Program Name..."
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
              />
              <button
                onClick={() => {
                  if (!newProgramName.trim()) return;
                  const cur = config.programs[progCollegeSelect] || [];
                  if (cur.includes(newProgramName.trim())) {
                    showToast(`Program "${newProgramName.trim()}" already exists in ${progCollegeSelect}.`, "warning");
                    return;
                  }
                  const next = [...cur, newProgramName.trim()];
                  onSaveConfig({
                    ...config,
                    programs: { ...config.programs, [progCollegeSelect]: next }
                  });
                  setNewProgramName("");
                  showToast(`Added program ${newProgramName.trim()}`, "success");
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Card 3: Examination Phases Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>Examination Phases ({activePhases.length})</span>
                <Icon name="layers" size={16} className="text-indigo-600" />
              </h3>

              <div className="space-y-1.5 mt-3 max-h-[260px] overflow-y-auto pr-1">
                {activePhases.map((ph, idx) => {
                  const actsInPhase = activities.filter(a => a.phase === ph);
                  return editingPhaseName === ph ? (
                    <div key={ph} className="flex items-center gap-1.5 p-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                      <input
                        type="text"
                        value={editPhaseVal}
                        onChange={(e) => setEditPhaseVal(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!editPhaseVal.trim()) return;
                          onCascadeRenamePhase(ph, editPhaseVal.trim());
                          setEditingPhaseName(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Save"
                      >
                        <Icon name="check" size={14} />
                      </button>
                      <button
                        onClick={() => setEditingPhaseName(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        title="Cancel"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ) : (
                    <div key={ph} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ph}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">({actsInPhase.length} acts)</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...activePhases];
                            const tmp = next[idx - 1];
                            next[idx - 1] = next[idx];
                            next[idx] = tmp;
                            onCascadeReorderPhases(next);
                          }}
                          className={`p-1 rounded ${idx === 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
                          title="Move Up"
                        >
                          <Icon name="chevron-up" size={13} />
                        </button>
                        <button
                          disabled={idx === activePhases.length - 1}
                          onClick={() => {
                            const next = [...activePhases];
                            const tmp = next[idx + 1];
                            next[idx + 1] = next[idx];
                            next[idx] = tmp;
                            onCascadeReorderPhases(next);
                          }}
                          className={`p-1 rounded ${idx === activePhases.length - 1 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
                          title="Move Down"
                        >
                          <Icon name="chevron-down" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPhaseName(ph);
                            setEditPhaseVal(ph);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Rename Phase"
                        >
                          <Icon name="edit-2" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (actsInPhase.length > 0) {
                              showToast(`Cannot delete phase "${ph}" because ${actsInPhase.length} activities are assigned to it. Reassign or delete those activities first.`, "warning");
                              return;
                            }
                            showConfirm({
                              title: "Delete Phase",
                              message: `Delete unused phase "${ph}"?`,
                              type: "danger",
                              onConfirm: () => {
                                const next = activePhases.filter(x => x !== ph);
                                onCascadeReorderPhases(next);
                                showToast(`Deleted phase "${ph}"`, "info");
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete Phase"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="e.g. Phase 8: Supplementary"
                value={newPhaseInput}
                onChange={(e) => setNewPhaseInput(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
              />
              <button
                onClick={() => {
                  if (!newPhaseInput.trim()) return;
                  if (activePhases.includes(newPhaseInput.trim())) {
                    showToast(`Phase "${newPhaseInput.trim()}" already exists.`, "warning");
                    return;
                  }
                  onCascadeReorderPhases([...activePhases, newPhaseInput.trim()]);
                  setNewPhaseInput("");
                  showToast("Phase added successfully", "success");
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Card 4: Academic Year Batches Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>Academic Year Batches ({config?.batches?.length || 0})</span>
                <Icon name="calendar" size={16} className="text-indigo-600" />
              </h3>

              {/* NEW: Current Academic Year Default Selector */}
              <div className="mt-3 p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-indigo-950 dark:text-indigo-200">Current Academic Year</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Default Batch for all users</div>
                </div>
                <select
                  value={config?.currentBatch || config?.batches?.[0] || ""}
                  onChange={(e) => {
                    const selectedBatch = e.target.value;
                    onSaveConfig({ ...config, currentBatch: selectedBatch });
                    showToast(`Current Academic Year set to ${selectedBatch}`, "success");
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {(config?.batches || []).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 mt-3 max-h-[210px] overflow-y-auto pr-1">
                {(config?.batches || []).map(b => {
                  const isCurrent = (config?.currentBatch || config?.batches?.[0]) === b;
                  return editingBatchVal === b ? (
                    <div key={b} className="flex items-center gap-1.5 p-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                      <input
                        type="text"
                        value={editBatchVal}
                        onChange={(e) => setEditBatchVal(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono font-bold"
                      />
                      <button
                        onClick={() => {
                          if (!editBatchVal.trim()) return;
                          onCascadeRenameBatch(b, editBatchVal.trim());
                          setEditingBatchVal(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Save"
                      >
                        <Icon name="check" size={14} />
                      </button>
                      <button
                        onClick={() => setEditingBatchVal(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        title="Cancel"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ) : (
                    <div key={b} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <span>{b}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              onSaveConfig({ ...config, currentBatch: b });
                              showToast(`Current Academic Year set to ${b}`, "success");
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-sans font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 rounded"
                            title="Set as Current Academic Year"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingBatchVal(b);
                            setEditBatchVal(b);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          title="Edit / Rename Batch"
                        >
                          <Icon name="edit-2" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (config.batches.length <= 1) {
                              showToast("Must keep at least 1 batch.", "warning");
                              return;
                            }
                            showConfirm({
                              title: "Delete Batch",
                              message: `Delete batch ${b}?`,
                              type: "danger",
                              onConfirm: () => {
                                const next = config.batches.filter(x => x !== b);
                                const nextCurrent = config.currentBatch === b ? (next[0] || "") : config.currentBatch;
                                onSaveConfig({ ...config, batches: next, currentBatch: nextCurrent });
                                showToast(`Deleted batch ${b}`, "info");
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete Batch"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="e.g. 2028-29"
                value={newBatch}
                onChange={(e) => setNewBatch(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
              />
              <button
                onClick={() => {
                  if (!newBatch.trim()) return;
                  if (config.batches.includes(newBatch.trim())) {
                    showToast(`Batch "${newBatch.trim()}" already exists.`, "warning");
                    return;
                  }
                  const next = [...config.batches, newBatch.trim()];
                  onSaveConfig({ ...config, batches: next });
                  setNewBatch("");
                  showToast(`Added batch ${newBatch.trim()}`, "success");
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Database Backup, Excel Export/Import, Cloud Sync & Audit Report */}
      {adminTab === "backup" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Excel Exports */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Icon name="download" size={18} className="text-emerald-600" />
                <span>Executive Excel (.xlsx) Reports</span>
              </div>
              <p className="text-xs text-slate-500">
                Export styled workbooks with pastel headers for meetings, audits, or offline record-keeping.
              </p>
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => exportCurrentViewExcel(activities, currentLogs, context, headerMetrics)}
                  className="w-full py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between transition"
                >
                  <span>Export Current Workspace View</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">.XLSX</span>
                </button>
                <button
                  onClick={() => exportFullDatabaseExcel(activities, contexts, config, users)}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow transition"
                >
                  <span>Export Entire Multi-College Database (4 Sheets)</span>
                  <span className="text-[10px] text-emerald-100 font-mono font-bold">ALL DATA</span>
                </button>
              </div>
            </div>

            {/* Box 2: JSON Backup & Restore */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Icon name="database" size={18} className="text-indigo-600" />
                <span>Full JSON Database Backup & Disaster Recovery</span>
              </div>
              <p className="text-xs text-slate-500">
                Download or restore a complete timestamped JSON image of Supabase configuration, user accounts, and all 230-activity logs.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => downloadJsonBackup({ config, users, activities, contexts })}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition text-center"
                >
                  Download JSON Backup
                </button>
                <label className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-indigo-500 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold text-center cursor-pointer transition">
                  Restore from JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      restoreJsonBackup(file, (data) => {
                        onRestoreBackup(data);
                        showToast("Database restored successfully!", "success");
                      }, (err) => showToast("Failed to restore: " + err, "error"));
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* System Settings & Compliance Report */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="printer" size={18} className="text-indigo-600" />
                <span>Print Official A4 Compliance Audit Report</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Renders formal Times New Roman institutional report with sign-off blocks for Assistant, Coordinator, AR Ajay Shelar, Dy. CoE Dr. Rupesh Mundada, and CoE Ms. Alka Shukla.
              </p>
            </div>
            <button
              onClick={onOpenAuditModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-2"
            >
              <Icon name="printer" size={15} />
              <span>Generate Audit Report</span>
            </button>
          </div>

          {/* Quick-Login Demo Pills Toggle & Seed Reset */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!config.hideDemoLogins}
                  onChange={(e) => onSaveConfig({ ...config, hideDemoLogins: !e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Show Quick-Fill Demo Pills on Login Screen (Testing Mode)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onPurgeSampleData && (
                <button
                  type="button"
                  onClick={onPurgeSampleData}
                  className="px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition flex items-center gap-1.5"
                  title="Purge all prototype sample exam sessions and mock logs"
                >
                  <Icon name="trash-2" size={13} />
                  <span>Purge Sample / Test Contexts</span>
                </button>
              )}
              <button
                onClick={onResetToSeed}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              >
                Reset to Factory Seed Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {(isAddingUser || editingUser) && (
        <StaffFormModal
          user={editingUser}
          users={users}
          config={config}
          showToast={showToast}
          onClose={() => { setEditingUser(null); setIsAddingUser(false); }}
          onSave={(savedUser) => {
            onSaveUser(savedUser);
            setEditingUser(null);
            setIsAddingUser(false);
          }}
        />
      )}

      {/* Add / Edit Activity Modal */}
      {(isAddingAct || editingAct) && (
        <ActivityFormModal
          activity={editingAct}
          phases={activePhases}
          activities={activities}
          onClose={() => { setEditingAct(null); setIsAddingAct(false); }}
          onSave={(savedAct) => {
            onSaveActivity(savedAct);
            setEditingAct(null);
            setIsAddingAct(false);
          }}
        />
      )}
    </div>
  );
}
