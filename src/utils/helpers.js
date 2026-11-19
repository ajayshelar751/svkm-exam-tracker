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

/**
 * Normalizes a program code/name for robust matching (e.g., "45611 - B.Com." -> "b.com")
 */
export function normalizeProgramName(prog) {
  if (!prog) return '';
  return String(prog)
    .trim()
    .toLowerCase()
    .replace(/^\d+\s*[-–]\s*/, '')
    .replace(/\.+$/, '');
}

/**
 * Calculates student count in scope for a staff member based on their
 * assigned colleges and programs, with per-college breakdown and cohort count.
 */
export function getStaffStudentScope(user, contexts, config, batchFilter = "ALL", cycleFilter = "ALL", semFilter = "ALL", collegeFilter = "ALL") {
  if (!user) return { totalStudents: 0, byCollege: {}, cohortCount: 0 };

  const isAdmin = !!(user.isAdmin ?? user.is_admin);
  const role = user.role || user.role_code;
  const isGlobal = isAdmin || ['COE', 'DY_COE'].includes(role) || (user.assignedColleges || []).includes('ALL');

  const validColleges = config?.colleges || [];
  const accessibleCollegeIds = isGlobal
    ? (validColleges.length > 0 ? validColleges.map(c => c.id || c.code) : ['ALL', 'NMC', 'UPG'])
    : (user.assignedColleges || []);

  const byCollege = {};
  accessibleCollegeIds.forEach(colId => {
    byCollege[colId] = 0;
  });

  let totalStudents = 0;
  let cohortCount = 0;

  Object.entries(contexts || {}).forEach(([ctxKey, ctxData]) => {
    const parts = ctxKey.split('__');
    if (parts.length < 5) return;
    const [colId, batch, progId, sem, cycle] = parts;

    // Academic Batch filter
    if (batchFilter !== "ALL" && batch !== batchFilter) return;

    // College filter
    if (collegeFilter !== "ALL" && colId !== collegeFilter) return;

    // Semester filter
    if (semFilter !== "ALL" && sem !== semFilter) return;

    // Exam Cycle filter
    if (cycleFilter !== "ALL" && cycle !== cycleFilter) return;

    // Check college match against user's accessible colleges
    const matchedColId = (isGlobal || accessibleCollegeIds.includes('ALL'))
      ? colId
      : accessibleCollegeIds.find(ac => {
          if (ac.toLowerCase() === colId.toLowerCase()) return true;
          const colObj = validColleges.find(c => c.id === ac || c.code === ac);
          return colObj && (
            colObj.id.toLowerCase() === colId.toLowerCase() || 
            (colObj.code && colObj.code.toLowerCase() === colId.toLowerCase())
          );
        });
    if (!matchedColId) return;

    // Check program match for non-global staff
    if (!isGlobal) {
      const userProgs = user.assignedPrograms?.[matchedColId] || 
                        user.assignedPrograms?.[colId] || 
                        (user.assignedPrograms?.['ALL']?.includes('ALL') ? ['ALL'] : []);
      
      if (!userProgs.includes('ALL')) {
        const normContextProg = String(progId).trim().toLowerCase();
        const cleanContextProg = normalizeProgramName(progId);

        const matches = userProgs.some(p => {
          const normUserProg = String(p).trim().toLowerCase();
          const cleanUserProg = normalizeProgramName(p);
          return normContextProg === normUserProg || 
                 cleanContextProg === cleanUserProg ||
                 (cleanUserProg && cleanContextProg.includes(cleanUserProg)) ||
                 (normUserProg && normContextProg.includes(normUserProg));
        });

        if (!matches) return;
      }
    }

    // Extract student metrics
    const m = ctxData?.headerMetrics || {};
    const count = Number(m.totalStudents ?? (cycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0)) || 0;

    if (count > 0) {
      byCollege[matchedColId] = (byCollege[matchedColId] || 0) + count;
      totalStudents += count;
      cohortCount++;
    }
  });

  return {
    totalStudents,
    byCollege,
    cohortCount
  };
}

/**
 * Computes comprehensive staff-wise operational metrics across assigned scopes:
 * Students managed, cohorts, tasks assigned, completed, pending maker, pending verification, open queries.
 */
export function computeStaffDashboardMetrics(users = [], activities = [], contexts = {}, config = {}, filters = {}) {
  const {
    batchFilter = "ALL",
    collegeFilter = "ALL",
    cycleFilter = "ALL",
    semFilter = "ALL"
  } = filters;

  const validColleges = config?.colleges || [];

  return (users || []).filter(u => u && u.active !== false && u.is_active !== false).map(user => {
    const isAdmin = !!(user.isAdmin ?? user.is_admin);
    const role = user.role || user.role_code;
    const isGlobal = isAdmin || ['COE', 'DY_COE'].includes(role) || (user.assignedColleges || []).includes('ALL');

    const accessibleCollegeIds = isGlobal
      ? (validColleges.length > 0 ? validColleges.map(c => c.id || c.code) : ['ALL', 'NMC', 'UPG'])
      : (user.assignedColleges || []);

    let totalStudents = 0;
    const byCollege = {};
    accessibleCollegeIds.forEach(colId => {
      byCollege[colId] = 0;
    });

    let cohortCount = 0;
    let makerAssigned = 0;
    let makerCompleted = 0;
    let makerPending = 0;

    let verifierAssigned = 0;
    let verifierCompleted = 0;
    let verifierPending = 0;

    let openQueries = 0;

    const pendingMakerTasks = [];
    const pendingVerifierTasks = [];
    const activeQueryTasks = [];
    const matchedCohorts = [];

    Object.entries(contexts || {}).forEach(([ctxKey, ctxData]) => {
      const parts = ctxKey.split('__');
      if (parts.length < 5) return;
      const [colId, batch, progId, sem, cycle] = parts;

      if (batchFilter !== "ALL" && batch !== batchFilter) return;
      if (collegeFilter !== "ALL" && colId !== collegeFilter) return;
      if (cycleFilter !== "ALL" && cycle !== cycleFilter) return;
      if (semFilter !== "ALL" && sem !== semFilter) return;

      // Check college match against user's accessible colleges
      const matchedColId = (isGlobal || accessibleCollegeIds.includes('ALL'))
        ? colId
        : accessibleCollegeIds.find(ac => {
            if (ac.toLowerCase() === colId.toLowerCase()) return true;
            const colObj = validColleges.find(c => c.id === ac || c.code === ac);
            return colObj && (
              colObj.id.toLowerCase() === colId.toLowerCase() || 
              (colObj.code && colObj.code.toLowerCase() === colId.toLowerCase())
            );
          });
      if (!matchedColId) return;

      // Check program match for non-global staff
      if (!isGlobal) {
        const userProgs = user.assignedPrograms?.[matchedColId] || 
                          user.assignedPrograms?.[colId] || 
                          (user.assignedPrograms?.['ALL']?.includes('ALL') ? ['ALL'] : []);
        
        if (!userProgs.includes('ALL')) {
          const normContextProg = String(progId).trim().toLowerCase();
          const cleanContextProg = normalizeProgramName(progId);

          const matches = userProgs.some(p => {
            const normUserProg = String(p).trim().toLowerCase();
            const cleanUserProg = normalizeProgramName(p);
            return normContextProg === normUserProg || 
                   cleanContextProg === cleanUserProg ||
                   (cleanUserProg && cleanContextProg.includes(cleanUserProg)) ||
                   (normUserProg && normContextProg.includes(normUserProg));
          });

          if (!matches) return;
        }
      }

      // Context belongs to user's purview
      matchedCohorts.push({ ctxKey, colId, batch, progId, sem, cycle });

      // Student count
      const m = ctxData?.headerMetrics || {};
      const count = Number(m.totalStudents ?? (cycle === "Re-Exam" ? ((m.regBatchStudents || 0) + (m.prevBatchStudents || 0)) : 0)) || 0;
      if (count > 0) {
        byCollege[matchedColId] = (byCollege[matchedColId] || 0) + count;
        totalStudents += count;
        cohortCount++;
      }

      const logs = ctxData?.logs || {};

      // Analyze tasks across activities
      (activities || []).forEach(act => {
        if (!isActivityApplicableForCycle(act, cycle)) return;
        const log = logs[act.id] || {};
        if (log.isNA) return;

        if (act.cond === "EVEN_ONLY" && !["Sem II", "Sem IV", "Sem VI", "Sem VIII"].includes(sem)) return;
        if (act.cond === "FINAL_ONLY" && !["Sem VI", "Sem VIII"].includes(sem)) return;

        // 1. Queries
        if (log.queryDetails && !log.queryDetails.resolved) {
          if (act.performedBy === role || isGlobal) {
            openQueries++;
            activeQueryTasks.push({
              ctxKey,
              colId,
              batch,
              progId,
              sem,
              cycle,
              activityId: act.id,
              activityName: act.name || act.title || act.id,
              phase: act.phase,
              query: log.queryDetails
            });
          }
        }

        // 2. Maker Task
        if (act.performedBy === role) {
          makerAssigned++;
          if (log.performedDate) {
            makerCompleted++;
          } else {
            makerPending++;
            pendingMakerTasks.push({
              ctxKey,
              colId,
              batch,
              progId,
              sem,
              cycle,
              activityId: act.id,
              activityName: act.name || act.title || act.id,
              phase: act.phase
            });
          }
        }

        // 3. Verifier Task
        const makerRank = ROLE_RANKS[act.performedBy] ?? -1;
        const reqs = (act.requiredVerifiers || []).filter(r => (ROLE_RANKS[r] ?? -1) > makerRank);
        if (reqs.includes(role)) {
          verifierAssigned++;
          const hasVerified = !!log.verifications?.[role]?.verified;
          if (hasVerified) {
            verifierCompleted++;
          } else {
            // Check if ready for this verifier (prior sign-off complete)
            const idx = reqs.indexOf(role);
            const prevDone = idx === 0 ? !!log.performedDate : !!log.verifications?.[reqs[idx - 1]]?.verified;
            if (prevDone) {
              verifierPending++;
              pendingVerifierTasks.push({
                ctxKey,
                colId,
                batch,
                progId,
                sem,
                cycle,
                activityId: act.id,
                activityName: act.name || act.title || act.id,
                phase: act.phase
              });
            }
          }
        }
      });
    });

    const totalAssigned = makerAssigned + verifierAssigned;
    const totalCompleted = makerCompleted + verifierCompleted;
    const totalPending = makerPending + verifierPending;
    const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

    let ragStatus = "ON_TRACK";
    if (totalAssigned === 0) {
      ragStatus = "NO_TASKS";
    } else if (completionRate < 40 || totalPending > 15) {
      ragStatus = "CRITICAL";
    } else if (completionRate < 80 || totalPending > 5) {
      ragStatus = "IN_PROGRESS";
    }

    return {
      user,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin,
      isGlobal,
      accessibleColleges: accessibleCollegeIds,
      totalStudents,
      byCollege,
      cohortCount,
      makerAssigned,
      makerCompleted,
      makerPending,
      verifierAssigned,
      verifierCompleted,
      verifierPending,
      totalAssigned,
      totalCompleted,
      totalPending,
      openQueries,
      completionRate,
      ragStatus,
      pendingMakerTasks,
      pendingVerifierTasks,
      activeQueryTasks,
      matchedCohorts
    };
  });
}
