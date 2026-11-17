import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';
import { ROLE_RANKS } from '../../constants/roles.js';
import { getActivityExamScope } from '../../utils/helpers.js';

// --- Activity Form Modal ---
export default function ActivityFormModal({ activity, phases, activities = [], onClose, onSave }) {
  const [srNo, setSrNo] = useState(activity?.srNo ?? (activities.length ? (activities.length + 8) : 8));
  const [name, setName] = useState(activity?.name || "");
  const [phase, setPhase] = useState(activity?.phase || (phases && phases.length ? phases[0] : ""));
  const [examScope, setExamScope] = useState(activity?.examScope || (activity ? getActivityExamScope(activity) : "REGULAR_ONLY"));
  const [performedBy, setPerformedBy] = useState(activity?.performedBy || "ASST");
  const [cond, setCond] = useState(activity?.cond || "ALL");
  const [requiredVerifiers, setRequiredVerifiers] = useState(activity?.requiredVerifiers || ["ASST_COORD", "COORD", "AR", "DY_COE", "COE"]);

  const toggleVerifier = (role) => {
    if (requiredVerifiers.includes(role)) {
      setRequiredVerifiers(requiredVerifiers.filter(r => r !== role));
    } else {
      setRequiredVerifiers([...requiredVerifiers, role]);
    }
  };

  const handlePhaseChange = (p) => {
    setPhase(p);
    if (!activity) {
      setExamScope(getActivityExamScope({ phase: p }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const makerRank = ROLE_RANKS[performedBy] ?? -1;
    const sanitizedVerifiers = requiredVerifiers.filter(role => (ROLE_RANKS[role] ?? -1) > makerRank);
    onSave({
      ...(activity || {}),
      id: activity?.id || `act_${Date.now()}`,
      srNo: parseInt(srNo, 10) || 999,
      name: name.trim(),
      phase,
      examScope,
      performedBy,
      cond,
      requiredVerifiers: sanitizedVerifiers
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          {activity ? `Edit Activity #${activity.srNo}` : "Add New Examination Activity"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sr. No.</label>
              <input
                type="number"
                required
                min="1"
                value={srNo}
                onChange={(e) => setSrNo(parseInt(e.target.value, 10) || "")}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Activity Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phase</label>
              <select
                value={phase}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              >
                {(phases || []).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Condition</label>
              <select
                value={cond}
                onChange={(e) => setCond(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              >
                <option value="ALL">ALL Semesters</option>
                <option value="EVEN_ONLY">Even Semesters Only</option>
                <option value="FINAL_ONLY">Final Semesters Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Scope
              </label>
              <select
                value={examScope}
                onChange={(e) => setExamScope(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              >
                <option value="REGULAR_ONLY">Regular Exam Only</option>
                <option value="REEXAM_ONLY">Re-Exam Only</option>
                <option value="BOTH">Both (Regular &amp; Re-Exam)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Performed By (Maker Role)
              </label>
              <select
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
              >
                <option value="ASST">ASST (Assistant)</option>
                <option value="ASST_COORD">ASST_COORD (Assistant Coordinator)</option>
                <option value="COORD">COORD (Coordinator)</option>
                <option value="AR">AR (Assistant Registrar)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Required Verification Levels:
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE'].map(role => {
                const isEligible = (ROLE_RANKS[role] ?? -1) > (ROLE_RANKS[performedBy] ?? -1);
                if (!isEligible) return null;
                return (
                  <label key={role} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiredVerifiers.includes(role)}
                      onChange={() => toggleVerifier(role)}
                      className="rounded text-indigo-600"
                    />
                    <span>{role}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
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
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
