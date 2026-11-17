import { ROLE_RANKS } from '../constants/roles.js';

export function normalizeExamCycles(cycles) {
  const valid = ["Regular", "Re-Exam"];
  if (!Array.isArray(cycles) || cycles.length === 0) return [...valid];
  const cleaned = cycles.filter(c => valid.includes(c));
  valid.forEach(v => {
    if (!cleaned.includes(v)) cleaned.push(v);
  });
  return cleaned;
}

export function getActivityExamScope(activity) {
  if (!activity) return "BOTH";
  if (activity.examScope && ["REGULAR_ONLY", "REEXAM_ONLY", "BOTH"].includes(activity.examScope)) {
    return activity.examScope;
  }
  const ph = activity.phase || "";
  if (ph.startsWith("Phase 6")) return "REEXAM_ONLY";
  if (ph.startsWith("Phase 7")) return "BOTH";
  return "REGULAR_ONLY";
}

export function isActivityApplicableForCycle(activity, examCycle) {
  const scope = getActivityExamScope(activity);
  if (scope === "BOTH") return true;
  if (examCycle === "Regular" && scope === "REGULAR_ONLY") return true;
  if (examCycle === "Re-Exam" && scope === "REEXAM_ONLY") return true;
  return false;
}

export function formatExamMonthYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return "";
  const parts = dateStr.trim().split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]}, ${year}`;
    }
  }
  return dateStr;
}

export function formatDateDisplay(dStr) {
  if (!dStr) return "";
  try {
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  } catch(e) {
    return dStr;
  }
}

export function getTodayYYYYMMDD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getContextKey(college, batch, program, semester, examCycle) {
  return `${college}__${batch}__${program}__${semester}__${examCycle}`;
}

export function computeActivityStatus(activity, log, semester) {
  if (log?.isNA) return "NA";
  if (activity.cond === "EVEN_ONLY" && !["Sem II", "Sem IV", "Sem VI", "Sem VIII"].includes(semester)) {
    return "SKIPPED";
  }
  if (activity.cond === "FINAL_ONLY" && !["Sem VI", "Sem VIII"].includes(semester)) {
    return "SKIPPED";
  }
  if (log?.queryDetails && !log.queryDetails.resolved) {
    return "QUERY_RAISED";
  }
  if (!log?.performedDate) {
    return "PENDING";
  }
  const makerRank = ROLE_RANKS[activity.performedBy] ?? -1;
  const rawReqVerifiers = activity.requiredVerifiers || [];
  const reqVerifiers = rawReqVerifiers.filter(role => (ROLE_RANKS[role] ?? -1) > makerRank);
  if (reqVerifiers.length === 0) return "COMPLETED";
  const allVerified = reqVerifiers.every(role => log?.verifications?.[role]?.verified);
  return allVerified ? "COMPLETED" : "IN_PROGRESS";
}

export function computeUserActionableItems(activities, contextsMap, config, currentUser) {
  if (!currentUser || !contextsMap || !activities) return [];
  const list = [];
  const role = currentUser.role;
  const isAdmin = !!currentUser.isAdmin;

  const accessibleColleges = isAdmin || ['COE', 'DY_COE'].includes(role) || currentUser.assignedColleges?.includes('ALL')
    ? (config?.colleges || []).map(c => c.id)
    : (currentUser.assignedColleges || []);

  Object.entries(contextsMap).forEach(([ctxKey, ctxData]) => {
    const parts = ctxKey.split('__');
    if (parts.length < 5) return;
    const [colId, batch, progId, sem, cycle] = parts;

    if (!accessibleColleges.includes(colId)) return;

    if (!isAdmin && !['COE', 'DY_COE'].includes(role) && !currentUser.assignedColleges?.includes('ALL')) {
      const userProgs = currentUser.assignedPrograms?.[colId];
      if (userProgs && !userProgs.includes('ALL') && !userProgs.includes(progId)) return;
    }

    // Strict Gate: If student count is 0, session has no active operations
    const m = ctxData?.headerMetrics || {};
    const totStudents = Number(m.totalStudents ?? (cycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0)) || 0;
    if (totStudents <= 0) return;

    const logs = ctxData?.logs || {};

    activities.forEach(act => {
      if (!isActivityApplicableForCycle(act, cycle)) return;
      const log = logs[act.id] || {};
      if (log.isNA) return;

      if (act.cond === "EVEN_ONLY" && !["Sem II", "Sem IV", "Sem VI", "Sem VIII"].includes(sem)) return;
      if (act.cond === "FINAL_ONLY" && !["Sem VI", "Sem VIII"].includes(sem)) return;

      // 1. Active Query
      if (log.queryDetails && !log.queryDetails.resolved) {
        if (act.performedBy === role || isAdmin) {
          list.push({
            id: `${ctxKey}__${act.id}`,
            ctxKey,
            college: colId,
            batch,
            program: progId,
            semester: sem,
            examCycle: cycle,
            activity: act,
            log,
            actionType: "QUERY_RESOLVE",
            actionLabel: "Resolve Query",
            priority: 1
          });
          return;
        }
      }

      // 2. Maker Action
      if (!log.performedDate) {
        if (act.performedBy === role || isAdmin) {
          list.push({
            id: `${ctxKey}__${act.id}`,
            ctxKey,
            college: colId,
            batch,
            program: progId,
            semester: sem,
            examCycle: cycle,
            activity: act,
            log,
            actionType: "PERFORM",
            actionLabel: `Perform (${act.performedBy})`,
            priority: 2
          });
          return;
        }
      }

      // 3. Verifier Action
      const makerRank = ROLE_RANKS[act.performedBy] ?? -1;
      const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > makerRank);
      if (reqs.includes(role)) {
        const idx = reqs.indexOf(role);
        const prevDone = idx === 0 || !!log.verifications?.[reqs[idx - 1]]?.verified;
        if (prevDone && !log.verifications?.[role]?.verified) {
          list.push({
            id: `${ctxKey}__${act.id}`,
            ctxKey,
            college: colId,
            batch,
            program: progId,
            semester: sem,
            examCycle: cycle,
            activity: act,
            log,
            verifyRole: role,
            actionType: "VERIFY",
            actionLabel: `Verify (${role})`,
            priority: 3
          });
        }
      }
    });
  });

  return list.sort((a, b) => a.priority - b.priority);
}
