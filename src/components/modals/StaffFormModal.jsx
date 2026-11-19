import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';

// --- Staff Form Modal ---
export default function StaffFormModal({ user, users = [], config, showToast, onClose, onSave }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState(() => {
    const raw = user?.password;
    if (!raw || raw.startsWith("sha256:") || raw.startsWith("fb:")) {
      return "Pass@123";
    }
    return raw;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(user?.role || "ASST");
  const [isAdmin, setIsAdmin] = useState(!!user?.isAdmin);
  const validCollegeIds = (config.colleges || []).map(c => c.id);
  const [assignedColleges, setAssignedColleges] = useState(() => {
    if (!user?.assignedColleges) return [];
    return user.assignedColleges.filter(id => id === 'ALL' || validCollegeIds.includes(id));
  });
  const [assignedPrograms, setAssignedPrograms] = useState(() => {
    const raw = user?.assignedPrograms || {};
    const initial = {};
    validCollegeIds.forEach(colId => {
      if (raw[colId] && Array.isArray(raw[colId]) && raw[colId].length > 0) {
        initial[colId] = raw[colId];
      } else if (raw['ALL']?.includes('ALL')) {
        initial[colId] = ['ALL'];
      } else {
        initial[colId] = ['ALL'];
      }
    });
    return initial;
  });
  const [active, setActive] = useState(user?.active !== false);

  // Institutional Rule: Only 1 Controller of Examination (COE) is allowed across the entire institution
  const existingCoe = (users || []).find(u => u.role === "COE" && u.active !== false);
  const isEditingCurrentCoe = Boolean(user && (user.id === existingCoe?.id || user.role === "COE"));

  const targetColleges = assignedColleges.includes('ALL')
    ? validCollegeIds
    : assignedColleges.filter(id => validCollegeIds.includes(id));

  const toggleCollege = (colId) => {
    if (assignedColleges.includes(colId)) {
      setAssignedColleges(assignedColleges.filter(c => c !== colId));
    } else {
      setAssignedColleges([...assignedColleges, colId]);
    }
  };

  const toggleCollegeProgAll = (colId, availableProgs) => {
    setAssignedPrograms(prev => {
      const cur = (prev[colId] && prev[colId].length > 0) ? prev[colId] : ['ALL'];
      const next = { ...prev };
      if (cur.includes('ALL')) {
        next[colId] = [...availableProgs];
      } else {
        next[colId] = ['ALL'];
      }
      return next;
    });
  };

  const toggleSpecificProgram = (colId, prog, availableProgs) => {
    setAssignedPrograms(prev => {
      const next = { ...prev };
      let cur = (next[colId] && next[colId].length > 0) ? next[colId] : ['ALL'];
      if (cur.includes('ALL')) {
        cur = availableProgs.filter(p => p !== prog);
      } else if (cur.includes(prog)) {
        cur = cur.filter(p => p !== prog);
      } else {
        cur = [...cur, prog];
      }
      next[colId] = cur;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    // Strict Institutional Rule: Exactly 1 COE
    if (role === "COE" && existingCoe && existingCoe.id !== user?.id) {
      if (showToast) showToast("Institutional Governance Violation: Only one Controller of Examinations is permitted across the institution.", "error");
      return;
    }
    if (user?.role === "COE" && role !== "COE") {
      if (showToast) showToast("Institutional Governance Violation: The active Controller of Examinations cannot be demoted without appointing a successor first.", "error");
      return;
    }
    if (user?.role === "COE" && !active) {
      if (showToast) showToast("Institutional Governance Violation: The Controller of Examinations account cannot be deactivated.", "error");
      return;
    }

    const cleanedPrograms = {};
    if (assignedColleges.includes('ALL')) {
      cleanedPrograms['ALL'] = ['ALL'];
      config.colleges.forEach(c => {
        cleanedPrograms[c.id] = (assignedPrograms[c.id] && assignedPrograms[c.id].length > 0)
          ? assignedPrograms[c.id]
          : ['ALL'];
      });
    } else {
      assignedColleges.forEach(colId => {
        cleanedPrograms[colId] = (assignedPrograms[colId] && assignedPrograms[colId].length > 0)
          ? assignedPrograms[colId]
          : ['ALL'];
      });
    }

    const finalPassword = password.trim() || "Pass@123";

    const savedUser = {
      id: user?.id || `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      password: finalPassword,
      mustChangePassword: user ? (password !== user.password ? false : (user.mustChangePassword || false)) : false,
      role,
      isAdmin,
      assignedColleges,
      assignedPrograms: cleanedPrograms,
      active
    };
    onSave(savedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          {user ? `Edit Staff Account: ${user.name}` : "Create New Staff Account"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address (Login Username)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => setPassword("Pass@123")}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Reset to default (Pass@123)
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. Pass@123"
                className="w-full px-3 py-1.5 pr-9 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={14} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Staff can sign in with this password directly.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role Hierarchy</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              >
                <option value="ASST">ASST (Assistant)</option>
                <option value="ASST_COORD">ASST_COORD (Asst. Coordinator)</option>
                <option value="COORD">COORD (Coordinator)</option>
                <option value="AR">AR (Assistant Registrar)</option>
                <option value="DY_COE">DY_COE (Deputy Controller)</option>
                <option value="COE" disabled={Boolean(existingCoe && !isEditingCurrentCoe)}>
                  COE (Controller of Exams) {existingCoe && !isEditingCurrentCoe ? `[Occupied: ${existingCoe.name}]` : ""}
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">System Admin Flag</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Grant Admin Panel Access</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned College Scope:
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <label className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignedColleges.includes('ALL')}
                  onChange={() => {
                    if (assignedColleges.includes('ALL')) setAssignedColleges([]);
                    else setAssignedColleges(['ALL']);
                  }}
                  className="rounded text-indigo-600"
                />
                <span className="font-bold">ALL Colleges</span>
              </label>
              {config.colleges.map(c => (
                <label key={c.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={assignedColleges.includes('ALL')}
                    checked={assignedColleges.includes(c.id)}
                    onChange={() => toggleCollege(c.id)}
                    className="rounded text-indigo-600"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Granular Per-College Program Assignment */}
          {targetColleges.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Programs Scope (Per College):
                </label>
                <span className="text-[10px] text-slate-400">Toggle ALL or pick degree programs</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {targetColleges.map(colId => {
                  const colObj = config.colleges.find(c => c.id === colId);
                  const colName = colObj ? colObj.name : colId;
                  const availableProgs = config.programs[colId] || [];
                  const curProgs = (assignedPrograms[colId] && assignedPrograms[colId].length > 0)
                    ? assignedPrograms[colId]
                    : ['ALL'];
                  const isAll = curProgs.includes('ALL');

                  return (
                    <div key={colId} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{colName} ({colId})</span>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer text-indigo-600 dark:text-indigo-400">
                          <input
                            type="checkbox"
                            checked={isAll}
                            onChange={() => toggleCollegeProgAll(colId, availableProgs)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>ALL Programs</span>
                        </label>
                      </div>
                      {!isAll && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {availableProgs.map(prog => {
                            const isChecked = curProgs.includes(prog);
                            return (
                              <label key={prog} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] cursor-pointer transition ${
                                isChecked
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSpecificProgram(colId, prog, availableProgs)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 text-[10px]"
                                />
                                <span>{prog}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold">Active Account</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow"
              >
                Save Staff
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
