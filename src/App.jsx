import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './components/common/Icon.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import ConfirmModal from './components/common/ConfirmModal.jsx';
import TopNavbar from './components/layout/TopNavbar.jsx';
import ContextBar from './components/layout/ContextBar.jsx';
import HeaderMetricsCards from './components/layout/HeaderMetricsCards.jsx';
import LoginScreen from './components/views/LoginScreen.jsx';
import ActivityTrackerView from './components/views/ActivityTrackerView.jsx';
import MyActionQueueView from './components/views/MyActionQueueView.jsx';
import ExecutiveDashboardView from './components/views/ExecutiveDashboardView.jsx';
import AdminPanel from './components/views/AdminPanel.jsx';
import ChangePasswordModal from './components/modals/ChangePasswordModal.jsx';
import QueryModal from './components/modals/QueryModal.jsx';
import CloudDetailsModal from './components/modals/CloudDetailsModal.jsx';
import AuditReportModal from './components/modals/AuditReportModal.jsx';
import SapOsmExcelModal from './components/modals/SapOsmExcelModal.jsx';

import { INITIAL_ACTIVITIES } from './constants/activities.js';
import {
  INITIAL_COLLEGES,
  INITIAL_PROGRAMS,
  INITIAL_BATCHES,
  INITIAL_SEMESTERS,
  INITIAL_EXAM_CYCLES,
  INITIAL_PHASES,
  SUPABASE_CONFIG,
  FIREBASE_CONFIG
} from './constants/config.js';
import { INITIAL_USERS, ROLE_RANKS, ROLE_LABELS } from './constants/roles.js';
import {
  normalizeExamCycles,
  getActivityExamScope,
  isActivityApplicableForCycle,
  formatExamMonthYear,
  formatDateDisplay,
  getTodayYYYYMMDD,
  getContextKey,
  computeActivityStatus,
  computeUserActionableItems
} from './utils/helpers.js';
import { hashPassword, verifyPassword } from './utils/crypto.js';
import { SupabaseService, StorageService } from './services/supabaseService.js';

// --- Root App Component ---
export default function App() {
  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('svkm_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('svkm_theme', theme);
  }, [theme]);

  // Master State
  const [config, setConfig] = useState(() => ({
    colleges: INITIAL_COLLEGES,
    programs: INITIAL_PROGRAMS,
    batches: INITIAL_BATCHES,
    currentBatch: "2026-27",
    phases: INITIAL_PHASES,
    semesters: INITIAL_SEMESTERS,
    examCycles: INITIAL_EXAM_CYCLES,
    hideDemoLogins: true
  }));


  

  const [users, setUsers] = useState(INITIAL_USERS);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [contexts, setContexts] = useState({});

  // Active User & Views
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('svkm_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("tracker"); // tracker, queue, dashboard, admin
  const [cloudStatus, setCloudStatus] = useState("CHECKING"); // CONNECTED, LOCAL_FALLBACK
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const showToast = (message, type = "info") => {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const showConfirm = ({ title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger", onConfirm }) => {
    setConfirmState({
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        setConfirmState(null);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setConfirmState(null);
      }
    });
  };

  useEffect(() => {
    window.showPortalToast = showToast;
  }, []);
  const dbRef = useRef(null);

  // Active Context
  const [context, setContext] = useState(() => ({
    college: "NMC",
    batch: "2026-27",
    program: "45611 - B.Com.",
    semester: "Sem I",
    examCycle: "Regular"
  }));

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showSapOsmModal, setShowSapOsmModal] = useState(false);
  const [activeQueryModal, setActiveQueryModal] = useState(null); // { activity, log, ctxKey }

  // Initial Load & Firestore Sync
  useEffect(() => {
    // 1. Try local data first
    const local = StorageService.getLocalData();
    let initialConfig = config;
    let initialUsers = users;
    let initialActivities = activities;
    let initialContexts = contexts;

    if (local) {
      if (local.config) {
        const cln = { ...local.config, hideDemoLogins: true, examCycles: normalizeExamCycles(local.config.examCycles) };
        initialConfig = cln;
        setConfig(cln);
      }
      if (local.users) {
        const cleanUsers = local.users.filter(u => u.email?.toLowerCase().endsWith('@svkm.ac.in'));
        initialUsers = cleanUsers.length > 0 ? cleanUsers : INITIAL_USERS;
        setUsers(initialUsers);
      }
      if (local.activities) {
        initialActivities = local.activities;
        setActivities(local.activities);
      }
      if (local.contexts) {
        // Sanitize local contexts: retain only active NMC/UPG uploaded sessions
        const cleanContexts = {};
        Object.entries(local.contexts).forEach(([k, v]) => {
          if (k.startsWith('NMC__') || k.startsWith('UPG__')) {
            cleanContexts[k] = v;
          }
        });
        initialContexts = cleanContexts;
        setContexts(cleanContexts);
      }
    }

    // 2. Initialize Supabase PostgreSQL Client
    let unsubscribeSnapshots = null;
    let fallbackSyncInterval = null;

    SupabaseService.initSupabase().then(async (sb) => {
      if (!sb || !sb.client) {
        setCloudStatus("LOCAL_FALLBACK");
        return;
      }
      dbRef.current = sb.client;
      const res = await SupabaseService.syncFromDatabase(sb.client, {
        config: initialConfig,
        users: initialUsers,
        activities: initialActivities,
        contexts: initialContexts
      });

      if (res.success && res.data) {
        if (res.data.config) setConfig({ ...res.data.config, hideDemoLogins: true, examCycles: normalizeExamCycles(res.data.config.examCycles) });
        if (res.data.users) {
          const cleanUsers = res.data.users.filter(u => u.email?.toLowerCase().endsWith('@svkm.ac.in'));
          setUsers(cleanUsers.length > 0 ? cleanUsers : initialUsers);
        }
        if (res.data.activities) setActivities(res.data.activities);
        if (res.data.contexts) {
          // Pure Supabase Excel uploaded contexts
          setContexts(res.data.contexts);
        }
        setCloudStatus("CONNECTED");
        setLastSyncTime(new Date());
      } else {
        setCloudStatus("LOCAL_FALLBACK");
      }

      // Real-time Supabase onSnapshot listeners
      unsubscribeSnapshots = SupabaseService.listenToCloudUpdates(sb.client, {
        onStatusChange: (status) => {
          if (status) setCloudStatus(status);
        },
        onConfigUpdate: (cfg) => {
          if (cfg) {
            const cln = { ...cfg, examCycles: normalizeExamCycles(cfg.examCycles) };
            setConfig(cln);
            setCloudStatus("CONNECTED");
            setLastSyncTime(new Date());
            SupabaseService.debouncedSaveLocalData({ config: cln });
          }
        },
        onUsersUpdate: (usrList) => {
          if (usrList && usrList.length > 0) {
            setUsers(usrList);
            setCloudStatus("CONNECTED");
            setLastSyncTime(new Date());
            setCurrentUser(prevUser => {
              if (!prevUser) return prevUser;
              const match = usrList.find(u => u.id === prevUser.id);
              if (match) {
                localStorage.setItem('svkm_active_user', JSON.stringify(match));
                return match;
              }
              return prevUser;
            });
            SupabaseService.debouncedSaveLocalData({ users: usrList });
          }
        },
        onActivitiesUpdate: (actList) => {
          if (actList && actList.length > 0) {
            setActivities(actList);
            setCloudStatus("CONNECTED");
            setLastSyncTime(new Date());
            SupabaseService.debouncedSaveLocalData({ activities: actList });
          }
        },
        onContextsUpdate: (patchOrFn) => {
          if (!patchOrFn) return;
          setContexts(prev => {
            const next = typeof patchOrFn === 'function' ? patchOrFn(prev) : { ...prev, ...patchOrFn };
            SupabaseService.debouncedSaveLocalData({ contexts: next }, 1000);
            return next;
          });
          setCloudStatus("CONNECTED");
          setLastSyncTime(new Date());
        }
      });

      // 30-Second Background Fallback Delta Sync Mechanism
      fallbackSyncInterval = setInterval(async () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (!dbRef.current) return;
        try {
          console.log('%c[Realtime:FallbackSync] Running 30-second background consistency sync...', 'color: #6366f1; font-size: 11px;');
          const syncRes = await SupabaseService.syncFromDatabase(dbRef.current, {
            config,
            users,
            activities,
            contexts
          });
          if (syncRes.success && syncRes.data) {
            if (syncRes.data.config) setConfig(c => ({ ...syncRes.data.config, examCycles: normalizeExamCycles(syncRes.data.config.examCycles) }));
            if (syncRes.data.users) setUsers(syncRes.data.users);
            if (syncRes.data.activities) setActivities(syncRes.data.activities);
            if (syncRes.data.contexts) setContexts(syncRes.data.contexts);
            setCloudStatus("CONNECTED");
            setLastSyncTime(new Date());
            console.log('%c[Realtime:FallbackSync] 30s background sync complete. Consistent.', 'color: #10b981; font-size: 11px;');
          }
        } catch (err) {
          console.warn('[Realtime:FallbackSync] Background sync notice:', err);
        }
      }, 30000);
    });

    return () => {
      if (typeof unsubscribeSnapshots === 'function') {
        unsubscribeSnapshots();
      }
      if (fallbackSyncInterval) {
        clearInterval(fallbackSyncInterval);
      }
    };
  }, []);

  // Auto-sync currentUser whenever users array updates (via edits or cloud sync)
  useEffect(() => {
    if (!currentUser) return;
    const match = users.find(u => u.id === currentUser.id);
    if (match) {
      if (match.active === false) {
        handleSignOut();
        showToast("Your account has been deactivated by the Administrator.", "error");
        return;
      }
      if (JSON.stringify(match) !== JSON.stringify(currentUser)) {
        setCurrentUser(match);
        localStorage.setItem('svkm_active_user', JSON.stringify(match));
      }
    }
  }, [users]);

// Sync default Batch for all users when currentBatch loads from Cloud/Storage or on User Login
  useEffect(() => {
    const defaultBatch = config.currentBatch || config.batches?.[0];
    if (defaultBatch && config.batches?.includes(defaultBatch)) {
      setContext(prev => (prev.batch === defaultBatch ? prev : { ...prev, batch: defaultBatch }));
    }
  }, [config.currentBatch, currentUser?.id]);

  // When user logs in, ensure their active context is valid for their permissions
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.mustChangePassword) {
      setShowPasswordModal(true);
    }

    // Check college permission (only against valid colleges in config.colleges)
    const validColIds = (config.colleges || []).map(c => c.id);
    const allowedCols = currentUser.isAdmin || ['COE', 'DY_COE'].includes(currentUser.role) || currentUser.assignedColleges?.includes('ALL')
      ? validColIds
      : (currentUser.assignedColleges || []).filter(id => validColIds.includes(id));

    let targetCol = context.college;
    if (allowedCols.length > 0 && !allowedCols.includes(context.college)) {
      targetCol = allowedCols[0];
    } else if (allowedCols.length === 0 && validColIds.length > 0 && !validColIds.includes(context.college)) {
      targetCol = validColIds[0];
    }

    // Check program permission for targetCol
    const allProgsForCollege = config.programs[targetCol] || [];
    let allowedProgs = allProgsForCollege;
    if (!currentUser.isAdmin && !['COE', 'DY_COE'].includes(currentUser.role) && !currentUser.assignedColleges?.includes('ALL')) {
      const userCollegeProgs = currentUser.assignedPrograms?.[targetCol];
      if (userCollegeProgs && userCollegeProgs.length > 0 && !userCollegeProgs.includes('ALL')) {
        const normUserProgs = userCollegeProgs.map(p => String(p).trim().toLowerCase());
        allowedProgs = allProgsForCollege.filter(p => normUserProgs.includes(String(p).trim().toLowerCase()));
      }
    }

    let targetProg = context.program;
    if (allowedProgs.length > 0 && (!allowedProgs.includes(targetProg) || targetCol !== context.college)) {
      targetProg = allowedProgs[0] || (allProgsForCollege[0] || "");
    }

    if (targetCol !== context.college || targetProg !== context.program) {
      setContext(prev => ({
        ...prev,
        college: targetCol,
        program: targetProg
      }));
    }
  }, [currentUser, config.colleges, config.programs]);

  // Ensure context.examCycle is valid ('Regular' or 'Re-Exam')
  useEffect(() => {
    if (!["Regular", "Re-Exam"].includes(context.examCycle)) {
      setContext(prev => ({ ...prev, examCycle: "Regular" }));
    }
  }, [context.examCycle]);

  // Current Context Key & Data
  const currentContextKey = useMemo(() => {
    return getContextKey(context.college, context.batch, context.program, context.semester, context.examCycle);
  }, [context]);

  const currentContextData = useMemo(() => {
    return contexts[currentContextKey] || {
      headerMetrics: {
        batch: context.batch || "",
        numPrograms: 1,
        numModules: 0,
        totalStudents: 0,
        pwdStudents: 0,
        debarredStudents: 0,
        ufmCases: 0,
        isUploadedFromExcel: false
      },
      logs: {}
    };
  }, [contexts, currentContextKey, context.batch]);

  const currentLogs = currentContextData.logs || {};
  const currentHeaderMetrics = currentContextData.headerMetrics || {};

  // Persistence Helper
  // Persist Context Data with atomic cloud updates & functional state
  const persistSpecificContextData = (ctxKey, updatedContextData, optActId, optLogData, optRevokeRole, optRevokeHistory, optBulkMap) => {
    setContexts(prev => {
      const nextContexts = {
        ...prev,
        [ctxKey]: updatedContextData
      };
      StorageService.saveLocalData({ config, users, activities, contexts: nextContexts });
      return nextContexts;
    });

    if (dbRef.current) {
      if (optRevokeRole) {
        StorageService.revokeVerificationInCloud(dbRef.current, ctxKey, optActId, optRevokeRole, optRevokeHistory)
          .catch(err => {
            console.warn("Cloud write error:", err);
            setSyncError(true);
          });
      } else if (optActId && optLogData) {
        StorageService.saveActivityLogToCloud(dbRef.current, ctxKey, optActId, optLogData, updatedContextData.headerMetrics)
          .catch(err => {
            console.warn("Cloud write error:", err);
            setSyncError(true);
          });
      } else if (optBulkMap) {
        StorageService.saveBulkActivityLogsToCloud(dbRef.current, ctxKey, optBulkMap)
          .catch(err => {
            console.warn("Cloud write error:", err);
            setSyncError(true);
          });
      } else {
        StorageService.saveContextToCloud(dbRef.current, ctxKey, updatedContextData)
          .catch(err => {
            console.warn("Cloud write error:", err);
            setSyncError(true);
          });
      }
    }
  };

  const persistContextData = (updatedContextData) => {
    persistSpecificContextData(currentContextKey, updatedContextData);
  };

  // Batch update multiple cohorts from SAP Excel import with Replace / Merge mode & Snapshot tracking
  const handleBatchUpdateMetrics = async (param1, param2, param3) => {
    let cohortsList = [];
    let detectedCollege = "";
    let detectedBatch = "";
    let mode = "replace"; // 'replace' | 'selective' | 'merge'
    let fileName = "SAP_Import.xlsx";

    if (typeof param1 === "object" && !Array.isArray(param1)) {
      cohortsList = param1.cohorts || [];
      detectedCollege = param1.college || context.college;
      detectedBatch = param1.academicYear || context.batch;
      mode = param1.mode || "replace";
      fileName = param1.fileName || "SAP_Student_Master.xlsx";
    } else {
      cohortsList = param1 || [];
      detectedCollege = param2 || context.college;
      detectedBatch = param3 || context.batch;
    }

    if (!cohortsList || cohortsList.length === 0) {
      showToast("No cohorts selected for import.", "warning");
      return;
    }

    let nextContexts = { ...contexts };
    const previousSnapshot = {};
    const affectedContextKeys = [];

    for (const item of cohortsList) {
      const progName = item.programName || item.portalProgramName || item.programCode;
      const ctxKey = `${detectedCollege}__${detectedBatch}__${progName}__${item.semester}__Regular`;
      const prevCtx = nextContexts[ctxKey] || { headerMetrics: {}, logs: {} };

      // Save snapshot of previous metrics prior to this file's import (Option A Rollback)
      previousSnapshot[ctxKey] = { ...(prevCtx.headerMetrics || {}) };
      affectedContextKeys.push(ctxKey);

      let updatedMetrics;
      if (mode === "merge") {
        updatedMetrics = {
          ...(prevCtx.headerMetrics || {}),
          batch: detectedBatch,
          totalStudents: (prevCtx.headerMetrics?.totalStudents || 0) + (item.studentCount || 0),
          pwdStudents: (prevCtx.headerMetrics?.pwdStudents || 0) + (item.pwdCount || 0),
          isUploadedFromExcel: true,
          lastImportedFile: fileName
        };
      } else {
        // Clean Replace / Overwrite
        updatedMetrics = {
          ...(prevCtx.headerMetrics || {}),
          batch: detectedBatch,
          totalStudents: item.studentCount || 0,
          pwdStudents: item.pwdCount || 0,
          isUploadedFromExcel: true,
          lastImportedFile: fileName
        };
      }

      nextContexts[ctxKey] = {
        ...prevCtx,
        headerMetrics: updatedMetrics
      };

      if (dbRef.current) {
        StorageService.saveHeaderMetricsToCloud(dbRef.current, ctxKey, updatedMetrics).catch(e => console.warn(e));
      }
    }

    // Save File Ingestion History Ledger entry
    const historyEntry = {
      id: "imp_" + Date.now(),
      fileName: fileName,
      fileType: "SAP_STUDENT_MASTER",
      importedAt: new Date().toISOString(),
      importedByName: currentUser?.name || "CED Administrator",
      importedByEmail: currentUser?.email || "coe@svkm.ac.in",
      college: detectedCollege,
      academicYear: detectedBatch,
      cohortsCount: cohortsList.length,
      mode: mode,
      status: "ACTIVE",
      affectedContextKeys: affectedContextKeys,
      previousSnapshot: previousSnapshot
    };

    const nextImportHistory = [historyEntry, ...(config.importHistory || [])];
    const nextConfig = { ...config, importHistory: nextImportHistory };

    setConfig(nextConfig);
    setContexts(nextContexts);
    StorageService.saveLocalData({ config: nextConfig, users, activities, contexts: nextContexts });

    if (dbRef.current) {
      try {
        await dbRef.current.from('sap_excel_imports').insert({
          file_name: fileName,
          import_type: 'STUDENT_ENROLLMENT',
          row_count: cohortsList.reduce((acc, c) => acc + (c.studentCount || 0), 0),
          success_count: cohortsList.length,
          status: 'COMPLETED',
          errors: {
            historyId: historyEntry.id,
            mode: mode,
            affectedContextKeys: affectedContextKeys,
            previousSnapshot: previousSnapshot
          }
        });
      } catch (importErr) {
        console.warn("Supabase import record notice:", importErr);
      }
    }

    showToast(`Successfully applied ${cohortsList.length} cohorts (${mode === 'merge' ? 'Merged' : 'Replaced'}) from "${fileName}"!`, "success");
  };

  // Rollback file records to exact pre-import snapshot (Option A)
  const handleRollbackFile = async (fileId) => {
    const historyItem = (config.importHistory || []).find(h => h.id === fileId);
    if (!historyItem) {
      showToast("File import record not found.", "error");
      return;
    }
    if (historyItem.status === "ROLLED_BACK") {
      showToast("This file has already been rolled back.", "warning");
      return;
    }

    showConfirm({
      title: "Remove Records & Rollback File",
      message: `Are you sure you want to remove all records imported from "${historyItem.fileName}"? This will revert session metrics across ${historyItem.affectedContextKeys?.length || 0} cohorts back to their exact state before this file was imported.`,
      confirmText: "Rollback File Records",
      type: "danger",
      onConfirm: async () => {
        let nextContexts = { ...contexts };
        const snapshot = historyItem.previousSnapshot || {};

        for (const ctxKey of (historyItem.affectedContextKeys || [])) {
          const prevMetrics = snapshot[ctxKey];
          const currCtx = nextContexts[ctxKey] || { headerMetrics: {}, logs: {} };

          let restoredMetrics;
          if (prevMetrics && Object.keys(prevMetrics).length > 0) {
            restoredMetrics = { ...prevMetrics };
          } else {
            // Clean reset if there were no prior metrics
            restoredMetrics = {
              ...(currCtx.headerMetrics || {}),
              totalStudents: 0,
              pwdStudents: 0,
              isUploadedFromExcel: false,
              lastImportedFile: null
            };
          }

          nextContexts[ctxKey] = {
            ...currCtx,
            headerMetrics: restoredMetrics
          };

          if (dbRef.current) {
            StorageService.saveHeaderMetricsToCloud(dbRef.current, ctxKey, restoredMetrics).catch(e => console.warn(e));
          }
        }

        const nextHistory = (config.importHistory || []).map(h =>
          h.id === fileId
            ? { ...h, status: "ROLLED_BACK", rolledBackAt: new Date().toISOString(), rolledBackByName: currentUser?.name }
            : h
        );

        const nextConfig = { ...config, importHistory: nextHistory };
        setConfig(nextConfig);
        setContexts(nextContexts);
        StorageService.saveLocalData({ config: nextConfig, users, activities, contexts: nextContexts });

        if (dbRef.current) {
          try {
            await dbRef.current.from('audit_history').insert({
              action: 'EXCEL_IMPORT_ROLLED_BACK',
              role_code: currentUser?.role || 'COE',
              user_name: currentUser?.name || 'CED Admin',
              user_email: currentUser?.email || 'coe@svkm.ac.in',
              details: `Rolled back Excel file "${historyItem.fileName}" and restored previous metrics across ${historyItem.affectedContextKeys?.length || 0} cohorts.`
            });
          } catch (auditErr) {
            console.warn("Audit history rollback notice:", auditErr);
          }
        }

        showToast(`Successfully rolled back "${historyItem.fileName}" and restored previous metrics!`, "success");
      }
    });
  };

  // 1-Click Purge Context Metrics
  const handlePurgeContextMetrics = (ctxKey) => {
    showConfirm({
      title: "Purge Session Metrics",
      message: `Reset all metrics (Students, PWD, Debarred, Modules) for ${ctxKey.replace(/__/g, " • ")} to 0? This cannot be undone.`,
      confirmText: "Purge Metrics to 0",
      type: "danger",
      onConfirm: () => {
        const currCtx = contexts[ctxKey] || { headerMetrics: {}, logs: {} };
        const purgedMetrics = {
          ...(currCtx.headerMetrics || {}),
          totalStudents: 0,
          pwdStudents: 0,
          debarredStudents: 0,
          numModules: 0,
          isUploadedFromExcel: false,
          lastImportedFile: null
        };
        const nextContexts = {
          ...contexts,
          [ctxKey]: {
            ...currCtx,
            headerMetrics: purgedMetrics
          }
        };
        setContexts(nextContexts);
        StorageService.saveLocalData({ config, users, activities, contexts: nextContexts });
        if (dbRef.current) {
          StorageService.saveHeaderMetricsToCloud(dbRef.current, ctxKey, purgedMetrics).catch(e => console.warn(e));
        }
        showToast("Session metrics purged to 0 successfully.", "success");
      }
    });
  };

  // 1-Click Purge Sample / Prototype Contexts
  const handlePurgeSampleContexts = () => {
    showConfirm({
      title: "Purge Stale & Sample Contexts",
      message: "Are you sure you want to clean any lingering sample or non-Excel session contexts? Live Excel-uploaded cohorts will remain intact.",
      confirmText: "Purge Stale Contexts",
      type: "danger",
      onConfirm: async () => {
        const nextContexts = {};
        const keysToDelete = [];
        Object.entries(contexts).forEach(([k, v]) => {
          if ((k.startsWith('NMC__') || k.startsWith('UPG__')) && (v?.headerMetrics?.totalStudents > 0 || v?.headerMetrics?.isUploadedFromExcel)) {
            nextContexts[k] = v;
          } else {
            keysToDelete.push(k);
          }
        });

        if (dbRef.current && keysToDelete.length > 0) {
          try {
            await dbRef.current.from('exam_sessions').delete().in('context_key', keysToDelete);
          } catch(e) {
            console.warn("Notice while deleting sample sessions in cloud:", e);
          }
        }

        setContexts(nextContexts);
        StorageService.saveLocalData({ config, users, activities, contexts: nextContexts });
        showToast("Purged stale contexts. Only pure Excel sessions remain!", "success");
      }
    });
  };

  // Update single log with auto Exam Month & Year derivation
  const handleUpdateLog = (activityId, logData) => {
    let nextMetrics = currentHeaderMetrics;
    if (activityId === "act_23" || activityId === "act_135") {
      if (logData?.performedDate) {
        const m = formatExamMonthYear(logData.performedDate);
        if (m) {
          nextMetrics = { ...currentHeaderMetrics, examMonthYear: m };
        }
      }
    }
    const updated = {
      ...currentContextData,
      headerMetrics: nextMetrics,
      logs: {
        ...currentLogs,
        [activityId]: logData
      }
    };
    persistSpecificContextData(currentContextKey, updated, activityId, logData);
  };

  // Revoke verification handler
  const handleRevokeVerification = (activityId, role, updatedHistory) => {
    const curLog = currentLogs[activityId] || {};
    const nextVerifs = { ...(curLog.verifications || {}) };
    delete nextVerifs[role];
    const updatedLog = {
      ...curLog,
      verifications: nextVerifs,
      history: updatedHistory
    };
    const updatedCtx = {
      ...currentContextData,
      logs: {
        ...currentLogs,
        [activityId]: updatedLog
      }
    };
    persistSpecificContextData(currentContextKey, updatedCtx, activityId, null, role, updatedHistory);
    showToast(`Verification for tier ${role} revoked.`, "info");
  };

  // Bulk update logs
  const handleBulkUpdateLogs = (updates) => {
    const updated = {
      ...currentContextData,
      logs: {
        ...currentLogs,
        ...updates
      }
    };
    persistSpecificContextData(currentContextKey, updated, null, null, null, null, updates);
    showToast("Bulk actions applied successfully.", "success");
  };

  // Update Header Metrics explicitly via saveHeaderMetricsToCloud
  const handleUpdateMetrics = (metrics) => {
    const updated = {
      ...currentContextData,
      headerMetrics: metrics
    };
    setContexts(prev => {
      const nextContexts = {
        ...prev,
        [currentContextKey]: updated
      };
      StorageService.saveLocalData({ config, users, activities, contexts: nextContexts });
      return nextContexts;
    });
    if (dbRef.current) {
      StorageService.saveHeaderMetricsToCloud(dbRef.current, currentContextKey, metrics)
        .catch(err => {
          console.warn("Cloud write error:", err);
          setSyncError(true);
        });
    }
  };

  // Direct perform from Action Queue
  const handleDirectPerform = (ctxKey, actId, dateVal) => {
    const targetCtx = contexts[ctxKey] || { headerMetrics: {}, logs: {} };
    const curLog = targetCtx.logs?.[actId] || {};
    const act = activities.find(a => a.id === actId);
    let nextMetrics = targetCtx.headerMetrics || {};
    if (actId === "act_23" || actId === "act_135") {
      const m = formatExamMonthYear(dateVal);
      if (m) nextMetrics = { ...nextMetrics, examMonthYear: m };
    }
    const historyEntry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: "PERFORMED",
      role: currentUser.role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: dateVal,
      details: "Performed via Action Queue",
      timestamp: new Date().toISOString()
    };
    const logData = {
      ...curLog,
      performedDate: dateVal,
      performedByUser: {
        name: currentUser.name,
        email: currentUser.email,
        timestamp: new Date().toISOString()
      },
      history: [...(curLog.history || []), historyEntry]
    };
    const updated = {
      ...targetCtx,
      headerMetrics: nextMetrics,
      logs: {
        ...(targetCtx.logs || {}),
        [actId]: logData
      }
    };
    persistSpecificContextData(ctxKey, updated, actId, logData);
    showToast(`Activity #${act?.srNo || ''} performed successfully.`, "success");
  };

  // Direct verify from Action Queue
  const handleDirectVerify = (ctxKey, actId, role, dateVal) => {
    const targetCtx = contexts[ctxKey] || { headerMetrics: {}, logs: {} };
    const curLog = targetCtx.logs?.[actId] || {};
    const act = activities.find(a => a.id === actId);
    const historyEntry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: "VERIFIED",
      role: role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: dateVal,
      details: `Verified tier ${role} via Action Queue`,
      timestamp: new Date().toISOString()
    };
    const logData = {
      ...curLog,
      verifications: {
        ...(curLog.verifications || {}),
        [role]: {
          verified: true,
          date: dateVal,
          userName: currentUser.name,
          userEmail: currentUser.email,
          systemTimestamp: new Date().toISOString()
        }
      },
      history: [...(curLog.history || []), historyEntry]
    };
    const updated = {
      ...targetCtx,
      logs: {
        ...(targetCtx.logs || {}),
        [actId]: logData
      }
    };
    persistSpecificContextData(ctxKey, updated, actId, logData);
    showToast(`Verification for #${act?.srNo || ''} tier ${role} recorded.`, "success");
  };

  // Query handlers
  const handleSaveQuery = (actId, reason) => {
    const targetKey = activeQueryModal?.ctxKey || currentContextKey;
    const targetCtx = contexts[targetKey] || (targetKey === currentContextKey ? currentContextData : { headerMetrics: {}, logs: {} });
    const curLog = targetCtx.logs?.[actId] || {};
    const historyEntry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: "QUERY_RAISED",
      role: currentUser.role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: null,
      details: `Query raised: "${reason}"`,
      timestamp: new Date().toISOString()
    };
    const logData = {
      ...curLog,
      queryDetails: {
        raisedBy: currentUser.name,
        role: currentUser.role,
        email: currentUser.email,
        reason,
        timestamp: new Date().toISOString(),
        resolved: false
      },
      history: [...(curLog.history || []), historyEntry]
    };
    const updated = {
      ...targetCtx,
      logs: {
        ...(targetCtx.logs || {}),
        [actId]: logData
      }
    };
    persistSpecificContextData(targetKey, updated, actId, logData);
    showToast("Query flagged on activity.", "warning");
  };

  const handleResolveQuery = (actId, resolutionNotes) => {
    const targetKey = activeQueryModal?.ctxKey || currentContextKey;
    const targetCtx = contexts[targetKey] || (targetKey === currentContextKey ? currentContextData : { headerMetrics: {}, logs: {} });
    const curLog = targetCtx.logs?.[actId] || {};
    const historyEntry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action: "QUERY_RESOLVED",
      role: currentUser.role,
      userName: currentUser.name,
      userEmail: currentUser.email,
      dateValue: null,
      details: `Query resolved: "${resolutionNotes}"`,
      timestamp: new Date().toISOString()
    };
    const logData = {
      ...curLog,
      queryDetails: {
        ...(curLog.queryDetails || {}),
        resolved: true,
        resolvedBy: currentUser.name,
        resolvedAt: new Date().toISOString(),
        resolutionNotes
      },
      history: [...(curLog.history || []), historyEntry]
    };
    const updated = {
      ...targetCtx,
      logs: {
        ...(targetCtx.logs || {}),
        [actId]: logData
      }
    };
    persistSpecificContextData(targetKey, updated, actId, logData);
    showToast("Query marked as resolved.", "success");
  };

  // User auth handlers
  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('svkm_active_user', JSON.stringify(user));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('svkm_active_user');
  };

  const handleSavePassword = (newPassword) => {
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      mustChangePassword: false
    };
    const nextUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(nextUsers);
    setCurrentUser(updatedUser);
    localStorage.setItem('svkm_active_user', JSON.stringify(updatedUser));
    StorageService.saveLocalData({ config, users: nextUsers, activities, contexts });
    StorageService.saveUserToCloud(dbRef.current, updatedUser);
    setShowPasswordModal(false);
    showToast("Password updated successfully!", "success");
  };

  // Admin User operations
  const handleSaveStaffUser = (savedUser) => {
    const exists = users.some(u => u.id === savedUser.id);
    const nextUsers = exists ? users.map(u => u.id === savedUser.id ? savedUser : u) : [...users, savedUser];
    setUsers(nextUsers);
    if (currentUser && currentUser.id === savedUser.id) {
      setCurrentUser(savedUser);
      localStorage.setItem('svkm_active_user', JSON.stringify(savedUser));
    }
    StorageService.saveLocalData({ config, users: nextUsers, activities, contexts });
    StorageService.saveUserToCloud(dbRef.current, savedUser);
  };

  const handleDeleteStaffUser = (userId) => {
    if (userId === currentUser.id) {
      showToast("You cannot delete your currently active account.", "warning");
      return;
    }
    const targetUser = (users || []).find(u => u.id === userId);
    if (targetUser?.role === "COE") {
      showToast("Institutional Governance Violation: The Controller of Examinations account cannot be deleted.", "error");
      return;
    }
    showConfirm({
      title: "Delete Staff Account",
      message: "Are you sure you want to delete this staff account?",
      type: "danger",
      onConfirm: () => {
        const nextUsers = users.filter(u => u.id !== userId);
        setUsers(nextUsers);
        StorageService.saveLocalData({ config, users: nextUsers, activities, contexts });
        StorageService.deleteUserFromCloud(dbRef.current, userId);
        showToast("Staff account deleted successfully.", "info");
      }
    });
  };

  const handleResetPassword = (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const updated = { ...target, password: "Pass@123", mustChangePassword: true };
    handleSaveStaffUser(updated);
    showToast(`Password for ${target.name} reset to Pass@123`, "success");
  };

  // Admin Activity operations
  const handleSaveActivity = (savedAct) => {
    const exists = activities.some(a => a.id === savedAct.id);
    const nextActs = exists ? activities.map(a => a.id === savedAct.id ? savedAct : a) : [...activities, savedAct];
    nextActs.sort((a, b) => (a.srNo || 0) - (b.srNo || 0));
    setActivities(nextActs);
    StorageService.saveLocalData({ config, users, activities: nextActs, contexts });
    StorageService.saveActivitiesToCloud(dbRef.current, nextActs);
  };

  const handleDeleteActivity = (actId) => {
    const nextActs = activities.filter(a => a.id !== actId);
    setActivities(nextActs);
    StorageService.saveLocalData({ config, users, activities: nextActs, contexts });
    StorageService.saveActivitiesToCloud(dbRef.current, nextActs);
  };

  // Admin Config operations
  const handleSaveConfig = (nextConfig) => {
    const cln = { ...nextConfig, examCycles: normalizeExamCycles(nextConfig.examCycles) };
    setConfig(cln);
    StorageService.saveLocalData({ config: nextConfig, users, activities, contexts });
    StorageService.saveConfigToCloud(dbRef.current, nextConfig);
  };

  // Full restore
  const handleRestoreBackup = (data) => {
    setConfig(data.config);
    setUsers(data.users);
    setActivities(data.activities);
    setContexts(data.contexts || {});
    StorageService.saveLocalData(data);
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, data.config);
      StorageService.saveActivitiesToCloud(dbRef.current, data.activities);
      for (const u of data.users) {
        StorageService.saveUserToCloud(dbRef.current, u);
      }
      Object.entries(data.contexts || {}).forEach(([k, v]) => {
        StorageService.saveContextToCloud(dbRef.current, k, v);
      });
    }
  };

  const handleResetToSeed = () => {
    showConfirm({
      title: "Reset Portal to Initial Seed",
      message: "Reset all portal data to initial factory seed? This will overwrite local modifications and restore default staff accounts.",
      type: "danger",
      onConfirm: () => {
        const seed = {
          config: {
            colleges: INITIAL_COLLEGES,
            programs: INITIAL_PROGRAMS,
            batches: INITIAL_BATCHES,
            currentBatch: "2026-27",
            phases: INITIAL_PHASES,
            semesters: INITIAL_SEMESTERS,
            examCycles: INITIAL_EXAM_CYCLES,
            hideDemoLogins: true
          },
          users: INITIAL_USERS,
          activities: INITIAL_ACTIVITIES,
          contexts: {}
        };
        handleRestoreBackup(seed);
        showToast("Portal reset to factory seed successfully.", "success");
      }
    });
  };

  // Cascades for Admin Panel
  const handleCascadeRenameCollege = (oldCode, newCode, newName) => {
    const nextColleges = config.colleges.map(c => c.id === oldCode ? { id: newCode, name: newName, code: newCode } : c);
    const nextPrograms = { ...config.programs };
    if (nextPrograms[oldCode]) {
      nextPrograms[newCode] = nextPrograms[oldCode];
      delete nextPrograms[oldCode];
    }
    const nextConfig = { ...config, colleges: nextColleges, programs: nextPrograms };
    setConfig(nextConfig);

    const nextUsers = users.map(u => {
      let changed = false;
      let assignedColleges = u.assignedColleges || [];
      if (assignedColleges.includes(oldCode)) {
        assignedColleges = assignedColleges.map(c => c === oldCode ? newCode : c);
        changed = true;
      }
      let assignedPrograms = { ...(u.assignedPrograms || {}) };
      if (assignedPrograms[oldCode]) {
        assignedPrograms[newCode] = assignedPrograms[oldCode];
        delete assignedPrograms[oldCode];
        changed = true;
      }
      return changed ? { ...u, assignedColleges, assignedPrograms } : u;
    });
    setUsers(nextUsers);

    const nextContexts = {};
    const oldKeysToDelete = [];
    Object.entries(contexts).forEach(([k, v]) => {
      if (k.startsWith(`${oldCode}__`)) {
        const newKey = k.replace(`${oldCode}__`, `${newCode}__`);
        nextContexts[newKey] = v;
        oldKeysToDelete.push(k);
      } else {
        nextContexts[k] = v;
      }
    });
    setContexts(nextContexts);

    if (context.college === oldCode) {
      setContext(prev => ({ ...prev, college: newCode }));
    }

    StorageService.saveLocalData({ config: nextConfig, users: nextUsers, activities, contexts: nextContexts });
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, nextConfig);
      for (const u of nextUsers) {
        StorageService.saveUserToCloud(dbRef.current, u);
      }
      oldKeysToDelete.forEach(k => {
        const newKey = k.replace(`${oldCode}__`, `${newCode}__`);
        StorageService.saveContextToCloud(dbRef.current, newKey, nextContexts[newKey]);
        StorageService.deleteContextFromCloud(dbRef.current, k);
      });
    }
    showToast(`College updated to ${newName} (${newCode}) and all references cascaded.`, "success");
  };

  const handleCascadeRenameProgram = (colId, oldProg, newProg) => {
    const curList = config.programs[colId] || [];
    const nextList = curList.map(p => p === oldProg ? newProg : p);
    const nextConfig = {
      ...config,
      programs: { ...config.programs, [colId]: nextList }
    };
    setConfig(nextConfig);

    const nextUsers = users.map(u => {
      const userProgs = u.assignedPrograms?.[colId];
      if (userProgs && userProgs.includes(oldProg)) {
        const nextUserProgs = userProgs.map(p => p === oldProg ? newProg : p);
        return {
          ...u,
          assignedPrograms: {
            ...(u.assignedPrograms || {}),
            [colId]: nextUserProgs
          }
        };
      }
      return u;
    });
    setUsers(nextUsers);

    const nextContexts = {};
    const oldKeysToDelete = [];
    Object.entries(contexts).forEach(([k, v]) => {
      const parts = k.split('__');
      if (parts[0] === colId && parts[2] === oldProg) {
        parts[2] = newProg;
        const newKey = parts.join('__');
        nextContexts[newKey] = v;
        oldKeysToDelete.push(k);
      } else {
        nextContexts[k] = v;
      }
    });
    setContexts(nextContexts);

    if (context.college === colId && context.program === oldProg) {
      setContext(prev => ({ ...prev, program: newProg }));
    }

    StorageService.saveLocalData({ config: nextConfig, users: nextUsers, activities, contexts: nextContexts });
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, nextConfig);
      for (const u of nextUsers) {
        StorageService.saveUserToCloud(dbRef.current, u);
      }
      oldKeysToDelete.forEach(k => {
        const parts = k.split('__');
        parts[2] = newProg;
        const newKey = parts.join('__');
        StorageService.saveContextToCloud(dbRef.current, newKey, nextContexts[newKey]);
        StorageService.deleteContextFromCloud(dbRef.current, k);
      });
    }
    showToast(`Program renamed to "${newProg}" and cascaded.`, "success");
  };

  const handleCascadeRenamePhase = (oldPhase, newPhase) => {
    const curPhases = config.phases && config.phases.length > 0 ? config.phases : INITIAL_PHASES;
    const nextPhases = curPhases.map(ph => ph === oldPhase ? newPhase : ph);
    const nextConfig = { ...config, phases: nextPhases };
    setConfig(nextConfig);

    const nextActs = activities.map(a => a.phase === oldPhase ? { ...a, phase: newPhase } : a);
    setActivities(nextActs);

    StorageService.saveLocalData({ config: nextConfig, users, activities: nextActs, contexts });
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, nextConfig);
      StorageService.saveActivitiesToCloud(dbRef.current, nextActs);
    }
    showToast(`Phase renamed to "${newPhase}" across all activities.`, "success");
  };

  const handleCascadeReorderPhases = (newPhases) => {
    const nextConfig = { ...config, phases: newPhases };
    setConfig(nextConfig);
    StorageService.saveLocalData({ config: nextConfig, users, activities, contexts });
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, nextConfig);
    }
  };

  const handleCascadeRenameBatch = (oldBatch, newBatch) => {
    const nextBatches = config.batches.map(b => b === oldBatch ? newBatch : b);
    const nextCurrentBatch = config.currentBatch === oldBatch ? newBatch : config.currentBatch;
    const nextConfig = { ...config, batches: nextBatches, currentBatch: nextCurrentBatch };
    setConfig(nextConfig);

    const nextContexts = {};
    const oldKeysToDelete = [];
    Object.entries(contexts).forEach(([k, v]) => {
      const parts = k.split('__');
      if (parts[1] === oldBatch) {
        parts[1] = newBatch;
        const newKey = parts.join('__');
        nextContexts[newKey] = v;
        oldKeysToDelete.push(k);
      } else {
        nextContexts[k] = v;
      }
    });
    setContexts(nextContexts);

    if (context.batch === oldBatch) {
      setContext(prev => ({ ...prev, batch: newBatch }));
    }

    StorageService.saveLocalData({ config: nextConfig, users, activities, contexts: nextContexts });
    if (dbRef.current) {
      StorageService.saveConfigToCloud(dbRef.current, nextConfig);
      oldKeysToDelete.forEach(k => {
        const parts = k.split('__');
        parts[1] = newBatch;
        const newKey = parts.join('__');
        StorageService.saveContextToCloud(dbRef.current, newKey, nextContexts[newKey]);
        StorageService.deleteContextFromCloud(dbRef.current, k);
      });
    }
    showToast(`Batch renamed to "${newBatch}" and cascaded.`, "success");
  };

  // Merge active context so Brand-New Sessions show pending tasks immediately in Queue
  const allContextsWithActive = useMemo(() => {
    if (!contexts[currentContextKey]) {
      return {
        ...contexts,
        [currentContextKey]: currentContextData
      };
    }
    return contexts;
  }, [contexts, currentContextKey, currentContextData]);

  // Action Queue Pending Count (Deduplicated via shared helper)
  const actionQueueCount = useMemo(() => {
    return computeUserActionableItems(activities, allContextsWithActive, config, currentUser).length;
  }, [activities, allContextsWithActive, config, currentUser]);

  const [phaseFilter, setPhaseFilter] = useState("ALL");

  // Navigate directly to context
  const handleNavigateToContext = (college, batch, program, semester, examCycle) => {
    setContext({ college, batch, program, semester, examCycle });
    setPhaseFilter("ALL");
    setActiveTab("tracker");
  };

  const handleNavigateToContextPhase = (college, phase) => {
    setContext(prev => {
      const validProgs = config.programs[college] || [];
      const isProgValid = validProgs.includes(prev.program);
      return {
        ...prev,
        college,
        program: isProgValid ? prev.program : (validProgs[0] || "")
      };
    });
    setPhaseFilter(phase || "ALL");
    setActiveTab("tracker");
  };

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLogin={handleLogin}
        hideDemoLogins={config.hideDemoLogins}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <TopNavbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        setTheme={setTheme}
        cloudStatus={cloudStatus}
        syncError={syncError}
        onRetrySync={async () => {
          setSyncError(false);
          const res = await SupabaseService.syncFromDatabase(dbRef.current, { config, users, activities, contexts });
          if (res.success && res.data) {
            if (res.data.config) setConfig(res.data.config);
            if (res.data.users) setUsers(res.data.users);
            if (res.data.activities) setActivities(res.data.activities);
            if (res.data.contexts) setContexts(res.data.contexts);
            setCloudStatus("CONNECTED");
            setLastSyncTime(new Date());
            setSyncError(false);
            showToast("Cloud resynchronization successful!", "success");
          } else {
            showToast("Cloud sync failed. Running in fallback mode.", "warning");
          }
        }}
        actionQueueCount={actionQueueCount}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onOpenAuditModal={() => setShowAuditModal(true)}
        onOpenCloudModal={() => setShowCloudModal(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Router */}
      {activeTab === "tracker" && (
        <main>
          <ContextBar
            currentUser={currentUser}
            config={config}
            context={context}
            setContext={setContext}
          />
          <div className="max-w-[1700px] mx-auto px-4">
            <HeaderMetricsCards
              metrics={currentHeaderMetrics}
              onUpdateMetrics={handleUpdateMetrics}
              context={context}
              currentLogs={currentLogs}
              onOpenSapOsmModal={() => setShowSapOsmModal(true)}
            />
          </div>
          <ActivityTrackerView
            activities={activities}
            currentLogs={currentLogs}
            context={context}
            currentUser={currentUser}
            headerMetrics={currentHeaderMetrics}
            config={config}
            onUpdateLog={handleUpdateLog}
            onBulkUpdateLogs={handleBulkUpdateLogs}
            onRevokeVerification={handleRevokeVerification}
            onOpenQueryModal={(act, log) => setActiveQueryModal({ activity: act, log })}
            phaseFilter={phaseFilter}
            setPhaseFilter={setPhaseFilter}
            showConfirm={showConfirm}
            showToast={showToast}
          />
        </main>
      )}

      {activeTab === "queue" && (
        <main>
          <MyActionQueueView
            activities={activities}
            contexts={allContextsWithActive}
            currentContextKey={currentContextKey}
            config={config}
            currentUser={currentUser}
            onNavigateToContext={handleNavigateToContext}
            onDirectPerform={handleDirectPerform}
            onDirectVerify={handleDirectVerify}
            onOpenQueryModal={(act, log, ctxKey) => setActiveQueryModal({ activity: act, log, ctxKey })}
          />
        </main>
      )}

      {activeTab === "dashboard" && (
        <main>
          <ExecutiveDashboardView
            activities={activities}
            contexts={allContextsWithActive}
            config={config}
            onNavigateToContextPhase={handleNavigateToContextPhase}
            onNavigateToContext={handleNavigateToContext}
          />
        </main>
      )}

      {activeTab === "admin" && currentUser.isAdmin && (
        <main>
          <AdminPanel
            users={users}
            activities={activities}
            contexts={contexts}
            config={config}
            currentLogs={currentLogs}
            context={context}
            headerMetrics={currentHeaderMetrics}
            onSaveUser={handleSaveStaffUser}
            onDeleteUser={handleDeleteStaffUser}
            onResetPassword={handleResetPassword}
            onSaveActivity={handleSaveActivity}
            onDeleteActivity={handleDeleteActivity}
            onSaveConfig={handleSaveConfig}
            onCascadeRenameCollege={handleCascadeRenameCollege}
            onCascadeRenameProgram={handleCascadeRenameProgram}
            onCascadeRenamePhase={handleCascadeRenamePhase}
            onCascadeReorderPhases={handleCascadeReorderPhases}
            onCascadeRenameBatch={handleCascadeRenameBatch}
            onRestoreBackup={handleRestoreBackup}
            onResetToSeed={handleResetToSeed}
            onPurgeSampleData={handlePurgeSampleContexts}
            onOpenAuditModal={() => setShowAuditModal(true)}
            showConfirm={showConfirm}
            showToast={showToast}
          />
        </main>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          user={currentUser}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleSavePassword}
        />
      )}

      {/* Query Modal */}
      {activeQueryModal && (
        <QueryModal
          activity={activeQueryModal.activity}
          log={activeQueryModal.log}
          currentUser={currentUser}
          onClose={() => setActiveQueryModal(null)}
          onSaveQuery={handleSaveQuery}
          onResolveQuery={handleResolveQuery}
        />
      )}

      {/* Cloud Details Modal */}
      {showSapOsmModal && (
        <SapOsmExcelModal
          context={context}
          setContext={setContext}
          contexts={contexts}
          headerMetrics={currentHeaderMetrics}
          config={config}
          currentUser={currentUser}
          onApplyMetrics={handleUpdateMetrics}
          onApplyLog={handleUpdateLog}
          onBatchUpdateMetrics={handleBatchUpdateMetrics}
          onRollbackFile={handleRollbackFile}
          onPurgeContextMetrics={handlePurgeContextMetrics}
          showToast={showToast}
          showConfirm={showConfirm}
          onClose={() => setShowSapOsmModal(false)}
        />
      )}

      {showCloudModal && currentUser?.isAdmin && (
        <CloudDetailsModal
          cloudStatus={cloudStatus}
          lastSyncTime={lastSyncTime}
          onSyncNow={async () => {
            if (dbRef.current) {
              const res = await SupabaseService.syncFromDatabase(dbRef.current, { config, users, activities, contexts });
              if (res.success && res.data) {
                setConfig(res.data.config);
                setUsers(res.data.users);
                setActivities(res.data.activities);
                setContexts(res.data.contexts);
                setLastSyncTime(new Date());
                showToast("Cloud resynchronization successful!", "success");
              }
            }
          }}
          onClose={() => setShowCloudModal(false)}
        />
      )}

      {/* Audit Report Modal */}
      {showAuditModal && (
        <AuditReportModal
          activities={activities}
          currentLogs={currentLogs}
          context={context}
          headerMetrics={currentHeaderMetrics}
          users={users}
          config={config}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {/* Toast Notifications Container */}
      <ToastContainer
        toasts={toasts}
        onCloseToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />

      {/* Reusable Confirm Dialog Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={true}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type}
          onConfirm={confirmState.onConfirm}
          onClose={confirmState.onCancel}
        />
      )}
    </div>
  );
}
