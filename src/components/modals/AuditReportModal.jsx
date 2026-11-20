import React, { useState, useMemo } from 'react';
import Icon from '../common/Icon.jsx';
import { INITIAL_PHASES } from '../../constants/config.js';
import {
  computeActivityStatus,
  formatDateDisplay,
  isActivityApplicableForCycle,
  formatExamMonthYear
} from '../../utils/helpers.js';

export default function AuditReportModal({
  activities,
  currentLogs,
  context,
  headerMetrics,
  users,
  config,
  onClose
}) {
  const [includeFullChecklist, setIncludeFullChecklist] = useState(true);

  // Scoped strictly to activities applicable to this examCycle
  const cycleActivities = useMemo(() => {
    return activities.filter(act => isActivityApplicableForCycle(act, context.examCycle));
  }, [activities, context.examCycle]);

  const phases = useMemo(() => {
    const list = config?.phases && config.phases.length > 0 ? [...config.phases] : [...INITIAL_PHASES];
    cycleActivities.forEach(a => {
      if (a.phase && !list.includes(a.phase)) list.push(a.phase);
    });
    return list.filter(p => cycleActivities.some(a => a.phase === p));
  }, [cycleActivities, config?.phases]);

  const phaseBreakdown = useMemo(() => {
    return phases.map(ph => {
      const acts = cycleActivities.filter(a => a.phase === ph);
      let done = 0;
      acts.forEach(a => {
        const log = currentLogs[a.id] || {};
        if (computeActivityStatus(a, log, context.semester) === "COMPLETED") done++;
      });
      const pct = acts.length > 0 ? Math.round((done / acts.length) * 100) : 0;
      return { phase: ph, total: acts.length, done, pct };
    });
  }, [phases, cycleActivities, currentLogs, context.semester]);

  const isReExam = context.examCycle === "Re-Exam";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex justify-center p-2 sm:p-6 print:p-0 print:bg-white">
      <div className="printable-audit-report w-full max-w-4xl bg-white text-black p-8 rounded-2xl shadow-2xl print:shadow-none print:p-0 print:max-w-none font-serif">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-sans font-bold shadow flex items-center gap-2"
            >
              <Icon name="printer" size={16} />
              <span>Print Official A4 Report / Save PDF</span>
            </button>
            <label className="flex items-center gap-2 text-xs font-sans text-slate-700 ml-4 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFullChecklist}
                onChange={(e) => setIncludeFullChecklist(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Include All Applicable ({cycleActivities.length}) Activities in Print</span>
            </label>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-sans"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* --- Formal Report Header --- */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <div className="text-xs uppercase tracking-widest font-bold">Shri Vile Parle Kelavani Mandal</div>
          <div className="text-lg font-bold uppercase tracking-wider mt-0.5">Controller of Examinations Division (CED)</div>
          <div className="text-sm font-semibold uppercase tracking-wide mt-0.5 underline">
            Examination Process Compliance &amp; Multi-Tier Audit Verification Certificate
          </div>
        </div>

        {/* Metadata Context Box */}
        <div className="border border-black p-3 mb-4 text-xs leading-relaxed">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><strong>College / Institution:</strong> {context.college} College</div>
            <div><strong>Batch (Academic Year):</strong> {context.batch}</div>
            {isReExam && (
              <div><strong>Appearing Batches:</strong> {headerMetrics.appearingBatches || "Current + Prior Batches"}</div>
            )}
            <div><strong>Exam Month &amp; Year:</strong> {headerMetrics.examMonthYear || formatExamMonthYear(headerMetrics.examStartDate) || (isReExam ? (formatExamMonthYear(currentLogs["act_135"]?.performedDate) || formatExamMonthYear(currentLogs["act_23"]?.performedDate)) : (formatExamMonthYear(currentLogs["act_23"]?.performedDate) || formatExamMonthYear(currentLogs["act_135"]?.performedDate))) || "N/A"}</div>
            {headerMetrics.examStartDate && (
              <div><strong>Exam Start Date:</strong> {headerMetrics.examStartDate}</div>
            )}
            {headerMetrics.examEndDate && (
              <div><strong>Exam End Date:</strong> {headerMetrics.examEndDate}</div>
            )}
            <div><strong>Program / Course:</strong> {context.program}</div>
            <div><strong>Semester &amp; Cycle:</strong> {context.semester} • {context.examCycle} Examination</div>
            <div><strong>Audit Inspection Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div><strong>Report Authority:</strong> CED Multi-Tier Compliance Cell</div>
          </div>
        </div>

        {/* Executive Session Metrics Table */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase mb-1">1. Session Summary &amp; Student Integrity Statistics</div>
          <table className="w-full text-xs border border-black border-collapse text-center">
            <thead>
              <tr className="bg-slate-100 border-b border-black font-bold">
                {isReExam ? (
                  <>
                    <th className="border-r border-black p-1.5">Total Appearing Students</th>
                    <th className="border-r border-black p-1.5">Reg Batch Students</th>
                    <th className="border-r border-black p-1.5">Prev. Year (Ex) Students</th>
                  </>
                ) : (
                  <th className="border-r border-black p-1.5">Total Registered Students</th>
                )}
                <th className="border-r border-black p-1.5">PWD Students (Writer / Comp. Time)</th>
                <th className="border-r border-black p-1.5">Debarred Students</th>
                <th className="border-r border-black p-1.5">UFM Pending Cases</th>
                <th className="p-1.5">Modules (WRIT)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {isReExam ? (
                  <>
                    <td className="border-r border-black p-2 font-bold">{headerMetrics.totalStudents || ((headerMetrics.regBatchStudents || 0) + (headerMetrics.prevBatchStudents || 0))}</td>
                    <td className="border-r border-black p-2 font-bold">{headerMetrics.regBatchStudents || 0}</td>
                    <td className="border-r border-black p-2 font-bold">{headerMetrics.prevBatchStudents || 0}</td>
                  </>
                ) : (
                  <td className="border-r border-black p-2 font-bold">{headerMetrics.totalStudents || 0}</td>
                )}
                <td className="border-r border-black p-2 font-bold">{headerMetrics.pwdStudents || 0}</td>
                <td className="border-r border-black p-2 font-bold">{headerMetrics.debarredStudents || 0}</td>
                <td className="border-r border-black p-2 font-bold">{headerMetrics.ufmCases || 0}</td>
                <td className="p-2 font-bold">{headerMetrics.numModules || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Phase-wise Compliance Breakdown Table */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase mb-1">2. Phase-by-Phase Process Verification Breakdown ({context.examCycle} Scope)</div>
          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black font-bold text-center">
                <th className="border-r border-black p-1.5 text-left">Examination Phase</th>
                <th className="border-r border-black p-1.5 w-24">Applicable Tasks</th>
                <th className="border-r border-black p-1.5 w-24">Completed</th>
                <th className="border-r border-black p-1.5 w-24">Compliance %</th>
                <th className="p-1.5 w-28">Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {phaseBreakdown.map((pb) => (
                <tr key={pb.phase} className="border-b border-black text-center">
                  <td className="border-r border-black p-1.5 text-left font-semibold">
                    {pb.phase}
                  </td>
                  <td className="border-r border-black p-1.5">{pb.total}</td>
                  <td className="border-r border-black p-1.5 font-bold">{pb.done}</td>
                  <td className="border-r border-black p-1.5 font-bold">{pb.pct}%</td>
                  <td className="p-1.5 font-bold">
                    {pb.pct === 100 ? "FULLY VERIFIED" : pb.pct >= 75 ? "SUBSTANTIAL" : "IN PROGRESS"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Optional Applicable Activity Checklist */}
        {includeFullChecklist && (
          <div className="mb-6 page-break-before">
            <div className="text-xs font-bold uppercase mb-1">3. Detailed Chronological Activity Sign-Off Log ({cycleActivities.length} Activities)</div>
            <table className="w-full text-[10px] border border-black border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-black font-bold text-center">
                  <th className="border-r border-black p-1 w-8">#</th>
                  <th className="border-r border-black p-1 text-left">Activity Description</th>
                  <th className="border-r border-black p-1 w-12">Maker</th>
                  <th className="border-r border-black p-1 w-20">Performed Date</th>
                  <th className="border-r border-black p-1 w-20">Sign-off Status</th>
                  <th className="p-1 w-20">Audit State</th>
                </tr>
              </thead>
              <tbody>
                {cycleActivities.map(act => {
                  const log = currentLogs[act.id] || {};
                  const status = computeActivityStatus(act, log, context.semester);
                  return (
                    <tr key={act.id} className="border-b border-slate-300">
                      <td className="border-r border-black p-1 text-center font-bold">{act.srNo}</td>
                      <td className="border-r border-black p-1">{act.name}</td>
                      <td className="border-r border-black p-1 text-center">{act.performedBy}</td>
                      <td className="border-r border-black p-1 text-center font-mono">
                        {log.performedDate ? formatDateDisplay(log.performedDate) : "—"}
                      </td>
                      <td className="border-r border-black p-1 text-center text-[9px]">
                        {log.verifications?.COE?.verified ? "COE Verified" :
                         log.verifications?.DY_COE?.verified ? "Dy. COE Done" :
                         log.verifications?.AR?.verified ? "AR Verified" :
                         log.verifications?.COORD?.verified ? "Coord Verified" :
                         log.verifications?.ASST_COORD?.verified ? "AC Verified" :
                         log.performedDate ? "Maker Done" : "Pending"}
                      </td>
                      <td className="p-1 text-center font-bold text-[9px]">
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Formal Institutional Sign-Off Block (5 Columns) */}
        <div className="mt-8 pt-4 border-t-2 border-black page-break-inside-avoid">
          <div className="text-center text-xs font-bold uppercase tracking-wider mb-6">
            Institutional Verification Sign-Off &amp; Approvals
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
            {/* Assistant */}
            <div className="border border-black p-2 flex flex-col justify-between h-28">
              <div className="font-bold border-b border-black pb-1">Assistant (Exam Cell)</div>
              <div className="text-[9px] text-slate-500 italic">Signature &amp; Seal</div>
              <div className="border-t border-black pt-1">
                <div>Date: _________</div>
              </div>
            </div>

            {/* Coordinator */}
            <div className="border border-black p-2 flex flex-col justify-between h-28">
              <div className="font-bold border-b border-black pb-1">Coordinator (Exam Cell)</div>
              <div className="text-[9px] text-slate-500 italic">Signature &amp; Seal</div>
              <div className="border-t border-black pt-1">
                <div>Date: _________</div>
              </div>
            </div>

            {/* Assistant Registrar */}
            <div className="border border-black p-2 flex flex-col justify-between h-28">
              <div className="font-bold border-b border-black pb-1">Assistant Registrar</div>
              <div className="font-semibold text-[10px]">
                {users?.find(u => u.role === 'AR' && (u.assignedColleges?.includes('ALL') || u.assignedColleges?.includes(context.college)))?.name || "Assistant Registrar"}
              </div>
              <div className="border-t border-black pt-1">
                <div>Date: _________</div>
              </div>
            </div>

            {/* Deputy COE */}
            <div className="border border-black p-2 flex flex-col justify-between h-28">
              <div className="font-bold border-b border-black pb-1">Deputy COE</div>
              <div className="font-semibold text-[10px]">Dr. Rupesh Mundada</div>
              <div className="border-t border-black pt-1">
                <div>Date: _________</div>
              </div>
            </div>

            {/* Controller of Examinations */}
            <div className="border border-black p-2 flex flex-col justify-between h-28">
              <div className="font-bold border-b border-black pb-1">Controller of Exams</div>
              <div className="font-semibold text-[10px]">Ms. Alka Shukla</div>
              <div className="border-t border-black pt-1">
                <div>Date: _________</div>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-center text-slate-500 mt-4">
            Certified that the above examination processes have been executed and verified in compliance with SVKM &amp; University Guidelines.
          </div>
        </div>

      </div>
    </div>
  );
}
