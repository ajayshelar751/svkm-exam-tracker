import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';

// --- Query / Flag Modal ---
export default function QueryModal({ activity, log, currentUser, onClose, onSaveQuery, onResolveQuery }) {
  const [reason, setReason] = useState(log?.queryDetails?.reason || "");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const isExistingQuery = !!(log?.queryDetails && !log.queryDetails.resolved);

  const handleRaise = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSaveQuery(activity.id, reason.trim());
    onClose();
  };

  const handleResolve = (e) => {
    e.preventDefault();
    onResolveQuery(activity.id, resolutionNotes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <Icon name="flag" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isExistingQuery ? "Active Verification Query" : "Raise Verification Query / Flag"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Activity #{activity.srNo}: {activity.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Icon name="x" size={18} />
          </button>
        </div>

        {isExistingQuery ? (
          <div className="mt-4 space-y-4">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-red-900 dark:text-red-200 mb-1">
                <span>Raised by: {log.queryDetails.raisedBy} ({log.queryDetails.role})</span>
                <span className="text-[10px] text-red-500">{new Date(log.queryDetails.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap">{log.queryDetails.reason}</p>
            </div>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Notes / Action Taken:
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Corrected the marks report, verified with external examiner..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow flex items-center gap-1.5"
                >
                  <Icon name="check-circle" size={15} />
                  <span>Resolve & Clear Flag</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleRaise} className="space-y-4 mt-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Flagging this activity will set its status to <strong className="text-red-600 dark:text-red-400">QUERY_RAISED</strong> and notify the Maker ({activity.performedBy}) to review and resolve the discrepancy.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Query Reason / Instructions for Maker:
              </label>
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State clearly what is missing or needs correction..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow flex items-center gap-1.5"
              >
                <Icon name="flag" size={15} />
                <span>Raise Query</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
