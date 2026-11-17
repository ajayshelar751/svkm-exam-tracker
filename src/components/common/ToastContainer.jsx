import React from 'react';
import Icon from './Icon.jsx';

export default function ToastContainer({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none no-print">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : t.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : t.type === 'warning'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-slate-900 text-white dark:bg-slate-800 border-slate-700'
          }`}
        >
          <Icon
            name={t.type === 'success' ? 'check-circle' : t.type === 'error' ? 'alert-triangle' : t.type === 'warning' ? 'alert-circle' : 'help-circle'}
            size={16}
          />
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => onCloseToast(t.id)}
            className="opacity-70 hover:opacity-100 p-0.5 rounded transition"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
