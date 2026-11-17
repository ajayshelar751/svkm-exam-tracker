import React, { useEffect } from 'react';
import Icon from '../common/Icon.jsx';
import { formatDateDisplay } from '../../utils/helpers.js';

export default function ActivityHistoryModal({ activity, log, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!activity) return null;
  const history = log?.history || [];

  const getActionBadge = (action) => {
    switch (action) {
      case 'PERFORMED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">Performed</span>;
      case 'PERFORM_CLEARED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Date Cleared</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Verified</span>;
      case 'VERIFICATION_REVOKED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Revoked</span>;
      case 'MARKED_NA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Marked N/A</span>;
      case 'MARKED_APPLICABLE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Applicable</span>;
      case 'QUERY_RAISED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Query Raised</span>;
      case 'QUERY_RESOLVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">Query Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
              <Icon name="clock" size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Activity Audit Trail</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">#{activity.srNo}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-md">{activity.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div><span className="text-slate-400">Phase:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{activity.phase}</span></div>
            <div><span className="text-slate-400">Maker Role:</span> <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activity.performedBy}</span></div>
            <div><span className="text-slate-400">Total Audit Logs:</span> <span className="font-bold text-slate-900 dark:text-white">{history.length}</span></div>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Icon name="clock" size={28} className="mx-auto mb-2 opacity-30" />
              <p>No audit history entries recorded for this activity yet.</p>
              <p className="text-[10px] text-slate-500 mt-1">Actions like Performed, Verified, Revoked, and Queries will automatically appear here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {history.slice().reverse().map((entry, idx) => (
                <div key={entry.id || idx} className="relative text-xs">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                  <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getActionBadge(entry.action)}
                        <span className="font-bold text-slate-900 dark:text-white">{entry.userName}</span>
                        <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-mono">{entry.role}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.dateValue && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">Date recorded:</span> <strong className="font-mono">{formatDateDisplay(entry.dateValue)}</strong>
                      </div>
                    )}
                    {entry.details && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                        {entry.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
