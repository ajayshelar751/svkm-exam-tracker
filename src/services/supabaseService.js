import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, PURGED_COLLEGES } from '../constants/config.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { normalizeExamCycles } from '../utils/helpers.js';

if (typeof window !== 'undefined') {
  if (!window.supabase) {
    window.supabase = { createClient };
  }
}

export class SupabaseService {
  static LOCAL_KEY = 'svkm_exam_portal_v1';
  static _supabaseClient = null;
  static _sessionKeyToId = {};
  static _sessionIdToKey = {};
  static _activityLogMap = {};
  static _saveDebounceTimer = null;
  static _pendingSaveData = {};

  // --- Session & Activity Relational Mapping Caches ---
  static recordSessionMapping(sessionId, contextKey) {
    if (sessionId && contextKey) {
      this._sessionIdToKey[sessionId] = contextKey;
      this._sessionKeyToId[contextKey] = sessionId;
    }
  }

  static getContextKeyForSession(sessionId) {
    if (!sessionId) return null;
    return this._sessionIdToKey[sessionId] || null;
  }

  static async resolveContextKey(client, sessionId) {
    if (!sessionId) return null;
    if (this._sessionIdToKey[sessionId]) {
      return this._sessionIdToKey[sessionId];
    }
    if (!client) return null;
    try {
      const { data } = await client.from('exam_sessions')
        .select('id, context_key')
        .eq('id', sessionId)
        .maybeSingle();
      if (data?.context_key) {
        this.recordSessionMapping(data.id, data.context_key);
        return data.context_key;
      }
    } catch (e) {
      console.warn("Failed to resolve session context key:", e);
    }
    return null;
  }

  static recordActivityLogMapping(actLogId, sessionId, activityId) {
    if (actLogId) {
      this._activityLogMap[actLogId] = { sessionId, activityId };
    }
  }

  static getActivityLogMapping(actLogId) {
    if (!actLogId) return null;
    return this._activityLogMap[actLogId] || null;
  }

  static async resolveActivityLog(client, actLogId) {
    if (!actLogId) return null;
    if (this._activityLogMap[actLogId]) {
      return this._activityLogMap[actLogId];
    }
    if (!client) return null;
    try {
      const { data } = await client.from('activity_logs')
        .select('id, session_id, activity_id')
        .eq('id', actLogId)
        .maybeSingle();
      if (data) {
        this.recordActivityLogMapping(data.id, data.session_id, data.activity_id);
        return { sessionId: data.session_id, activityId: data.activity_id };
      }
    } catch (e) {
      console.warn("Failed to resolve activity log:", e);
    }
    return null;
  }

  // --- Local Storage Caching with Non-Blocking Debounce ---
  static getLocalData() {
    try {
      const raw = localStorage.getItem(this.LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }
    return null;
  }

  static saveLocalData(data) {
    try {
      localStorage.setItem(this.LOCAL_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  static debouncedSaveLocalData(partialData, delayMs = 1000) {
    this._pendingSaveData = { ...this._pendingSaveData, ...partialData };
    if (this._saveDebounceTimer) clearTimeout(this._saveDebounceTimer);
    this._saveDebounceTimer = setTimeout(() => {
      this._saveDebounceTimer = null;
      try {
        const cur = this.getLocalData() || {};
        const merged = { ...cur, ...this._pendingSaveData };
        this._pendingSaveData = {};
        this.saveLocalData(merged);
      } catch (e) {
        console.warn("Debounced local save error:", e);
      }
    }, delayMs);
  }

  // --- Configuration Management ---
  static getSupabaseConfig() {
    try {
      const savedUrl = localStorage.getItem('svkm_supabase_url');
      const savedKey = localStorage.getItem('svkm_supabase_anon_key');
      const defaultUrl = SUPABASE_CONFIG?.url || (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url) || "https://wfkjekwxmodyzncytyqq.supabase.co";
      const defaultKey = SUPABASE_CONFIG?.anonKey || (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.anonKey) || "sb_publishable_evpiRRWqkrlBwWud2F6eIg_6oE3HnLs";

      const url = (savedUrl && savedUrl.trim().startsWith('http')) ? savedUrl.trim() : defaultUrl;
      const anonKey = (savedKey && savedKey.trim().length > 10) ? savedKey.trim() : defaultKey;
      return { url, anonKey };
    } catch (e) {
      return (SUPABASE_CONFIG || { url: "https://wfkjekwxmodyzncytyqq.supabase.co", anonKey: "sb_publishable_evpiRRWqkrlBwWud2F6eIg_6oE3HnLs" });
    }
  }

  static saveSupabaseConfig(url, anonKey) {
    try {
      if (url) localStorage.setItem('svkm_supabase_url', url.trim());
      if (anonKey) localStorage.setItem('svkm_supabase_anon_key', anonKey.trim());
    } catch (e) {
      console.warn("Error saving Supabase configuration:", e);
    }
  }

  // --- Initialization & Health Check ---
  static async initSupabase() {
    const clientFactory = createClient || (typeof window !== 'undefined' && window.supabase?.createClient);
    if (!clientFactory) {
      console.warn("Supabase SDK (@supabase/supabase-js) not detected. Running in Local Fallback mode.");
      return null;
    }
    const cfg = this.getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey || cfg.url.includes("placeholder")) {
      console.warn("Supabase configuration missing or placeholder. Running in Local Fallback mode.");
      return null;
    }
    try {
      const client = clientFactory(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      this._supabaseClient = client;
      if (typeof window !== 'undefined') {
        window._supabaseClient = client;
        if (!window.supabase) window.supabase = { createClient: clientFactory };
        if (!window.SUPABASE_CONFIG) window.SUPABASE_CONFIG = cfg;
      }

      // Connectivity probe
      try {
        const { error } = await client.from('roles').select('code').limit(1);
        if (error && error.code !== 'PGRST116') {
          console.warn("Supabase connection probe notice:", error.message);
        }
      } catch (probeErr) {
        console.warn("Supabase network probe error:", probeErr);
      }

      return { client, db: client, auth: client.auth };
    } catch (e) {
      console.warn("Supabase initialization error:", e);
      return null;
    }
  }

  // Alias for backward compatibility
  static async initFirebase() {
    return this.initSupabase();
  }

  // --- Supabase Authentication ---
  static async login(email, password, userObj) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // 1. Attempt Supabase Auth if client is active
    if (this._supabaseClient && this._supabaseClient.auth) {
      try {
        const { data, error } = await this._supabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (!error && data?.user) {
          return { success: true, user: userObj || data.user };
        }
      } catch (authErr) {
        console.warn("Supabase Auth API notice, attempting credential fallback:", authErr);
      }
    }

    // 2. Fallback to password hash verification for staff accounts
    if (userObj) {
      if (typeof verifyPassword === 'function') {
        const isMatch = await verifyPassword(password, userObj.password);
        if (isMatch) return { success: true, user: userObj };
      } else if (window.verifyPassword) {
        const isMatch = await window.verifyPassword(password, userObj.password);
        if (isMatch) return { success: true, user: userObj };
      } else if (userObj.password === password) {
        return { success: true, user: userObj };
      }
    }

    return { success: false, error: "Invalid password. Please check your credentials." };
  }

  static async signOut(client) {
    const cl = client || this._supabaseClient;
    if (cl && cl.auth) {
      try {
        await cl.auth.signOut();
      } catch (e) {
        console.warn("Error during Supabase signOut:", e);
      }
    }
  }

  // --- Session Key / Master Relational Resolver ---
  static async ensureSession(client, contextKey) {
    if (!client || !contextKey) return null;
    const parts = contextKey.split('__');
    if (parts.length < 5) return null;
    const [colCode, batchCode, progName, semCode, cycleCode] = parts;

    try {
      // 1. Check existing session
      const { data: existing } = await client.from('exam_sessions')
        .select('id')
        .eq('context_key', contextKey)
        .maybeSingle();

      if (existing) {
        this.recordSessionMapping(existing.id, contextKey);
        return existing.id;
      }

      // 2. Lookup Master IDs
      const [colRes, yearRes, semRes, cycleRes] = await Promise.all([
        client.from('colleges').select('id').eq('code', colCode).maybeSingle(),
        client.from('academic_years').select('id').eq('code', batchCode).maybeSingle(),
        client.from('semesters').select('id').eq('code', semCode).maybeSingle(),
        client.from('exam_cycles').select('id').eq('code', cycleCode).maybeSingle()
      ]);

      const collegeId = colRes.data?.id;
      const yearId = yearRes.data?.id;
      const semId = semRes.data?.id;
      const cycleId = cycleRes.data?.id;

      if (!collegeId || !yearId || !semId || !cycleId) {
        return null;
      }

      // Lookup or insert program
      let { data: progRes } = await client.from('programs')
        .select('id')
        .match({ college_id: collegeId, name: progName })
        .maybeSingle();

      if (!progRes) {
        const { data: newP } = await client.from('programs')
          .insert({ college_id: collegeId, name: progName })
          .select('id')
          .single();
        progRes = newP;
      }

      // Create session
      const { data: newSession, error: sErr } = await client.from('exam_sessions')
        .upsert({
          context_key: contextKey,
          college_id: collegeId,
          academic_year_id: yearId,
          program_id: progRes.id,
          semester_id: semId,
          exam_cycle_id: cycleId
        }, { onConflict: 'context_key' })
        .select('id')
        .single();

      if (newSession?.id) {
        this.recordSessionMapping(newSession.id, contextKey);
      }
      return newSession?.id || null;
    } catch (err) {
      console.warn("Failed to ensure exam session:", err);
      return null;
    }
  }

  // --- Normalized Query Helpers for Users & Activities ---
  static async fetchUsersFromDatabase(client) {
    if (!client) return [];
    try {
      const { data: dbUsers, error: uErr } = await client.from('users').select(`
        *,
        user_college_assignments(college_id, is_all_colleges, colleges(code)),
        user_program_assignments(college_id, program_id, is_all_programs, colleges(code), programs(name))
      `);

      if (!uErr && dbUsers && dbUsers.length > 0) {
        return dbUsers.map(u => {
          let assignedColleges = [];
          const hasAllCols = u.user_college_assignments?.some(a => a.is_all_colleges);
          if (hasAllCols) {
            assignedColleges = ['ALL'];
          } else {
            assignedColleges = (u.user_college_assignments || [])
              .map(a => a.colleges?.code)
              .filter(code => code && !PURGED_COLLEGES.has(code));
          }

          const assignedPrograms = {};
          if (hasAllCols) {
            assignedPrograms['ALL'] = ['ALL'];
          }
          (u.user_program_assignments || []).forEach(pa => {
            const cCode = pa.colleges?.code;
            if (cCode && !PURGED_COLLEGES.has(cCode)) {
              if (!assignedPrograms[cCode]) assignedPrograms[cCode] = [];
              if (pa.is_all_programs) {
                assignedPrograms[cCode] = ['ALL'];
              } else if (pa.programs?.name && !assignedPrograms[cCode].includes('ALL')) {
                assignedPrograms[cCode].push(pa.programs.name);
              }
            }
          });

          return {
            id: u.legacy_id || u.id,
            name: u.name,
            email: u.email,
            role: u.role_code,
            isAdmin: !!u.is_admin,
            active: !!u.is_active,
            mustChangePassword: !!u.must_change_password,
            password: u.password_hash || "Pass@123",
            canImportExcel: u.can_import_excel !== undefined ? !!u.can_import_excel : !!(u.is_admin || ['COE', 'DY_COE'].includes(u.role_code)),
            canRemoveData: u.can_remove_data !== undefined ? !!u.can_remove_data : !!(u.is_admin || ['COE', 'DY_COE'].includes(u.role_code)),
            employeeId: u.employee_id || u.employeeId || "",
            sapId: u.sap_id || u.sapId || "",
            workingHoursStart: u.working_hours_start || u.workingHoursStart || "09:00",
            workingHoursEnd: u.working_hours_end || u.workingHoursEnd || "17:30",
            assignedColleges,
            assignedPrograms
          };
        });
      }
    } catch (e) {
      console.warn("Error fetching users from Supabase:", e);
    }
    return [];
  }

  static async fetchActivitiesFromDatabase(client) {
    if (!client) return [];
    try {
      const { data: dbActs, error: aErr } = await client.from('activities_master')
        .select('*')
        .order('sr_no', { ascending: true });

      if (!aErr && dbActs && dbActs.length > 0) {
        return dbActs.map(a => ({
          id: a.id,
          srNo: a.sr_no,
          name: a.name,
          phase: a.phase,
          performedBy: a.performed_by_role,
          requiredVerifiers: a.required_verifiers || [],
          cond: a.cond || 'ALL',
          examScope: a.exam_scope || 'BOTH'
        }));
      }
    } catch (e) {
      console.warn("Error fetching activities from Supabase:", e);
    }
    return [];
  }

  // --- Full Relational Sync from Supabase ---
  static async syncFromDatabase(client, localData) {
    if (!client) return { success: false, data: localData };
    try {
      let config = { ...localData.config };
      let users = [...(localData.users || [])];
      let activities = [...(localData.activities || [])];
      let contexts = { ...(localData.contexts || {}) };

      // 1. Master Configuration
      try {
        const [collegesRes, yearsRes, cyclesRes, semRes, progsRes, sysRes] = await Promise.all([
          client.from('colleges').select('id, code, name').eq('is_active', true),
          client.from('academic_years').select('code, is_current').eq('is_active', true).order('code'),
          client.from('exam_cycles').select('code').eq('is_active', true),
          client.from('semesters').select('code').order('semester_number'),
          client.from('programs').select('name, colleges!inner(code)').eq('is_active', true),
          client.from('system_config').select('config_key, config_value')
        ]);

        if (!collegesRes.error && collegesRes.data && collegesRes.data.length > 0) {
          config.colleges = collegesRes.data
            .filter(c => !PURGED_COLLEGES.has(c.code))
            .map(c => ({ id: c.code, name: c.name, code: c.code }));
        }
        if (!yearsRes.error && yearsRes.data && yearsRes.data.length > 0) {
          config.batches = yearsRes.data.map(y => y.code);
          const curr = yearsRes.data.find(y => y.is_current);
          if (curr) config.currentBatch = curr.code;
        }
        if (!cyclesRes.error && cyclesRes.data && cyclesRes.data.length > 0) {
          config.examCycles = cyclesRes.data.map(ec => ec.code);
        }
        if (!semRes.error && semRes.data && semRes.data.length > 0) {
          config.semesters = semRes.data.map(s => s.code);
        }
        if (!progsRes.error && progsRes.data && progsRes.data.length > 0) {
          const pMap = {};
          progsRes.data.forEach(p => {
            const col = p.colleges?.code;
            if (col && !PURGED_COLLEGES.has(col)) {
              if (!pMap[col]) pMap[col] = [];
              if (!pMap[col].includes(p.name)) pMap[col].push(p.name);
            }
          });
          config.programs = pMap;
        }
        let modulesCloudCache = {};
        if (!sysRes.error && sysRes.data) {
          const pSet = sysRes.data.find(s => s.config_key === 'portal_settings');
          if (pSet?.config_value) {
            config = { ...config, ...pSet.config_value };
          }
          const modCache = sysRes.data.find(s => s.config_key === 'session_modules_cache');
          if (modCache?.config_value) {
            modulesCloudCache = modCache.config_value;
          }
        }
        if (config.examCycles) {
          const normFn = typeof normalizeExamCycles === 'function' ? normalizeExamCycles : window.normalizeExamCycles;
          if (normFn) config.examCycles = normFn(config.examCycles);
        }
      } catch (cfgErr) {
        console.warn("Supabase config sync notice:", cfgErr);
      }

      // 2. Users
      try {
        const dbUsers = await this.fetchUsersFromDatabase(client);
        if (dbUsers && dbUsers.length > 0) {
          users = dbUsers;
        }
      } catch (uErr) {
        console.warn("Supabase users sync notice:", uErr);
      }

      // 3. Activities Master
      try {
        const dbActs = await this.fetchActivitiesFromDatabase(client);
        if (dbActs && dbActs.length > 0) {
          activities = dbActs;
        }
      } catch (aErr) {
        console.warn("Supabase activities sync notice:", aErr);
      }

      // 4. Exam Sessions, Metrics & Activity Logs
      try {
        const { data: dbSessions, error: sErr } = await client.from('exam_sessions').select(`
          id, context_key, exam_month_year,
          dashboard_metrics(total_students, pwd_students, debarred_students, ufm_cases, num_modules, reg_batch_students, prev_batch_students, appearing_batches, num_programs, exam_month_year, batch_year),
          activity_logs(
            id, activity_id, is_na, performed_date, performed_by_name, performed_by_email, performed_at, remarks, status,
            verification_logs(role_code, is_verified, is_revoked, verification_date, verified_at, verifier_name, verifier_email),
            query_logs(raised_by_name, raised_by_role, raised_by_email, reason, raised_at, is_resolved, resolved_by_name, resolution_notes, resolved_at),
            audit_history(legacy_id, action, role_code, user_name, user_email, date_value, details, timestamp)
          )
        `);

        if (!sErr && dbSessions && dbSessions.length > 0) {
          const nextContexts = {};
          dbSessions.forEach(sess => {
            const cKey = sess.context_key;
            if (!cKey) return;
            const colPrefix = cKey.split('__')[0];
            if (PURGED_COLLEGES.has(colPrefix)) return;
            this.recordSessionMapping(sess.id, cKey);
            const dm = Array.isArray(sess.dashboard_metrics) ? sess.dashboard_metrics[0] : sess.dashboard_metrics;
            const batchFromKey = cKey.split('__')[1] || '';
            const existingLocalMetrics = localData?.contexts?.[cKey]?.headerMetrics || {};
            const cloudCached = modulesCloudCache?.[cKey] || {};
            const headerMetrics = {
              ...existingLocalMetrics,
              batch: (dm && dm.batch_year) || existingLocalMetrics.batch || batchFromKey,
              totalStudents: dm ? (dm.total_students || 0) : (existingLocalMetrics.totalStudents || 0),
              pwdStudents: dm ? (dm.pwd_students || 0) : (existingLocalMetrics.pwdStudents || 0),
              debarredStudents: dm ? (dm.debarred_students || 0) : (existingLocalMetrics.debarredStudents || 0),
              ufmCases: dm ? (dm.ufm_cases || 0) : (existingLocalMetrics.ufmCases || 0),
              numModules: dm ? (dm.num_modules || 0) : (existingLocalMetrics.numModules || 0),
              regBatchStudents: dm ? (dm.reg_batch_students || 0) : (existingLocalMetrics.regBatchStudents || 0),
              prevBatchStudents: dm ? (dm.prev_batch_students || 0) : (existingLocalMetrics.prevBatchStudents || 0),
              appearingBatches: dm ? (dm.appearing_batches || "") : (existingLocalMetrics.appearingBatches || ""),
              numPrograms: dm ? (dm.num_programs || 1) : (existingLocalMetrics.numPrograms || 1),
              examMonthYear: (dm && dm.exam_month_year) || sess.exam_month_year || existingLocalMetrics.examMonthYear || "",
              isUploadedFromExcel: dm ? ((dm.total_students || 0) > 0) : (existingLocalMetrics.isUploadedFromExcel || false),
              modulesList: existingLocalMetrics.modulesList || cloudCached.modulesList || undefined,
              modulesBreakdown: existingLocalMetrics.modulesBreakdown || cloudCached.modulesBreakdown || undefined
            };

            const logs = {};
            (sess.activity_logs || []).forEach(al => {
              this.recordActivityLogMapping(al.id, sess.id, al.activity_id);
              const verifs = {};
              (al.verification_logs || []).forEach(vl => {
                if (!vl.is_revoked) {
                  verifs[vl.role_code] = {
                    verified: !!vl.is_verified,
                    date: vl.verification_date,
                    userName: vl.verifier_name,
                    userEmail: vl.verifier_email,
                    systemTimestamp: vl.verified_at
                  };
                }
              });

              let queryDetails = null;
              const activeQuery = (al.query_logs || []).slice(-1)[0];
              if (activeQuery) {
                queryDetails = {
                  raisedBy: activeQuery.raised_by_name,
                  role: activeQuery.raised_by_role,
                  email: activeQuery.raised_by_email,
                  reason: activeQuery.reason,
                  timestamp: activeQuery.raised_at,
                  resolved: !!activeQuery.is_resolved,
                  resolvedBy: activeQuery.resolved_by_name,
                  resolutionNotes: activeQuery.resolution_notes,
                  resolvedAt: activeQuery.resolved_at
                };
              }

              const history = (al.audit_history || []).map(h => ({
                id: h.legacy_id || String(Date.now()),
                action: h.action,
                role: h.role_code,
                userName: h.user_name,
                userEmail: h.user_email,
                dateValue: h.date_value,
                details: h.details,
                timestamp: h.timestamp
              })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

              logs[al.activity_id] = {
                performedDate: al.performed_date || null,
                performedByUser: al.performed_by_name ? {
                  name: al.performed_by_name,
                  email: al.performed_by_email,
                  timestamp: al.performed_at
                } : null,
                isNA: !!al.is_na,
                remarks: al.remarks || null,
                verifications: verifs,
                queryDetails,
                history
              };
            });

            nextContexts[cKey] = {
              headerMetrics,
              logs
            };
          });

          // Single source of truth: contexts reflect pure database state
          contexts = nextContexts;
        } else if (!sErr && Array.isArray(dbSessions) && dbSessions.length === 0) {
          contexts = {};
        }
      } catch (ctxErr) {
        console.warn("Supabase contexts sync notice:", ctxErr);
        if (localData?.contexts && Object.keys(localData.contexts).length > 0 && Object.keys(contexts).length === 0) {
          contexts = localData.contexts;
        }
      }

      const merged = { config, users, activities, contexts };
      this.saveLocalData(merged);
      return { success: true, data: merged };
    } catch (globalErr) {
      console.warn("Supabase sync global error:", globalErr);
      return { success: false, data: localData };
    }
  }

  // Backward compatibility alias
  static async syncFromFirestore(db, localData) {
    return this.syncFromDatabase(db, localData);
  }

  // --- Activity Log Persistence ---
  static async saveActivityLogToCloud(client, contextKey, activityId, logData, headerMetrics) {
    if (!client) return;
    try {
      const sessionId = await this.ensureSession(client, contextKey);
      if (!sessionId) return;

      const logPayload = {
        session_id: sessionId,
        activity_id: activityId,
        is_na: !!logData.isNA,
        performed_date: logData.performedDate || null,
        performed_by_name: logData.performedByUser?.name || null,
        performed_by_email: logData.performedByUser?.email || null,
        performed_at: logData.performedByUser?.timestamp || null,
        remarks: logData.remarks || null
      };

      const { data: actLog, error: lErr } = await client.from('activity_logs')
        .upsert(logPayload, { onConflict: 'session_id,activity_id' })
        .select('id')
        .single();

      if (lErr || !actLog) return;
      const actLogId = actLog.id;
      this.recordSessionMapping(sessionId, contextKey);
      this.recordActivityLogMapping(actLogId, sessionId, activityId);

      if (headerMetrics) {
        await this.saveHeaderMetricsToCloud(client, contextKey, headerMetrics);
      }

      if (logData.verifications) {
        for (const [role, vInfo] of Object.entries(logData.verifications)) {
          if (vInfo && vInfo.verified) {
            await client.from('verification_logs').upsert({
              activity_log_id: actLogId,
              session_id: sessionId,
              role_code: role,
              verifier_name: vInfo.userName || 'Staff Verifier',
              verifier_email: vInfo.userEmail || 'verifier@svkm.ac.in',
              verification_date: vInfo.date || new Date().toISOString().slice(0, 10),
              verified_at: vInfo.systemTimestamp || new Date().toISOString(),
              is_verified: true,
              is_revoked: false
            }, { onConflict: 'activity_log_id,role_code' });
          }
        }
      }

      if (logData.queryDetails) {
        const q = logData.queryDetails;
        const qPayload = {
          activity_log_id: actLogId,
          session_id: sessionId,
          activity_id: activityId,
          raised_by_name: q.raisedBy || 'Staff Reviewer',
          raised_by_role: q.role || 'COORD',
          raised_by_email: q.email || 'reviewer@svkm.ac.in',
          reason: q.reason || 'Activity discrepancy flagged',
          raised_at: q.timestamp || new Date().toISOString(),
          is_resolved: !!q.resolved,
          resolved_by_name: q.resolvedBy || null,
          resolution_notes: q.resolutionNotes || null,
          resolved_at: q.resolvedAt || null
        };
        const { data: existingQ } = await client
          .from('query_logs')
          .select('id')
          .eq('activity_log_id', actLogId)
          .maybeSingle();
        if (existingQ && existingQ.id) {
          await client.from('query_logs').update(qPayload).eq('id', existingQ.id);
        } else {
          await client.from('query_logs').insert(qPayload);
        }
      }

      if (logData.history && logData.history.length > 0) {
        const latest = logData.history[logData.history.length - 1];
        if (latest && latest.action) {
          await client.from('audit_history').insert({
            legacy_id: latest.id,
            session_id: sessionId,
            activity_log_id: actLogId,
            activity_id: activityId,
            action: latest.action,
            role_code: latest.role || 'ASST',
            user_name: latest.userName || '',
            user_email: latest.userEmail || '',
            date_value: latest.dateValue || null,
            details: latest.details || '',
            timestamp: latest.timestamp || new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.warn("Failed to save activity log to Supabase:", e);
    }
  }

  // --- Revoke Verification ---
  static async revokeVerificationInCloud(client, contextKey, activityId, revokedRole, updatedHistory) {
    if (!client) return;
    try {
      const sessionId = await this.ensureSession(client, contextKey);
      if (!sessionId) return;

      const { data: actLog } = await client.from('activity_logs')
        .select('id')
        .match({ session_id: sessionId, activity_id: activityId })
        .maybeSingle();

      if (!actLog) return;

      await client.from('verification_logs')
        .update({
          is_revoked: true,
          is_verified: false,
          revoked_at: new Date().toISOString()
        })
        .match({ activity_log_id: actLog.id, role_code: revokedRole });

      if (updatedHistory && updatedHistory.length > 0) {
        const latest = updatedHistory[updatedHistory.length - 1];
        if (latest) {
          await client.from('audit_history').insert({
            legacy_id: latest.id,
            session_id: sessionId,
            activity_log_id: actLog.id,
            activity_id: activityId,
            action: 'VERIFICATION_REVOKED',
            role_code: revokedRole,
            user_name: latest.userName || '',
            user_email: latest.userEmail || '',
            date_value: latest.dateValue || null,
            details: latest.details || `Revoked verification tier ${revokedRole}`,
            timestamp: latest.timestamp || new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.warn("Failed to revoke verification in Supabase:", e);
    }
  }

  // --- Bulk Activity Logs ---
  static async saveBulkActivityLogsToCloud(client, contextKey, updatesMap) {
    if (!client || !updatesMap) return;
    for (const [actId, logData] of Object.entries(updatesMap)) {
      await this.saveActivityLogToCloud(client, contextKey, actId, logData);
    }
  }

  // --- Header Metrics ---
  static async saveHeaderMetricsToCloud(client, contextKey, headerMetrics) {
    if (!client || !headerMetrics) return;
    try {
      const sessionId = await this.ensureSession(client, contextKey);
      if (!sessionId) return;

      await client.from('dashboard_metrics').upsert({
        session_id: sessionId,
        total_students: headerMetrics.totalStudents || 0,
        pwd_students: headerMetrics.pwdStudents || 0,
        debarred_students: headerMetrics.debarredStudents || 0,
        ufm_cases: headerMetrics.ufmCases || 0,
        num_modules: headerMetrics.numModules || 0,
        reg_batch_students: headerMetrics.regBatchStudents || 0,
        prev_batch_students: headerMetrics.prevBatchStudents || 0,
        appearing_batches: headerMetrics.appearingBatches || '',
        num_programs: headerMetrics.numPrograms || 1,
        exam_month_year: headerMetrics.examMonthYear || '',
        batch_year: headerMetrics.batch || ''
      }, { onConflict: 'session_id' });

      if (headerMetrics.examMonthYear) {
        await client.from('exam_sessions')
          .update({ exam_month_year: headerMetrics.examMonthYear })
          .eq('id', sessionId);
      }

      if (Array.isArray(headerMetrics.modulesList) && headerMetrics.modulesList.length > 0) {
        this.saveSessionModulesToCloud(client, contextKey, headerMetrics.modulesList, headerMetrics.modulesBreakdown).catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to save header metrics to Supabase:", e);
    }
  }

  // --- Save Session Modules to Cloud (system_config: session_modules_cache) ---
  static async saveSessionModulesToCloud(client, contextKey, modulesList, modulesBreakdown) {
    if (!client || !contextKey || !Array.isArray(modulesList)) return;
    try {
      const { data } = await client.from('system_config').select('config_value').eq('config_key', 'session_modules_cache').maybeSingle();
      const currentCache = data?.config_value || {};
      const updatedCache = {
        ...currentCache,
        [contextKey]: {
          modulesList,
          modulesBreakdown: modulesBreakdown || null,
          updatedAt: new Date().toISOString()
        }
      };
      await client.from('system_config').upsert({
        config_key: 'session_modules_cache',
        config_value: updatedCache
      }, { onConflict: 'config_key' });
    } catch (e) {
      console.warn("Failed to persist session modules cache to Supabase:", e);
    }
  }

  static async batchSaveSessionModulesToCloud(client, modulesMap) {
    if (!client || !modulesMap || Object.keys(modulesMap).length === 0) return;
    try {
      const { data } = await client.from('system_config').select('config_value').eq('config_key', 'session_modules_cache').maybeSingle();
      const currentCache = data?.config_value || {};
      const updatedCache = {
        ...currentCache,
        ...modulesMap
      };
      await client.from('system_config').upsert({
        config_key: 'session_modules_cache',
        config_value: updatedCache
      }, { onConflict: 'config_key' });
    } catch (e) {
      console.warn("Failed to batch persist session modules cache to Supabase:", e);
    }
  }

  // --- Save Context ---
  static async saveContextToCloud(client, contextKey, contextData) {
    if (!client || !contextData) return;
    try {
      const sessionId = await this.ensureSession(client, contextKey);
      if (!sessionId) return;

      if (contextData.headerMetrics) {
        await this.saveHeaderMetricsToCloud(client, contextKey, contextData.headerMetrics);
      }
      if (contextData.logs) {
        for (const [actId, logData] of Object.entries(contextData.logs)) {
          await this.saveActivityLogToCloud(client, contextKey, actId, logData);
        }
      }
    } catch (e) {
      console.warn("Failed to save context to Supabase:", e);
    }
  }

  // --- Delete Context ---
  static async deleteContextFromCloud(client, contextKey) {
    if (!client || !contextKey) return;
    try {
      await client.from('exam_sessions').delete().eq('context_key', contextKey);
    } catch (e) {
      console.warn("Failed to delete context from Supabase:", e);
    }
  }

  // --- Realtime Subscriptions (Firebase onSnapshot Parity Engine) ---
  static listenToCloudUpdates(client, callbacks = {}) {
    if (!client || !client.channel) return () => {};

    try {
      let isDestroyed = false;
      let retryCount = 0;
      let reconnectTimer = null;
      let activeChannel = null;

      let pendingContextPatches = [];
      let flushTimeout = null;

      // Micro-batch debounce: merges rapid burst events into an atomic functional React update
      const scheduleContextFlush = () => {
        if (flushTimeout) return;
        flushTimeout = setTimeout(() => {
          flushTimeout = null;
          if (pendingContextPatches.length === 0) return;
          const patches = [...pendingContextPatches];
          pendingContextPatches = [];

          if (callbacks.onContextsUpdate) {
            console.log(`%c[Realtime:StateUpdated] Dispatched ${patches.length} batched patch(es) to React contexts.`, 'color: #8b5cf6; font-weight: bold;');
            callbacks.onContextsUpdate((prevContexts) => {
              let next = { ...prevContexts };
              for (const patch of patches) {
                try {
                  next = patch(next);
                } catch (err) {
                  console.warn("[Realtime:PatchError]", err);
                }
              }
              return next;
            });
          }
        }, 20); // 20ms micro-debounce batches bursts into a single render
      };

      const queueContextPatch = (patchFn) => {
        pendingContextPatches.push(patchFn);
        scheduleContextFlush();
      };

      // Helper to apply log patches synchronously if session is cached, or asynchronously without dropping
      const applyContextLogPatch = (sessionId, activityId, logMutator) => {
        const syncKey = SupabaseService.getContextKeyForSession(sessionId);
        if (syncKey) {
          queueContextPatch((contexts) => {
            const ctx = contexts[syncKey] || { headerMetrics: {}, logs: {} };
            const prevLogs = ctx.logs || {};
            const prevLog = prevLogs[activityId] || {};
            const updatedLog = logMutator(prevLog);
            return {
              ...contexts,
              [syncKey]: {
                ...ctx,
                logs: {
                  ...prevLogs,
                  [activityId]: updatedLog
                }
              }
            };
          });
        } else {
          SupabaseService.resolveContextKey(client, sessionId).then((resolvedKey) => {
            if (!resolvedKey) return;
            queueContextPatch((contexts) => {
              const ctx = contexts[resolvedKey] || { headerMetrics: {}, logs: {} };
              const prevLogs = ctx.logs || {};
              const prevLog = prevLogs[activityId] || {};
              const updatedLog = logMutator(prevLog);
              return {
                ...contexts,
                [resolvedKey]: {
                  ...ctx,
                  logs: {
                    ...prevLogs,
                    [activityId]: updatedLog
                  }
                }
              };
            });
          });
        }
      };

      // Administrative master table debounce helpers
      let usersTimeout = null;
      const scheduleUsersUpdate = () => {
        if (usersTimeout) clearTimeout(usersTimeout);
        usersTimeout = setTimeout(async () => {
          if (callbacks.onUsersUpdate) {
            const users = await SupabaseService.fetchUsersFromDatabase(client);
            if (users && users.length > 0) callbacks.onUsersUpdate(users);
          }
        }, 60);
      };

      let activitiesTimeout = null;
      const scheduleActivitiesUpdate = () => {
        if (activitiesTimeout) clearTimeout(activitiesTimeout);
        activitiesTimeout = setTimeout(async () => {
          if (callbacks.onActivitiesUpdate) {
            const acts = await SupabaseService.fetchActivitiesFromDatabase(client);
            if (acts && acts.length > 0) callbacks.onActivitiesUpdate(acts);
          }
        }, 60);
      };

      // Auto-reconnect with exponential backoff
      const scheduleReconnect = () => {
        if (isDestroyed || reconnectTimer) return;
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 15000);
        retryCount++;
        console.warn(`%c[Realtime:Reconnect] Channel dropped. Reconnecting in ${Math.round(delay)}ms (attempt #${retryCount})...`, 'color: #f59e0b; font-weight: bold;');
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!isDestroyed) {
            connectChannel();
          }
        }, delay);
      };

      // Network online & visibility health checks
      const handleOnline = () => {
        console.log('%c[Realtime:Network] Browser back ONLINE. Reconnecting realtime channel...', 'color: #10b981; font-weight: bold;');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        retryCount = 0;
        connectChannel();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isDestroyed) {
          if (!activeChannel || activeChannel.state !== 'joined') {
            console.log('%c[Realtime:TabFocus] Tab restored. Verifying realtime socket health...', 'color: #3b82f6;');
            connectChannel();
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      const connectChannel = () => {
        if (isDestroyed) return;
        if (activeChannel) {
          try { client.removeChannel(activeChannel); } catch (e) {}
          activeChannel = null;
        }

        const channelName = 'svkm-realtime-' + Math.random().toString(36).slice(2, 9);
        const channel = client.channel(channelName)
          // 1. Activity Logs (Completion, Remarks, NA)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                if (!row || !row.session_id || !row.activity_id) return;
                SupabaseService.recordActivityLogMapping(row.id, row.session_id, row.activity_id);
                console.log(`%c[Realtime:EventReceived] activity_logs (${payload.eventType}): Activity [${row.activity_id}] in session ${row.session_id}`, 'color: #3b82f6; font-weight: bold;');

                applyContextLogPatch(row.session_id, row.activity_id, (prevLog) => ({
                  ...prevLog,
                  performedDate: row.performed_date || null,
                  performedByUser: row.performed_by_name ? {
                    name: row.performed_by_name,
                    email: row.performed_by_email,
                    timestamp: row.performed_at
                  } : null,
                  isNA: !!row.is_na,
                  remarks: row.remarks || null,
                  verifications: prevLog.verifications || {},
                  queryDetails: prevLog.queryDetails || null,
                  history: prevLog.history || []
                }));
              } else if (payload.eventType === 'DELETE') {
                const row = payload.old;
                if (!row) return;
                const mapped = SupabaseService.getActivityLogMapping(row.id);
                const sessionId = row.session_id || mapped?.sessionId;
                const activityId = row.activity_id || mapped?.activityId;
                if (!sessionId || !activityId) return;
                console.log(`%c[Realtime:EventReceived] activity_logs (DELETE): Activity [${activityId}] in session ${sessionId}`, 'color: #ef4444; font-weight: bold;');

                const syncKey = SupabaseService.getContextKeyForSession(sessionId);
                if (syncKey) {
                  queueContextPatch((contexts) => {
                    const ctx = contexts[syncKey];
                    if (!ctx || !ctx.logs || !ctx.logs[activityId]) return contexts;
                    const nextLogs = { ...ctx.logs };
                    delete nextLogs[activityId];
                    return {
                      ...contexts,
                      [syncKey]: { ...ctx, logs: nextLogs }
                    };
                  });
                }
              }
            } catch (e) {
              console.warn("Realtime activity_logs handling error:", e);
            }
          })

          // 2. Verification Logs (Multi-tier sign-off & revocations)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_logs' }, (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                if (!row || !row.role_code) return;
                let sessionId = row.session_id;
                let activityId = row.activity_id;
                if (!activityId && row.activity_log_id) {
                  const mapped = SupabaseService.getActivityLogMapping(row.activity_log_id);
                  activityId = mapped?.activityId;
                  sessionId = sessionId || mapped?.sessionId;
                }
                if (!sessionId || !activityId) return;

                const isVerified = !!row.is_verified && !row.is_revoked;
                console.log(`%c[Realtime:EventReceived] verification_logs (${payload.eventType}): Activity [${activityId}] Role [${row.role_code}] Verified: ${isVerified}`, 'color: #3b82f6; font-weight: bold;');

                applyContextLogPatch(sessionId, activityId, (prevLog) => {
                  const prevVerifs = { ...(prevLog.verifications || {}) };
                  if (isVerified) {
                    prevVerifs[row.role_code] = {
                      verified: true,
                      date: row.verification_date,
                      userName: row.verifier_name,
                      userEmail: row.verifier_email,
                      systemTimestamp: row.verified_at
                    };
                  } else {
                    delete prevVerifs[row.role_code];
                  }
                  return {
                    ...prevLog,
                    verifications: prevVerifs
                  };
                });
              } else if (payload.eventType === 'DELETE') {
                const row = payload.old;
                if (!row || !row.role_code) return;
                let sessionId = row.session_id;
                let activityId = row.activity_id;
                if ((!sessionId || !activityId) && row.activity_log_id) {
                  const mapped = SupabaseService.getActivityLogMapping(row.activity_log_id);
                  activityId = activityId || mapped?.activityId;
                  sessionId = sessionId || mapped?.sessionId;
                }
                if (!sessionId || !activityId) return;
                console.log(`%c[Realtime:EventReceived] verification_logs (DELETE): Activity [${activityId}] Role [${row.role_code}]`, 'color: #ef4444; font-weight: bold;');

                applyContextLogPatch(sessionId, activityId, (prevLog) => {
                  const prevVerifs = { ...(prevLog.verifications || {}) };
                  delete prevVerifs[row.role_code];
                  return {
                    ...prevLog,
                    verifications: prevVerifs
                  };
                });
              }
            } catch (e) {
              console.warn("Realtime verification_logs handling error:", e);
            }
          })

          // 3. Query Logs (Discrepancy flagging and resolution)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'query_logs' }, (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                let sessionId = row.session_id;
                let activityId = row.activity_id;
                if ((!sessionId || !activityId) && row.activity_log_id) {
                  const mapped = SupabaseService.getActivityLogMapping(row.activity_log_id);
                  activityId = activityId || mapped?.activityId;
                  sessionId = sessionId || mapped?.sessionId;
                }
                if (!sessionId || !activityId) return;

                console.log(`%c[Realtime:EventReceived] query_logs (${payload.eventType}): Activity [${activityId}] Resolved: ${!!row.is_resolved}`, 'color: #3b82f6; font-weight: bold;');
                const queryDetails = {
                  raisedBy: row.raised_by_name || '',
                  role: row.raised_by_role || '',
                  email: row.raised_by_email || '',
                  reason: row.reason || '',
                  timestamp: row.raised_at || new Date().toISOString(),
                  resolved: !!row.is_resolved,
                  resolvedBy: row.resolved_by_name || null,
                  resolutionNotes: row.resolution_notes || null,
                  resolvedAt: row.resolved_at || null
                };

                applyContextLogPatch(sessionId, activityId, (prevLog) => ({
                  ...prevLog,
                  queryDetails
                }));
              } else if (payload.eventType === 'DELETE') {
                const row = payload.old;
                let sessionId = row?.session_id;
                let activityId = row?.activity_id;
                if ((!sessionId || !activityId) && row?.activity_log_id) {
                  const mapped = SupabaseService.getActivityLogMapping(row.activity_log_id);
                  activityId = activityId || mapped?.activityId;
                  sessionId = sessionId || mapped?.sessionId;
                }
                if (!sessionId || !activityId) return;
                console.log(`%c[Realtime:EventReceived] query_logs (DELETE): Activity [${activityId}]`, 'color: #ef4444; font-weight: bold;');

                applyContextLogPatch(sessionId, activityId, (prevLog) => ({
                  ...prevLog,
                  queryDetails: null
                }));
              }
            } catch (e) {
              console.warn("Realtime query_logs handling error:", e);
            }
          })

          // 4. Dashboard Metrics (Session Header Counts & Exam Month/Year)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_metrics' }, (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                if (!row || !row.session_id) return;
                console.log(`%c[Realtime:EventReceived] dashboard_metrics (${payload.eventType}): Session ${row.session_id}`, 'color: #3b82f6; font-weight: bold;');

                const headerMetrics = {
                  batch: row.batch_year || '',
                  totalStudents: row.total_students || 0,
                  pwdStudents: row.pwd_students || 0,
                  debarredStudents: row.debarred_students || 0,
                  ufmCases: row.ufm_cases || 0,
                  numModules: row.num_modules || 0,
                  regBatchStudents: row.reg_batch_students || 0,
                  prevBatchStudents: row.prev_batch_students || 0,
                  appearingBatches: row.appearing_batches || '',
                  numPrograms: row.num_programs || 1,
                  examMonthYear: row.exam_month_year || ''
                };

                const syncKey = SupabaseService.getContextKeyForSession(row.session_id);
                if (syncKey) {
                  queueContextPatch((contexts) => {
                    const ctx = contexts[syncKey] || { headerMetrics: {}, logs: {} };
                    return {
                      ...contexts,
                      [syncKey]: {
                        ...ctx,
                        headerMetrics: {
                          ...(ctx.headerMetrics || {}),
                          ...headerMetrics
                        }
                      }
                    };
                  });
                } else {
                  SupabaseService.resolveContextKey(client, row.session_id).then((resolvedKey) => {
                    if (!resolvedKey) return;
                    queueContextPatch((contexts) => {
                      const ctx = contexts[resolvedKey] || { headerMetrics: {}, logs: {} };
                      return {
                        ...contexts,
                        [resolvedKey]: {
                          ...ctx,
                          headerMetrics: {
                            ...(ctx.headerMetrics || {}),
                            ...headerMetrics
                          }
                        }
                      };
                    });
                  });
                }
              }
            } catch (e) {
              console.warn("Realtime dashboard_metrics handling error:", e);
            }
          })

          // 5. Audit History (Forensic Activity History Append)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_history' }, (payload) => {
            try {
              const row = payload.new;
              if (!row || !row.session_id) return;
              let activityId = row.activity_id;
              if (!activityId && row.activity_log_id) {
                activityId = SupabaseService.getActivityLogMapping(row.activity_log_id)?.activityId;
              }
              if (!activityId) return;

              console.log(`%c[Realtime:EventReceived] audit_history (INSERT): Activity [${activityId}] Action [${row.action}]`, 'color: #3b82f6; font-weight: bold;');
              const entry = {
                id: row.legacy_id || row.id || String(Date.now()),
                action: row.action,
                role: row.role_code,
                userName: row.user_name,
                userEmail: row.user_email,
                dateValue: row.date_value,
                details: row.details,
                timestamp: row.timestamp || new Date().toISOString()
              };

              applyContextLogPatch(row.session_id, activityId, (prevLog) => {
                const curHistory = prevLog.history || [];
                const exists = curHistory.some(h => (h.id && h.id === entry.id) || (h.timestamp === entry.timestamp && h.action === entry.action));
                if (exists) return prevLog;
                return {
                  ...prevLog,
                  history: [...curHistory, entry]
                };
              });
            } catch (e) {
              console.warn("Realtime audit_history handling error:", e);
            }
          })

          // 6. Exam Sessions (New context creation, month/year maintenance, deletion)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                if (!row || !row.context_key) return;
                const colPrefix = row.context_key.split('__')[0];
                if (colPrefix && ['MITHIBAI', 'MBC', 'DJSCE'].includes(colPrefix)) return;
                SupabaseService.recordSessionMapping(row.id, row.context_key);
                console.log(`%c[Realtime:EventReceived] exam_sessions (${payload.eventType}): ContextKey: ${row.context_key}`, 'color: #3b82f6; font-weight: bold;');

                queueContextPatch((contexts) => {
                  if (contexts[row.context_key]) {
                    if (row.exam_month_year) {
                      const cur = contexts[row.context_key];
                      return {
                        ...contexts,
                        [row.context_key]: {
                          ...cur,
                          headerMetrics: {
                            ...(cur.headerMetrics || {}),
                            examMonthYear: row.exam_month_year
                          }
                        }
                      };
                    }
                    return contexts;
                  }
                  return {
                    ...contexts,
                    [row.context_key]: { headerMetrics: { examMonthYear: row.exam_month_year || '' }, logs: {} }
                  };
                });
              } else if (payload.eventType === 'DELETE') {
                const row = payload.old;
                const cKey = row?.context_key || (row?.id && SupabaseService.getContextKeyForSession(row.id));
                if (!cKey) return;
                console.log(`%c[Realtime:EventReceived] exam_sessions (DELETE): ContextKey: ${cKey}`, 'color: #ef4444; font-weight: bold;');

                queueContextPatch((contexts) => {
                  if (!contexts[cKey]) return contexts;
                  const next = { ...contexts };
                  delete next[cKey];
                  return next;
                });
              }
            } catch (e) {
              console.warn("Realtime exam_sessions handling error:", e);
            }
          })

          // 7. Users (Staff Account Provisioning & Role Assignments)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            console.log('%c[Realtime:EventReceived] users change detected. Triggering debounced refresh.', 'color: #3b82f6;');
            scheduleUsersUpdate();
          })

          // 8. Activities Master (Catalog Changes)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'activities_master' }, () => {
            console.log('%c[Realtime:EventReceived] activities_master change detected. Triggering debounced refresh.', 'color: #3b82f6;');
            scheduleActivitiesUpdate();
          })

          // 9. System Config (Portal Settings & Batches)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, (payload) => {
            try {
              const row = payload.new;
              if (row && row.config_key === 'portal_settings' && row.config_value) {
                console.log('%c[Realtime:EventReceived] system_config portal_settings updated.', 'color: #3b82f6;');
                if (callbacks.onConfigUpdate) {
                  callbacks.onConfigUpdate(row.config_value);
                }
              }
            } catch (e) {
              console.warn("Realtime system_config handling error:", e);
            }
          })

          // Realtime WebSocket Channel Status Handler with Auto-Reconnect
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              retryCount = 0;
              console.log(`%c[Realtime:Subscribed] Connected to Supabase Realtime channel (${channelName}). Parity with Firebase onSnapshot() active.`, 'color: #10b981; font-weight: bold;');
              if (callbacks.onStatusChange) callbacks.onStatusChange('CONNECTED');
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.warn(`%c[Realtime:ChannelError] Supabase Realtime channel status: ${status}`, 'color: #f59e0b; font-weight: bold;', err);
              if (callbacks.onStatusChange) callbacks.onStatusChange('LOCAL_FALLBACK');
              scheduleReconnect();
            } else if (status === 'CLOSED') {
              console.warn(`%c[Realtime:Closed] Supabase Realtime channel closed.`, 'color: #ef4444; font-weight: bold;');
              if (callbacks.onStatusChange) callbacks.onStatusChange('DISCONNECTED');
              scheduleReconnect();
            }
          });

        activeChannel = channel;
      };

      connectChannel();

      return () => {
        isDestroyed = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (flushTimeout) clearTimeout(flushTimeout);
        if (usersTimeout) clearTimeout(usersTimeout);
        if (activitiesTimeout) clearTimeout(activitiesTimeout);
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', handleOnline);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        if (activeChannel) {
          try {
            client.removeChannel(activeChannel);
          } catch (e) {}
          activeChannel = null;
        }
      };
    } catch (err) {
      console.warn("Error attaching Supabase Realtime listeners:", err);
      return () => {};
    }
  }

  // --- Staff User Operations ---
  static async saveUserToCloud(client, user) {
    if (!client || !user) return { success: false, error: 'No client or user' };
    try {
      // 1. Resolve role_id from roles table
      let roleId = null;
      if (user.role) {
        const { data: r } = await client.from('roles').select('id').eq('code', user.role).maybeSingle();
        if (r) roleId = r.id;
      }

      // 2. Check if user already exists by email, legacy_id or id
      let existingUser = null;
      if (user.email) {
        const { data: byEmail } = await client.from('users').select('id, legacy_id, email').eq('email', user.email).maybeSingle();
        if (byEmail) existingUser = byEmail;
      }
      if (!existingUser && user.id) {
        const { data: byId } = await client.from('users').select('id, legacy_id, email').or(`legacy_id.eq.${user.id},id.eq.${user.id}`).maybeSingle();
        if (byId) existingUser = byId;
      }

      let dbUserId = null;

      if (existingUser) {
        // Safe UPDATE to prevent 409 unique constraint errors on legacy_id
        dbUserId = existingUser.id;
        const updatePayload = {
          name: user.name,
          role_code: user.role,
          role_id: roleId,
          is_admin: !!user.isAdmin,
          is_active: user.active !== false,
          must_change_password: !!user.mustChangePassword
        };
        if (user.password) {
          updatePayload.password_hash = user.password;
        }
        if (user.employeeId !== undefined) updatePayload.employee_id = user.employeeId || null;
        if (user.sapId !== undefined) updatePayload.sap_id = user.sapId || null;
        if (user.workingHoursStart !== undefined) updatePayload.working_hours_start = user.workingHoursStart || null;
        if (user.workingHoursEnd !== undefined) updatePayload.working_hours_end = user.workingHoursEnd || null;
        if (user.canImportExcel !== undefined) updatePayload.can_import_excel = !!user.canImportExcel;
        if (user.canRemoveData !== undefined) updatePayload.can_remove_data = !!user.canRemoveData;

        let { error: uErr } = await client.from('users')
          .update(updatePayload)
          .eq('id', existingUser.id);

        // Fallback: If DB does not have the new columns yet (error 42703), retry without them
        if (uErr && (uErr.code === '42703' || String(uErr.message).includes('column') || String(uErr.message).includes('schema cache'))) {
          delete updatePayload.employee_id;
          delete updatePayload.sap_id;
          delete updatePayload.working_hours_start;
          delete updatePayload.working_hours_end;
          delete updatePayload.can_import_excel;
          delete updatePayload.can_remove_data;
          const retry = await client.from('users').update(updatePayload).eq('id', existingUser.id);
          uErr = retry.error;
        }

        if (uErr) {
          console.error("Error updating user in Supabase:", uErr);
          return { success: false, error: uErr };
        }
      } else {
        // Safe INSERT for brand-new staff user
        const insertPayload = {
          legacy_id: user.id || `user_${Date.now()}`,
          name: user.name,
          email: user.email,
          role_code: user.role,
          role_id: roleId,
          is_admin: !!user.isAdmin,
          is_active: user.active !== false,
          must_change_password: !!user.mustChangePassword,
          password_hash: user.password || "Pass@123",
          employee_id: user.employeeId || null,
          sap_id: user.sapId || null,
          working_hours_start: user.workingHoursStart || null,
          working_hours_end: user.workingHoursEnd || null,
          can_import_excel: user.canImportExcel !== undefined ? !!user.canImportExcel : false,
          can_remove_data: user.canRemoveData !== undefined ? !!user.canRemoveData : false
        };
        let { data: inserted, error: iErr } = await client.from('users')
          .insert(insertPayload)
          .select('id')
          .single();

        // Fallback: If DB does not have the new columns yet, retry without them
        if (iErr && (iErr.code === '42703' || String(iErr.message).includes('column') || String(iErr.message).includes('schema cache'))) {
          delete insertPayload.employee_id;
          delete insertPayload.sap_id;
          delete insertPayload.working_hours_start;
          delete insertPayload.working_hours_end;
          delete insertPayload.can_import_excel;
          delete insertPayload.can_remove_data;
          const retry = await client.from('users').insert(insertPayload).select('id').single();
          inserted = retry.data;
          iErr = retry.error;
        }

        if (iErr) {
          console.error("Error inserting user in Supabase:", iErr);
          return { success: false, error: iErr };
        }
        dbUserId = inserted?.id;
      }

      if (!dbUserId) return { success: false, error: 'Could not obtain user ID' };

      // 3. Persist user_college_assignments
      if (user.assignedColleges) {
        await client.from('user_college_assignments').delete().eq('user_id', dbUserId);
        if (user.assignedColleges.includes('ALL')) {
          await client.from('user_college_assignments').insert({
            user_id: dbUserId,
            is_all_colleges: true
          });
        } else {
          for (const colCode of user.assignedColleges) {
            const { data: c } = await client.from('colleges').select('id').eq('code', colCode).maybeSingle();
            if (c) {
              await client.from('user_college_assignments').insert({
                user_id: dbUserId,
                college_id: c.id,
                is_all_colleges: false
              });
            }
          }
        }
      }

      // 4. Persist user_program_assignments
      if (user.assignedPrograms) {
        await client.from('user_program_assignments').delete().eq('user_id', dbUserId);
        for (const [colCode, progList] of Object.entries(user.assignedPrograms)) {
          if (!Array.isArray(progList) || progList.length === 0) continue;

          if (colCode === 'ALL') {
            const { data: activeCols } = await client.from('colleges').select('id').eq('is_active', true);
            for (const ac of (activeCols || [])) {
              await client.from('user_program_assignments').insert({
                user_id: dbUserId,
                college_id: ac.id,
                is_all_programs: true
              });
            }
          } else {
            const { data: c } = await client.from('colleges').select('id').eq('code', colCode).maybeSingle();
            if (c) {
              if (progList.includes('ALL')) {
                await client.from('user_program_assignments').insert({
                  user_id: dbUserId,
                  college_id: c.id,
                  is_all_programs: true
                });
              } else {
                for (const pName of progList) {
                  const { data: p } = await client.from('programs')
                    .select('id')
                    .eq('college_id', c.id)
                    .eq('name', pName)
                    .maybeSingle();
                  if (p) {
                    await client.from('user_program_assignments').insert({
                      user_id: dbUserId,
                      college_id: c.id,
                      program_id: p.id,
                      is_all_programs: false
                    });
                  }
                }
              }
            }
          }
        }
      }

      return { success: true };
    } catch (e) {
      console.warn("Failed to save user to Supabase:", e);
      return { success: false, error: e };
    }
  }

  static async deleteUserFromCloud(client, userId) {
    if (!client || !userId) return;
    try {
      await client.from('users').delete().or(`legacy_id.eq.${userId},id.eq.${userId}`);
    } catch (e) {
      console.warn("Failed to delete user from Supabase:", e);
    }
  }

  // --- Config Operations ---
  static async saveConfigToCloud(client, config) {
    if (!client || !config) return;
    try {
      await client.from('system_config').upsert({
        config_key: 'portal_settings',
        config_value: config,
        description: 'Global portal settings and active academic batch'
      }, { onConflict: 'config_key' });
    } catch (e) {
      console.warn("Failed to save config to Supabase:", e);
    }
  }

  // --- Activities Master Operations ---
  static async saveActivitiesToCloud(client, activities) {
    if (!client || !activities) return;
    try {
      for (const a of activities) {
        await client.from('activities_master').upsert({
          id: a.id,
          sr_no: a.srNo,
          name: a.name,
          phase: a.phase,
          performed_by_role: a.performedBy,
          required_verifiers: a.requiredVerifiers || [],
          cond: a.cond || 'ALL',
          exam_scope: a.examScope || 'BOTH'
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn("Failed to save activities to Supabase:", e);
    }
  }
}

// Export for module systems and make globally available on window
if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
  window.StorageService = SupabaseService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SupabaseService };
}

export const StorageService = SupabaseService;
if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
  window.StorageService = StorageService;
}
