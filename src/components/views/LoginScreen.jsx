import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';
import { verifyPassword } from '../../utils/crypto.js';
import { SupabaseService } from '../../services/supabaseService.js';

// --- Login Screen ---
export default function LoginScreen({ users, onLogin, hideDemoLogins }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      setError("User not found with this email ID.");
      return;
    }
    if (!user.active) {
      setError("This account is currently deactivated. Please contact the administrator.");
      return;
    }
    try {
      const authResult = await SupabaseService.login(email, password, user);
      if (authResult.success) {
        onLogin(authResult.user || user);
      } else {
        setError(authResult.error || "Invalid password. Please check your credentials.");
      }
    } catch(err) {
      setError("Authentication error. Please retry.");
    }
  };

  const handleDemoSelect = (demoUser) => {
    setEmail(demoUser.email);
    setPassword("Pass@123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-3">
            <Icon name="shield" size={32} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            Shri Vile Parle Kelavani Mandal
          </h1>
          <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">
            Controller of Examinations Division (CED)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Examination Activity Tracker & Multi-Level Verification Portal
          </p>
        </div>

        {/* Demo Quick-Login Pills */}
        {!hideDemoLogins && (
          <div className="mb-6 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Icon name="key" size={13} className="text-indigo-600 dark:text-indigo-400" />
                Quick-Fill Demo Staff Accounts (Password: Pass@123)
              </span>
              <span className="text-[10px] text-slate-400">One-click testing</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoSelect({ email: "alka.shukla@svkm.ac.in" })}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition"
              >
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Ms. Alka Shukla</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 px-1 rounded">COE</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">alka.shukla@svkm.ac.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect({ email: "rupesh.mundada@svkm.ac.in" })}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition"
              >
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Dr. Rupesh Mundada</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-1 rounded">DY_COE</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">rupesh.mundada@svkm.ac.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect({ email: "ajay.shelar@svkm.ac.in" })}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-sm transition"
              >
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Mr. Ajay Shelar</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 px-1 rounded">AR / Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">ajay.shelar@svkm.ac.in</div>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Registered Email ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="user" size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff.name@svkm.ac.in"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Portal Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="lock" size={16} />
              </div>
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name={showPass ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition flex items-center justify-center gap-2 mt-2"
          >
            <Icon name="lock" size={16} />
            <span>Sign In to Examination Portal</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-[11px]">
          SVKM Exam Activity Portal • Role-Based Multi-Tier Verification • v2.5 Enterprise
        </div>
      </div>
    </div>
  );
}
