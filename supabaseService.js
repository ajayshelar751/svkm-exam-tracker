/**
 * SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
 * SUPABASE SERVICE LAYER
 * 
 * Replaces Firebase Firestore & Auth with Supabase PostgreSQL & Auth.
 * Normalized relational mapping, offline-first fallback caching,
 * and high-concurrency WebSocket subscriptions.
 */

class SupabaseService {
  static LOCAL_KEY = 'svkm_exam_portal_v1';
  static _supabaseClient = null;

  // --- Local Storage Caching ---
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

  // --- Configuration Management ---
  static getSupabaseConfig() {
    try {
      const savedUrl = localStorage.getItem('svkm_supabase_url');
      const savedKey = localStorage.getItem('svkm_supabase_anon_key');
      return {
        url: savedUrl || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || "https://wfkjekwxmodyzncytyqq.supabase.co",
        anonKey: savedKey || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || "sb_publishable_evpiRRWqkrlBwWud2F6eIg_6oE3HnLs"
      };
    } catch (e) {
      return (window.SUPABASE_CONFIG || { url: '', anonKey: '' });
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
    if (!window.supabase) {
      console.warn("Supabase SDK (@supabase/supabase-js) not detected. Running in Local Fallback mode.");
      return null;
    }
    const cfg = this.getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey || cfg.url.includes("placeholder")) {
      console.warn("Supabase configuration missing or placeholder. Running in Local Fallback mode.");
      return null;
    }
    try {
      const client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      this._supabaseClient = client;

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
      if (window.verifyPassword) {
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

      if (existing) return existing.id;

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

      return newSession?.id || null;
    } catch (err) {
      console.warn("Failed to ensure exam session:", err);
      return null;
    }
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
          config.colleges = collegesRes.data.map(c => ({ id: c.code, name: c.name, code: c.code }));
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
            if (col) {
              if (!pMap[col]) pMap[col] = [];
              if (!pMap[col].includes(p.name)) pMap[col].push(p.name);
            }
          });
          config.programs = pMap;
        }
        if (!sysRes.error && sysRes.data) {
          const pSet = sysRes.data.find(s => s.config_key === 'portal_settings');
          if (pSet?.config_value) {
            config = { ...config, ...pSet.config_value };
          }
        }
        if (window.normalizeExamCycles && config.examCycles) {
          config.examCycles = window.normalizeExamCycles(config.examCycles);
        }
      } catch (cfgErr) {
        console.warn("Supabase config sync notice:", cfgErr);
      }

      // 2. Users
      try {
        const { data: dbUsers, error: uErr } = await client.from('users').select(`
          id, legacy_id, name, email, role_code, is_admin, is_active, must_change_password, password_hash,
          user_college_assignments(college_id, is_all_colleges, colleges(code)),
          user_program_assignments(college_id, program_id, is_all_programs, colleges(code), programs(name))
        `);

        if (!uErr && dbUsers && dbUsers.length > 0) {
          users = dbUsers.map(u => {
            let assignedColleges = [];
            const hasAllCols = u.user_college_assignments?.some(a => a.is_all_colleges);
            if (hasAllCols) {
              assignedColleges = ['ALL'];
            } else {
              assignedColleges = (u.user_college_assignments || []).map(a => a.colleges?.code).filter(Boolean);
            }

            const assignedPrograms = {};
            (u.user_program_assignments || []).forEach(pa => {
              const cCode = pa.colleges?.code;
              if (cCode) {
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
              assignedColleges,
              assignedPrograms
            };
          });
        }
      } catch (uErr) {
        console.warn("Supabase users sync notice:", uErr);
      }

      // 3. Activities Master
      try {
        const { data: dbActs, error: aErr } = await client.from('activities_master')
          .select('*')
          .order('sr_no', { ascending: true });

        if (!aErr && dbActs && dbActs.length > 0) {
          activities = dbActs.map(a => ({
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
            const dm = Array.isArray(sess.dashboard_metrics) ? sess.dashboard_metrics[0] : sess.dashboard_metrics;
            const headerMetrics = dm ? {
              batch: dm.batch_year,
              totalStudents: dm.total_students || 0,
              pwdStudents: dm.pwd_students || 0,
              debarredStudents: dm.debarred_students || 0,
              ufmCases: dm.ufm_cases || 0,
              numModules: dm.num_modules || 0,
              regBatchStudents: dm.reg_batch_students || 0,
              prevBatchStudents: dm.prev_batch_students || 0,
              appearingBatches: dm.appearing_batches || "",
              numPrograms: dm.num_programs || 1,
              examMonthYear: dm.exam_month_year || sess.exam_month_year || ""
            } : {};

            const logs = {};
            (sess.activity_logs || []).forEach(al => {
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

          contexts = { ...contexts, ...nextContexts };
        }
      } catch (ctxErr) {
        console.warn("Supabase contexts sync notice:", ctxErr);
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
              verifier_email: vInfo.userEmail || '',
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
        await client.from('query_logs').upsert({
          activity_log_id: actLogId,
          session_id: sessionId,
          activity_id: activityId,
          raised_by_name: q.raisedBy || '',
          raised_by_role: q.role || '',
          raised_by_email: q.email || '',
          reason: q.reason || '',
          raised_at: q.timestamp || new Date().toISOString(),
          is_resolved: !!q.resolved,
          resolved_by_name: q.resolvedBy || null,
          resolution_notes: q.resolutionNotes || null,
          resolved_at: q.resolvedAt || null
        }, { onConflict: 'activity_log_id' });
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
    } catch (e) {
      console.warn("Failed to save header metrics to Supabase:", e);
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

  // --- Realtime Subscriptions ---
  static listenToCloudUpdates(client, callbacks = {}) {
    if (!client || !client.channel) return () => {};
    try {
      const channel = client.channel('svkm-exam-portal-realtime-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, payload => {
          if (callbacks.onContextsUpdate) callbacks.onContextsUpdate(null, payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_logs' }, payload => {
          if (callbacks.onContextsUpdate) callbacks.onContextsUpdate(null, payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'query_logs' }, payload => {
          if (callbacks.onContextsUpdate) callbacks.onContextsUpdate(null, payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_metrics' }, payload => {
          if (callbacks.onContextsUpdate) callbacks.onContextsUpdate(null, payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
          if (callbacks.onUsersUpdate) {
            const res = await client.from('users').select('*');
            if (!res.error && res.data) callbacks.onUsersUpdate(res.data);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities_master' }, async () => {
          if (callbacks.onActivitiesUpdate) {
            const res = await client.from('activities_master').select('*').order('sr_no');
            if (!res.error && res.data) callbacks.onActivitiesUpdate(res.data);
          }
        })
        .subscribe();

      return () => {
        try { client.removeChannel(channel); } catch (e) {}
      };
    } catch (err) {
      console.warn("Error attaching Supabase Realtime listeners:", err);
      return () => {};
    }
  }

  // --- Staff User Operations ---
  static async saveUserToCloud(client, user) {
    if (!client || !user) return;
    try {
      const { data: dbUser, error } = await client.from('users').upsert({
        legacy_id: user.id,
        name: user.name,
        email: user.email,
        role_code: user.role,
        is_admin: !!user.isAdmin,
        is_active: user.active !== false,
        must_change_password: !!user.mustChangePassword,
        password_hash: user.password
      }, { onConflict: 'email' }).select('id').single();

      if (!error && dbUser && user.assignedColleges) {
        await client.from('user_college_assignments').delete().eq('user_id', dbUser.id);
        if (user.assignedColleges.includes('ALL')) {
          await client.from('user_college_assignments').insert({ user_id: dbUser.id, is_all_colleges: true });
        } else {
          for (const col of user.assignedColleges) {
            const { data: c } = await client.from('colleges').select('id').eq('code', col).maybeSingle();
            if (c) {
              await client.from('user_college_assignments').insert({ user_id: dbUser.id, college_id: c.id, is_all_colleges: false });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to save user to Supabase:", e);
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
