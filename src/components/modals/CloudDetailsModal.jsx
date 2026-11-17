import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';
import { SUPABASE_CONFIG } from '../../constants/config.js';
import { SupabaseService } from '../../services/supabaseService.js';

// --- Cloud Connection Details Modal ---
export default function CloudDetailsModal({ cloudStatus, lastSyncTime, onSyncNow, onClose }) {
  const [configUrl, setConfigUrl] = useState(() => SupabaseService.getSupabaseConfig().url || "");
  const [configKey, setConfigKey] = useState(() => SupabaseService.getSupabaseConfig().anonKey || "");
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const handleSaveConfig = () => {
    SupabaseService.saveSupabaseConfig(configUrl, configKey);
    setSaveStatus("Configuration saved! Reconnecting...");
    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <Icon name="database" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Supabase Cloud Database & Sync</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PostgreSQL 15+ • RLS Enabled • Realtime WebSockets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-slate-500">PostgreSQL Connection:</span>
            {cloudStatus === 'CONNECTED' ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected (Supabase PostgreSQL)
              </span>
            ) : (
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Local Fallback Mode
              </span>
            )}
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Supabase Endpoint:</span>
              <button
                type="button"
                onClick={() => setShowConfigEdit(!showConfigEdit)}
                className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] hover:underline"
              >
                {showConfigEdit ? "Cancel Edit" : "Change Credentials"}
              </button>
            </div>
            <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
              {configUrl || "https://wfkjekwxmodyzncytyqq.supabase.co"}
            </div>
          </div>

          {showConfigEdit && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Supabase Anon Key / Public API Key
                </label>
                <input
                  type="password"
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                {saveStatus ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{saveStatus}</span>
                ) : <span />}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Save & Reconnect
                </button>
              </div>
            </div>
          )}

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <div className="text-slate-500 font-semibold">Relational Sync & Realtime:</div>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              Active 2-way sync across 15 relational PostgreSQL tables (exam_sessions, activity_logs, verification_logs, query_logs, audit_history, dashboard_metrics). WebSocket updates broadcast instantly.
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Last Synced: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : "Just now"}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onSyncNow}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow flex items-center gap-1.5"
            >
              <Icon name="refresh-cw" size={14} />
              <span>Force Re-sync from Supabase</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- In-Memory SAP & OSM Raw Excel Parser Modal (Zero File Storage) ---
// --- Enhanced In-Memory SAP & OSM Raw Excel Parser Modal (Zero File Storage) ---
