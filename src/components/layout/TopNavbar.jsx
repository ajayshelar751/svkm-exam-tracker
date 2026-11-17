import React from 'react';
import Icon from '../common/Icon.jsx';

export default function TopNavbar({
  currentUser,
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  cloudStatus,
  syncError,
  onRetrySync,
  actionQueueCount,
  onOpenPasswordModal,
  onOpenAuditModal,
  onOpenCloudModal,
  onSignOut
}) {
  const canViewDashboard = currentUser.isAdmin || ['COE', 'DY_COE', 'AR'].includes(currentUser.role);
  const canViewAdmin = !!currentUser.isAdmin;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm no-print">
      <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left: Branding & Cloud Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight uppercase">
                  SVKM's CED
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  COE Portal
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
                Examination Activity & Multi-Level Verification
              </div>
            </div>
          </div>

          {/* Cloud Indicator Pill & Sync Warning (Admin Only) */}
          {canViewAdmin && (
            <>
              <button
                onClick={onOpenCloudModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
                title="Click to view cloud connection & sync status"
              >
                {cloudStatus === 'CONNECTED' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium hidden sm:inline">
                      Connected
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium sm:hidden">
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-amber-700 dark:text-amber-300 font-medium hidden sm:inline">
                      Local Fallback Mode
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 font-medium sm:hidden">
                      Fallback
                    </span>
                  </>
                )}
              </button>

              {/* Unsynced / Retry Warning Badge */}
              {syncError && (
                <button
                  onClick={onRetrySync}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition animate-bounce"
                  title="Cloud write error occurred. Click to retry synchronization."
                >
                  <Icon name="refresh-cw" size={12} />
                  <span>Unsynced / Retry</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Center: Main View Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'tracker'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon name="layers" size={15} />
            <span>Activity Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon name="check-square" size={15} />
            <span>My Action Queue</span>
            {actionQueueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                {actionQueueCount}
              </span>
            )}
          </button>

          {canViewDashboard && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon name="bar-chart-3" size={15} />
              <span>Dashboard</span>
            </button>
          )}

          {canViewAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon name="settings" size={15} />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2">
          {/* Quick A4 Report Button */}
          <button
            onClick={onOpenAuditModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            title="Generate Official Print-Ready Compliance Audit Certificate"
          >
            <Icon name="printer" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Audit Report</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={onOpenPasswordModal}
              className="text-left group flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Click to change password"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {currentUser.role}
                </div>
              </div>
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <Icon name="log-out" size={15} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
