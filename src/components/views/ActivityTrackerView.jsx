import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../common/Icon.jsx';
import ActivityHistoryModal from '../modals/ActivityHistoryModal.jsx';
import { ROLE_RANKS } from '../../constants/roles.js';
import { INITIAL_PHASES } from '../../constants/config.js';
import {
  isActivityApplicableForCycle,
  computeActivityStatus,
  getTodayYYYYMMDD,
  formatDateDisplay
} from '../../utils/helpers.js';
import { exportCurrentViewExcel } from '../../utils/excelExport.js';

export default function ActivityTrackerView({
  activities,
  currentLogs,
  context,
  currentUser,
  headerMetrics,
  config,
  onUpdateLog,
  onBulkUpdateLogs,
  onRevokeVerification,
  onOpenQueryModal,
  phaseFilter = "ALL",
  setPhaseFilter,
  showConfirm,
  showToast
}) {
  const [historyModalAct, setHistoryModalAct] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [makerFilter, setMakerFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedPhases, setCollapsedPhases] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  // Strict Institutional Rule: If student count is 0, session operations are locked
  const totalStudents = Number(headerMetrics?.totalStudents ?? (context?.examCycle === "Re-Exam" ? ((headerMetrics?.regBatchStudents || 0) + (headerMetrics?.prevBatchStudents || 0)) : 0)) || 0;
  const isZeroStudents = totalStudents <= 0;

  // Filter activities applicable to currently selected examCycle (Regular vs Re-Exam)
  const cycleApplicableActivities = useMemo(() => {
    return activities.filter(act => isActivityApplicableForCycle(act, context.examCycle));
  }, [activities, context.examCycle]);

  // Group activities by phase (respects config.phases order with fallback and auto-hides phases with 0 applicable activities)
  const phases = useMemo(() => {
    const list = config?.phases && config.phases.length > 0 ? [...config.phases] : [...INITIAL_PHASES];
    cycleApplicableActivities.forEach(a => {
      if (a.phase && !list.includes(a.phase)) list.push(a.phase);
    });
    return list.filter(p => cycleApplicableActivities.some(a => a.phase === p));
  }, [cycleApplicableActivities, config?.phases]);

  // Reset phaseFilter to ALL if current phaseFilter no longer exists in applicable phases
  useEffect(() => {
    if (phaseFilter !== "ALL" && !phases.includes(phaseFilter)) {
      setPhaseFilter("ALL");
    }
  }, [phases, phaseFilter, setPhaseFilter]);

  // Filter activities for active view
  const filteredActivities = useMemo(() => {
    return cycleApplicableActivities.filter(act => {
      const log = currentLogs[act.id] || {};
      const status = computeActivityStatus(act, log, context.semester);

      // Phase
      if (phaseFilter !== "ALL" && act.phase !== phaseFilter) return false;

      // Maker
      if (makerFilter !== "ALL" && act.performedBy !== makerFilter) return false;

      // Status
      if (statusFilter !== "ALL") {
        if (statusFilter === "AWAITING_ME") {
          // Can I perform?
          const canPerform = act.performedBy === currentUser.role && !log.performedDate && !log.isNA;
          // Can I verify?
          let canVerify = false;
          const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > (ROLE_RANKS[act.performedBy] ?? -1));
          if (log.performedDate && !log.isNA && reqs.includes(currentUser.role)) {
            const idx = reqs.indexOf(currentUser.role);
            const prevDone = idx === 0 || !!log.verifications?.[reqs[idx - 1]]?.verified;
            canVerify = prevDone && !log.verifications?.[currentUser.role]?.verified;
          }
          if (!canPerform && !canVerify) return false;
        } else if (statusFilter === "PENDING" && status !== "PENDING") {
          return false;
        } else if (statusFilter === "IN_PROGRESS" && status !== "IN_PROGRESS") {
          return false;
        } else if (statusFilter === "COMPLETED" && status !== "COMPLETED") {
          return false;
        } else if (statusFilter === "QUERY_RAISED" && status !== "QUERY_RAISED") {
          return false;
        } else if (statusFilter === "NA" && status !== "NA") {
          return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = act.name.toLowerCase().includes(q);
        const matchesSr = String(act.srNo).includes(q);
        if (!matchesName && !matchesSr) return false;
      }

      return true;
    });
  }, [cycleApplicableActivities, currentLogs, context.semester, phaseFilter, statusFilter, makerFilter, searchQuery, currentUser]);

  // Overall counters (scoped strictly to applicable activities for this cycle)
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let queryRaised = 0;
    let na = 0;

    cycleApplicableActivities.forEach(act => {
      const log = currentLogs[act.id] || {};
      const s = computeActivityStatus(act, log, context.semester);
      if (s === "COMPLETED") completed++;
      else if (s === "IN_PROGRESS") inProgress++;
      else if (s === "QUERY_RAISED") queryRaised++;
      else if (s === "NA" || s === "SKIPPED") na++;
      else pending++;
    });

    const activeTotal = cycleApplicableActivities.length - na;
    const pct = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;
    return { completed, inProgress, pending, queryRaised, na, pct, total: cycleApplicableActivities.length };
  }, [cycleApplicableActivities, currentLogs, context.semester]);

  // Toggle Collapse
  const togglePhase = (phase) => {
    setCollapsedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const expandAll = () => setCollapsedPhases({});
  const collapseAll = () => {
    const all = {};
    phases.forEach(p => all[p] = true);
    setCollapsedPhases(all);
  };

  // Selection handlers
  const handleSelectAllVisible = (e) => {
    if (isZeroStudents) return;
    if (e.target.checked) {
      setSelectedIds(filteredActivities.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (id) => {
    if (isZeroStudents) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Bulk actions
  const handleBulkSetPerformed = () => {
    if (isZeroStudents) return;
    const today = getTodayYYYYMMDD();
    const updates = {};
    selectedIds.forEach(id => {
      const act = activities.find(a => a.id === id);
      if (!act) return;
      // Maker or admin check
      if (currentUser.isAdmin || currentUser.role === act.performedBy) {
        const cur = currentLogs[id] || {};
        const hist = {
          id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          action: "PERFORMED",
          role: currentUser.role,
          userName: currentUser.name,
          userEmail: currentUser.email,
          dateValue: cur.performedDate || today,
          details: "Bulk marked as performed",
          timestamp: new Date().toISOString()
        };
        updates[id] = {
          ...cur,
          performedDate: cur.performedDate || today,
          performedByUser: cur.performedByUser || {
            name: currentUser.name,
            email: currentUser.email,
            timestamp: new Date().toISOString()
          },
          history: [...(cur.history || []), hist]
        };
      }
    });
    onBulkUpdateLogs(updates);
    setSelectedIds([]);
  };

  const handleBulkVerify = () => {
    if (isZeroStudents) return;
    const today = getTodayYYYYMMDD();
    const role = currentUser.role;
    const updates = {};

    selectedIds.forEach(id => {
      const act = activities.find(a => a.id === id);
      if (!act) return;
      const log = currentLogs[id] || {};
      const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > (ROLE_RANKS[act.performedBy] ?? -1));
      if (!reqs.includes(role)) return;

      const idx = reqs.indexOf(role);
      const prevDone = idx === 0 || !!log.verifications?.[reqs[idx - 1]]?.verified;
      if (log.performedDate && prevDone && !log.verifications?.[role]?.verified) {
        const hist = {
          id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          action: "VERIFIED",
          role: currentUser.role,
          userName: currentUser.name,
          userEmail: currentUser.email,
          dateValue: today,
          details: `Bulk signed off tier ${role}`,
          timestamp: new Date().toISOString()
        };
        updates[id] = {
          ...log,
          verifications: {
            ...(log.verifications || {}),
            [role]: {
              verified: true,
              date: today,
              userName: currentUser.name,
              userEmail: currentUser.email,
              systemTimestamp: new Date().toISOString()
            }
          },
          history: [...(log.history || []), hist]
        };
      }
    });

    onBulkUpdateLogs(updates);
    setSelectedIds([]);
  };

  const handleBulkToggleNA = (isNA) => {
    if (isZeroStudents) return;
    const updates = {};
    const nowIso = new Date().toISOString();
    selectedIds.forEach(id => {
      const cur = currentLogs[id] || {};
      const hist = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        action: isNA ? "MARKED_NA" : "MARKED_APPLICABLE",
        role: currentUser.role,
        userName: currentUser.name,
        userEmail: currentUser.email,
        dateValue: null,
        details: isNA ? "Marked as N/A in bulk" : "Marked as Applicable in bulk",
        timestamp: nowIso
      };
      updates[id] = {
        ...cur,
        isNA,
        history: [...(cur.history || []), hist]
      };
    });
    onBulkUpdateLogs(updates);
    setSelectedIds([]);
  };

  // Maker single field changes
  const handleSetPerformedDate = (act, dateVal) => {
    if (isZeroStudents) return;
    const cur = currentLogs[act.id] || {};
    const hist = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: dateVal ? "PERFORMED" : "PERFORM_CLEARED",
      role: currentUser.role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: dateVal || "",
      details: dateVal ? "Marked activity as performed" : "Cleared performed date",
      timestamp: new Date().toISOString()
    };
    onUpdateLog(act.id, {
      ...cur,
      performedDate: dateVal,
      performedByUser: dateVal ? {
        name: currentUser.name,
        email: currentUser.email,
        timestamp: new Date().toISOString()
      } : null,
      history: [...(cur.history || []), hist]
    });
  };

  const handleUpdateField = (actId, field, val) => {
    if (isZeroStudents) return;
    const cur = currentLogs[actId] || {};
    let nextHistory = cur.history || [];
    if (field === 'isNA') {
      nextHistory = [...nextHistory, {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        action: val ? "MARKED_NA" : "MARKED_APPLICABLE",
        role: currentUser.role,
        userName: currentUser.name,
        userEmail: currentUser.email,
        dateValue: "",
        details: val ? "Marked as Not Applicable (N/A)" : "Marked as Applicable",
        timestamp: new Date().toISOString()
      }];
    }
    onUpdateLog(actId, {
      ...cur,
      [field]: val,
      history: nextHistory
    });
  };

  // Verifier action
  const handleVerify = (act, role, customDate) => {
    if (isZeroStudents) return;
    const cur = currentLogs[act.id] || {};
    const dateVal = customDate || getTodayYYYYMMDD();
    const hist = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: "VERIFIED",
      role: currentUser.role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: dateVal,
      details: `Signed off verification tier ${role}`,
      timestamp: new Date().toISOString()
    };
    onUpdateLog(act.id, {
      ...cur,
      verifications: {
        ...(cur.verifications || {}),
        [role]: {
          verified: true,
          date: dateVal,
          userName: currentUser.name,
          userEmail: currentUser.email,
          systemTimestamp: new Date().toISOString()
        }
      },
      history: [...(cur.history || []), hist]
    });
  };

  const handleUnverify = (act, role) => {
    if (isZeroStudents) return;
    showConfirm({
      title: "Revoke Verification",
      message: `Are you sure you want to revoke verification for tier ${role}? This action will be recorded in the audit trail.`,
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => {
        const cur = currentLogs[act.id] || {};
        const prevVerif = cur.verifications?.[role] || {};
        const hist = {
          id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          action: "VERIFICATION_REVOKED",
          role: currentUser.role,
          userName: currentUser.name,
          userEmail: currentUser.email,
          dateValue: prevVerif.date || "",
          details: `Revoked verification tier ${role} previously signed off by ${prevVerif.userName || role} on ${formatDateDisplay(prevVerif.date)}`,
          timestamp: new Date().toISOString()
        };
        const nextHistory = [...(cur.history || []), hist];
        if (onRevokeVerification) {
          onRevokeVerification(act.id, role, nextHistory);
        } else {
          const nextVerifs = { ...(cur.verifications || {}) };
          delete nextVerifs[role];
          onUpdateLog(act.id, {
            ...cur,
            verifications: nextVerifs,
            history: nextHistory
          });
        }
      }
    });
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-3 space-y-3 pb-24">
      
      {/* Filters & KPI Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        
        {/* Left: Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Phase Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Phase:</span>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL" className="dark:bg-slate-900">{phases.length === 7 ? "All 7 Phases" : `All ${phases.length} Phases`}</option>
              {phases.map(p => (
                <option key={p} value={p} className="dark:bg-slate-900">{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Statuses</option>
              <option value="AWAITING_ME" className="dark:bg-slate-900">⚡ Awaiting My Action</option>
              <option value="PENDING" className="dark:bg-slate-900">Pending</option>
              <option value="IN_PROGRESS" className="dark:bg-slate-900">In Progress</option>
              <option value="COMPLETED" className="dark:bg-slate-900">Completed (Verified)</option>
              <option value="QUERY_RAISED" className="dark:bg-slate-900">Query Raised</option>
              <option value="NA" className="dark:bg-slate-900">N/A (Not Applicable)</option>
            </select>
          </div>

          {/* Performer / Maker Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-500">Maker:</span>
            <select
              value={makerFilter}
              onChange={(e) => setMakerFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-900">All Roles</option>
              <option value="ASST" className="dark:bg-slate-900">ASST (Assistant)</option>
              <option value="ASST_COORD" className="dark:bg-slate-900">ASST_COORD (Asst. Coord)</option>
              <option value="COORD" className="dark:bg-slate-900">COORD (Coordinator)</option>
              <option value="AR" className="dark:bg-slate-900">AR (Asst. Registrar)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity name or #..."
              className="w-52 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={14} />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Progress & Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="font-bold text-slate-900 dark:text-white text-xs">
                {stats.completed} / {activities.length - stats.na} Done ({stats.pct}%)
              </div>
              <div className="text-[10px] text-slate-400">
                {stats.queryRaised > 0 && <span className="text-red-500 font-bold mr-1">⚠️ {stats.queryRaised} Queries</span>}
                {stats.inProgress} in progress • {stats.pending} pending
              </div>
            </div>
            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              title="Expand all phases"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              title="Collapse all phases"
            >
              Collapse
            </button>
            <button
              onClick={() => exportCurrentViewExcel(filteredActivities, currentLogs, context, headerMetrics)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold transition"
              title="Export Current View to Excel (.xlsx)"
            >
              <Icon name="download" size={13} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activities Grouped By Phase */}
      <div className="space-y-4">
        {phases.map(phaseName => {
          const phaseActs = filteredActivities.filter(a => a.phase === phaseName);
          if (phaseActs.length === 0) return null;

          const isCollapsed = !!collapsedPhases[phaseName];
          const phaseTotal = phaseActs.length;
          const phaseDone = phaseActs.filter(a => computeActivityStatus(a, currentLogs[a.id], context.semester) === "COMPLETED").length;
          const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;

          return (
            <div
              key={phaseName}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
            >
              {/* Collapsible Phase Header */}
              <div
                onClick={() => togglePhase(phaseName)}
                className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={isCollapsed ? "chevron-right" : "chevron-down"}
                    size={16}
                    className="text-slate-400 transition"
                  />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{phaseName}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                        {phaseDone} / {phaseTotal} Completed ({phasePct}%)
                      </span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {isCollapsed ? "Click to view rows" : "Hide rows"}
                  </span>
                </div>
              </div>

              {/* Table */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            onChange={handleSelectAllVisible}
                            checked={selectedIds.length > 0 && selectedIds.length === filteredActivities.length}
                            disabled={isZeroStudents}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </th>
                        <th className="py-2.5 px-2 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[280px]">Activity Name & Phase</th>
                        <th className="py-2.5 px-2 w-20 text-center">Maker</th>
                        <th className="py-2.5 px-2 w-14 text-center">N/A</th>
                        <th className="py-2.5 px-3 min-w-[190px]">Performed Date & Value</th>
                        <th className="py-2.5 px-2 min-w-[110px] text-center bg-indigo-50/40 dark:bg-indigo-950/20">ASST_COORD</th>
                        <th className="py-2.5 px-2 min-w-[110px] text-center bg-purple-50/40 dark:bg-purple-950/20">COORD</th>
                        <th className="py-2.5 px-2 min-w-[110px] text-center bg-amber-50/40 dark:bg-amber-950/20">AR</th>
                        <th className="py-2.5 px-2 min-w-[110px] text-center bg-blue-50/40 dark:bg-blue-950/20">DY_COE</th>
                        <th className="py-2.5 px-2 min-w-[110px] text-center bg-emerald-50/40 dark:bg-emerald-950/20">COE</th>
                        <th className="py-2.5 px-3 w-28 text-center">Status</th>
                        <th className="py-2.5 px-2 w-20 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {phaseActs.map(act => {
                        const log = currentLogs[act.id] || {};
                        const status = computeActivityStatus(act, log, context.semester);
                        const isSelected = selectedIds.includes(act.id);
                        const isQuery = status === "QUERY_RAISED";
                        const isNA = !!log.isNA;
                        const isSkipped = status === "SKIPPED";
                        const isCurrentUserMaker = currentUser.isAdmin || currentUser.role === act.performedBy;

                        // Row background styling
                        let rowBg = "hover:bg-slate-50/80 dark:hover:bg-slate-800/40";
                        if (isQuery) rowBg = "bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70";
                        else if (status === "COMPLETED") rowBg = "bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60";
                        else if (isNA || isSkipped) rowBg = "opacity-60 bg-slate-50/50 dark:bg-slate-900/50";

                        return (
                          <tr key={act.id} className={`${rowBg} transition`}>
                            {/* Checkbox */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(act.id)}
                                disabled={isZeroStudents}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>

                            {/* Sr No */}
                            <td className="py-2 px-2 text-center font-mono text-slate-500 font-bold">
                              {act.srNo}
                            </td>

                            {/* Name & Badges */}
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                                {act.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {act.cond !== "ALL" && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                    {act.cond === "EVEN_ONLY" ? "Even Sem Only" : "Final Sem Only"}
                                  </span>
                                )}
                                {isSkipped && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    Skipped in {context.semester}
                                  </span>
                                )}
                                {isQuery && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                                    <Icon name="alert-triangle" size={10} />
                                    Query Active
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Maker Role */}
                            <td className="py-2 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                act.performedBy === 'ASST' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                act.performedBy === 'ASST_COORD' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' :
                                act.performedBy === 'COORD' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' :
                                'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}>
                                {act.performedBy}
                              </span>
                            </td>

                            {/* N/A Toggle */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                disabled={isZeroStudents}
                                onClick={() => handleUpdateField(act.id, 'isNA', !isNA)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  isZeroStudents ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' :
                                  isNA
                                    ? 'bg-slate-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700'
                                }`}
                                title={isZeroStudents ? "Locked (0 students)" : isNA ? "Mark as Applicable" : "Mark as Not Applicable (N/A)"}
                              >
                                {isNA ? "N/A" : "App"}
                              </button>
                            </td>

                            {/* Performed Date & Input */}
                            <td className="py-2 px-3">
                              {isNA ? (
                                <span className="text-slate-400 italic text-[11px]">Not Applicable</span>
                              ) : isSkipped ? (
                                <span className="text-slate-400 italic text-[11px]">Condition Not Met</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="date"
                                      disabled={isZeroStudents || !isCurrentUserMaker}
                                      value={log.performedDate || ""}
                                      onChange={(e) => handleSetPerformedDate(act, e.target.value)}
                                      className={`px-2 py-1 text-xs rounded-lg border focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white ${
                                        isZeroStudents || !isCurrentUserMaker
                                          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed text-slate-500'
                                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                                      }`}
                                    />
                                    {isCurrentUserMaker && !isZeroStudents && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPerformedDate(act, getTodayYYYYMMDD())}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 transition"
                                        title="Set Performed Date to Today"
                                      >
                                        Today
                                      </button>
                                    )}
                                  </div>

                                  {/* Value / Remarks Row */}
                                  <div className="flex flex-wrap items-center gap-1 text-[11px] mt-1">
                                    <input
                                      type="text"
                                      disabled={isZeroStudents || !isCurrentUserMaker}
                                      value={log.metricValue || ""}
                                      onChange={(e) => handleUpdateField(act.id, 'metricValue', e.target.value)}
                                      placeholder="Value / Timing (opt)..."
                                      className="w-24 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <input
                                      type="text"
                                      disabled={isZeroStudents}
                                      value={log.remarks || ""}
                                      onChange={(e) => handleUpdateField(act.id, 'remarks', e.target.value)}
                                      placeholder="Remarks (opt)..."
                                      className="w-28 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Remarks (exported to Excel)"
                                    />
                                    {log.performedByUser && (
                                      <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={`By ${log.performedByUser.name}`}>
                                        by {log.performedByUser.name.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Dynamic Verification Columns */}
                            {['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE'].map(role => {
                              // Is maker this role or higher?
                              const makerRank = ROLE_RANKS[act.performedBy];
                              const colRank = ROLE_RANKS[role];
                              const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > (ROLE_RANKS[act.performedBy] ?? -1));
                              const isRequired = reqs.includes(role);

                              if (colRank <= makerRank) {
                                return (
                                  <td key={role} className="py-2 px-2 text-center text-[10px] text-slate-400 italic">
                                    — (Maker)
                                  </td>
                                );
                              }

                              if (!isRequired) {
                                return (
                                  <td key={role} className="py-2 px-2 text-center text-[10px] text-slate-300 dark:text-slate-700 italic">
                                    — (Not Req)
                                  </td>
                                );
                              }

                              // Is verified?
                              const verif = log.verifications?.[role];
                              if (verif && verif.verified) {
                                const canRevoke = currentUser.isAdmin || currentUser.role === role;
                                return (
                                  <td key={role} className="py-2 px-2 text-center">
                                    <div className="group relative inline-block">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm cursor-help">
                                        <Icon name="check" size={11} className="text-emerald-600 dark:text-emerald-400" />
                                        <span>{formatDateDisplay(verif.date)}</span>
                                      </span>
                                      
                                      {/* Tooltip / Revoke on hover */}
                                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-2 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl border border-slate-700 whitespace-nowrap z-20">
                                        <div className="font-bold">Verified by {verif.userName}</div>
                                        <div className="text-slate-400">{verif.userEmail}</div>
                                        {canRevoke && !isZeroStudents && (
                                          <button
                                            type="button"
                                            onClick={() => handleUnverify(act, role)}
                                            className="mt-1.5 px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[9px] block w-full text-center"
                                          >
                                            Revoke Verification
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              // Awaiting maker?
                              if (!log.performedDate) {
                                return (
                                  <td key={role} className="py-2 px-2 text-center text-[10px] text-slate-400 italic">
                                    Awaiting Maker
                                  </td>
                                );
                              }

                              // Check previous required tier in sanitized chain
                              const roleIndex = reqs.indexOf(role);
                              const prevRole = roleIndex > 0 ? reqs[roleIndex - 1] : null;
                              const isPrevDone = !prevRole || !!log.verifications?.[prevRole]?.verified;

                              if (!isPrevDone) {
                                return (
                                  <td key={role} className="py-2 px-2 text-center text-[10px] text-slate-400 italic">
                                    Awaiting {prevRole}
                                  </td>
                                );
                              }

                              // Ready for verification! Does current user match role or admin?
                              const canUserSign = currentUser.isAdmin || currentUser.role === role;

                              if (canUserSign) {
                                if (isZeroStudents) {
                                  return (
                                    <td key={role} className="py-2 px-2 text-center">
                                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-semibold cursor-not-allowed" title="Activities locked: 0 students enrolled">
                                        Locked (0 Stu)
                                      </span>
                                    </td>
                                  );
                                }
                                return (
                                  <td key={role} className="py-2 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleVerify(act, role)}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-sm hover:shadow transition flex items-center justify-center gap-1 mx-auto"
                                      title={`Sign off as ${role}`}
                                    >
                                      <Icon name="check" size={11} />
                                      <span>Verify</span>
                                    </button>
                                  </td>
                                );
                              }

                              return (
                                <td key={role} className="py-2 px-2 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    Pending {role}
                                  </span>
                                </td>
                              );
                            })}

                            {/* Status Badge */}
                            <td className="py-2 px-3 text-center">
                              {status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Completed
                                </span>
                              ) : status === 'IN_PROGRESS' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  In Progress
                                </span>
                              ) : status === 'QUERY_RAISED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Query Active
                                </span>
                              ) : status === 'NA' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  N/A
                                </span>
                              ) : status === 'SKIPPED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                                  Skipped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Actions / Query & History Buttons */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={isZeroStudents}
                                  onClick={() => !isZeroStudents && onOpenQueryModal(act, log)}
                                  className={`p-1.5 rounded-lg transition ${
                                    isZeroStudents
                                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                                      : isQuery
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 hover:bg-rose-200'
                                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                  title={isZeroStudents ? "Locked (0 students enrolled)" : isQuery ? "View / Resolve Query" : "Raise Verification Query"}
                                >
                                  <Icon name="flag" size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryModalAct({ act, log })}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition"
                                  title="View Chronological Audit History Trail"
                                >
                                  <Icon name="clock" size={14} />
                                  {log.history && log.history.length > 0 && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && !isZeroStudents && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in duration-200">
          <span className="text-xs font-bold bg-indigo-600 px-2.5 py-1 rounded-xl">
            {selectedIds.length} Selected
          </span>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleBulkSetPerformed}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition"
            >
              Set Performed (Today)
            </button>
            <button
              onClick={handleBulkVerify}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition flex items-center gap-1.5"
            >
              <Icon name="check" size={14} />
              <span>Bulk Verify ({currentUser.role})</span>
            </button>
            <button
              onClick={() => handleBulkToggleNA(true)}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition"
            >
              Mark N/A
            </button>
            <button
              onClick={() => handleBulkToggleNA(false)}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition"
            >
              Mark Applicable
            </button>
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            title="Deselect All"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
      {/* Activity History Viewer Modal */}
      {historyModalAct && (
        <ActivityHistoryModal
          activity={historyModalAct.act}
          log={currentLogs[historyModalAct.act.id] || historyModalAct.log}
          onClose={() => setHistoryModalAct(null)}
        />
      )}
    </div>
  );
}
