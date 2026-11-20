import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../common/Icon.jsx';
import { computeUserActionableItems, getTodayYYYYMMDD } from '../../utils/helpers.js';

export default function MyActionQueueView({
  activities,
  contexts,
  currentContextKey,
  config,
  currentUser,
  onNavigateToContext,
  onDirectPerform,
  onDirectVerify,
  onOpenQueryModal
}) {
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [collegeFilter, setCollegeFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState(() => config?.currentBatch || "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);

  // Merge active context so brand new sessions immediately show tasks
  const mergedContexts = useMemo(() => {
    if (currentContextKey && !contexts[currentContextKey]) {
      return {
        ...contexts,
        [currentContextKey]: { headerMetrics: {}, logs: {} }
      };
    }
    return contexts;
  }, [contexts, currentContextKey]);

  // Collect all actionable items across contexts for this user (deduplicated via shared helper)
  const actionableItems = useMemo(() => {
    return computeUserActionableItems(activities, mergedContexts, config, currentUser);
  }, [activities, mergedContexts, config, currentUser]);

  // Distinct colleges and batches in actionable items for scoped filtering
  const availableColleges = useMemo(() => {
    const set = new Set();
    actionableItems.forEach(i => {
      if (i.college) set.add(i.college);
    });
    return Array.from(set).sort();
  }, [actionableItems]);

  const availableBatches = useMemo(() => {
    const set = new Set();
    actionableItems.forEach(i => {
      if (i.batch) set.add(i.batch);
    });
    return Array.from(set).sort().reverse();
  }, [actionableItems]);

  // Filter items based on active criteria
  const filteredItems = useMemo(() => {
    return actionableItems.filter(item => {
      if (queueFilter === "PERFORM" && item.actionType !== "PERFORM") return false;
      if (queueFilter === "VERIFY" && item.actionType !== "VERIFY") return false;
      if (queueFilter === "QUERY" && item.actionType !== "QUERY_RESOLVE") return false;

      if (collegeFilter !== "ALL" && item.college !== collegeFilter) return false;
      if (batchFilter !== "ALL" && item.batch !== batchFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.activity?.name?.toLowerCase().includes(q);
        const matchPhase = item.activity?.phase?.toLowerCase().includes(q);
        const matchProg = item.program?.toLowerCase().includes(q);
        const matchCol = item.college?.toLowerCase().includes(q);
        const matchSem = item.semester?.toLowerCase().includes(q);
        if (!matchName && !matchPhase && !matchProg && !matchCol && !matchSem) return false;
      }

      return true;
    });
  }, [actionableItems, queueFilter, collegeFilter, batchFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [queueFilter, collegeFilter, batchFilter, searchQuery, pageSize]);

  // Pagination bounds
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Paginated slice: Only renders rows for the current page, ensuring instant speed
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedQueueIds.includes(i.id));

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedItems.map(i => i.id));
      setSelectedQueueIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedQueueIds, ...paginatedItems.map(i => i.id)]);
      setSelectedQueueIds(Array.from(newIds));
    }
  };

  const handleBulkQueueVerify = () => {
    const today = getTodayYYYYMMDD();
    selectedQueueIds.forEach(queueId => {
      const item = actionableItems.find(i => i.id === queueId);
      if (item && item.actionType === "VERIFY") {
        onDirectVerify(item.ctxKey, item.activity.id, currentUser.role, today);
      }
    });
    setSelectedQueueIds([]);
  };

  const handleBulkQueuePerform = () => {
    const today = getTodayYYYYMMDD();
    selectedQueueIds.forEach(queueId => {
      const item = actionableItems.find(i => i.id === queueId);
      if (item && item.actionType === "PERFORM") {
        onDirectPerform(item.ctxKey, item.activity.id, today);
      }
    });
    setSelectedQueueIds([]);
  };

  const toggleSelectQueue = (id) => {
    setSelectedQueueIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/30 backdrop-blur-md">
              <Icon name="check-square" size={20} />
            </div>
            <h1 className="text-lg font-bold">My Role Action Queue (Inbox)</h1>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Dedicated queue of examination activities requiring your action as <strong className="text-white">{currentUser.name} ({currentUser.role})</strong> across assigned Colleges & Programs.
          </p>
        </div>

        {/* Action Type Filter Pills */}
        <div className="flex items-center gap-2 text-xs bg-slate-900/40 p-1.5 rounded-xl border border-indigo-700/50">
          <button
            onClick={() => setQueueFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              queueFilter === "ALL" ? "bg-indigo-600 text-white shadow" : "text-indigo-200 hover:text-white"
            }`}
          >
            All Pending ({actionableItems.length})
          </button>
          <button
            onClick={() => setQueueFilter("PERFORM")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              queueFilter === "PERFORM" ? "bg-indigo-600 text-white shadow" : "text-indigo-200 hover:text-white"
            }`}
          >
            To Perform ({actionableItems.filter(i => i.actionType === "PERFORM").length})
          </button>
          <button
            onClick={() => setQueueFilter("VERIFY")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              queueFilter === "VERIFY" ? "bg-indigo-600 text-white shadow" : "text-indigo-200 hover:text-white"
            }`}
          >
            To Verify ({actionableItems.filter(i => i.actionType === "VERIFY").length})
          </button>
          <button
            onClick={() => setQueueFilter("QUERY")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              queueFilter === "QUERY" ? "bg-red-600 text-white shadow" : "text-indigo-200 hover:text-white"
            }`}
          >
            Queries ({actionableItems.filter(i => i.actionType === "QUERY_RESOLVE").length})
          </button>
        </div>
      </div>

      {/* Scoped Controls & Pagination Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity, program, sem..."
              className="w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          {/* College Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-500 uppercase text-[10px]">College:</span>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">All Colleges ({availableColleges.length})</option>
              {availableColleges.map(c => (
                <option key={c} value={c} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">{c}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">All Batches</option>
              {availableBatches.map(b => (
                <option key={b} value={b} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">{b}</option>
              ))}
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value={25} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">25 per page</option>
              <option value={50} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">50 per page</option>
              <option value={100} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">100 per page</option>
              <option value={250} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">250 per page</option>
            </select>
          </div>
        </div>

        {/* Matched Count & Pagination Controls */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-[11px]">
            {totalItems === 0 ? "0 items" : (
              <>
                Showing <strong className="text-slate-900 dark:text-white">{startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900 dark:text-white">{totalItems}</strong>
              </>
            )}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
                title="Previous Page"
              >
                ‹ Prev
              </button>
              <span className="px-2 py-1 text-slate-600 dark:text-slate-300 font-bold font-mono">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
                title="Next Page"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-500">
              <Icon name="check-circle" size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">All caught up!</h3>
            <p className="text-xs">No pending activities match your active filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      onChange={toggleSelectPage}
                      checked={isAllPageSelected}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select / deselect all on this page"
                    />
                  </th>
                  <th className="py-3 px-3">Context (College • Program • Sem)</th>
                  <th className="py-3 px-3">Phase & Activity</th>
                  <th className="py-3 px-3 w-28 text-center">Action Required</th>
                  <th className="py-3 px-3 w-40 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedItems.map(item => {
                  const isSelected = selectedQueueIds.includes(item.id);
                  const isQuery = item.actionType === "QUERY_RESOLVE";

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isQuery ? "bg-red-50/50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectQueue(item.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.college} • {item.program}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.semester} • {item.examCycle} ({item.batch})
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          #{item.activity.srNo}: {item.activity.name}
                        </div>
                        <div className="text-[10px] text-slate-500">{item.activity.phase}</div>
                        {isQuery && (
                          <div className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-medium bg-red-100/70 dark:bg-red-950/60 px-2 py-0.5 rounded-lg inline-block">
                            ⚠️ Query Reason: {item.log.queryDetails.reason}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.actionType === "PERFORM" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300" :
                          item.actionType === "VERIFY" ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300" :
                          "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                        }`}>
                          {item.actionLabel}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.actionType === "PERFORM" && (
                            <button
                              onClick={() => onDirectPerform(item.ctxKey, item.activity.id, getTodayYYYYMMDD())}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1"
                            >
                              <Icon name="check" size={11} />
                              <span>Perform Today</span>
                            </button>
                          )}

                          {item.actionType === "VERIFY" && (
                            <button
                              onClick={() => onDirectVerify(item.ctxKey, item.activity.id, currentUser.role, getTodayYYYYMMDD())}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1"
                            >
                              <Icon name="check" size={11} />
                              <span>Verify Today</span>
                            </button>
                          )}

                          {item.actionType === "QUERY_RESOLVE" && (
                            <button
                              onClick={() => onOpenQueryModal(item.activity, item.log, item.ctxKey)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1"
                            >
                              <Icon name="flag" size={11} />
                              <span>Resolve</span>
                            </button>
                          )}

                          <button
                            onClick={() => onNavigateToContext(item.college, item.batch, item.program, item.semester, item.examCycle)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Jump to Workspace Context"
                          >
                            <Icon name="external-link" size={14} />
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

        {/* Bottom Pagination Footer */}
        {totalPages > 1 && filteredItems.length > 0 && (
          <div className="py-3 px-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page <strong className="text-slate-900 dark:text-white">{safePage}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalItems} total actions)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
              >
                ‹ Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Queue Bulk Actions */}
      {selectedQueueIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4">
          <span className="text-xs font-bold bg-indigo-600 px-2.5 py-1 rounded-xl">
            {selectedQueueIds.length} Selected
          </span>
          <button
            onClick={handleBulkQueueVerify}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-xs transition flex items-center gap-1.5"
          >
            <Icon name="check" size={14} />
            <span>Bulk Verify Selected</span>
          </button>
          <button
            onClick={handleBulkQueuePerform}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold text-xs transition"
          >
            Bulk Perform Selected
          </button>
          <button onClick={() => setSelectedQueueIds([])} className="p-1 text-slate-400 hover:text-white">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
