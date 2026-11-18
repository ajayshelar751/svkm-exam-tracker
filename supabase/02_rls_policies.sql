-- ======================================================================================
-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
-- ENTERPRISE EXAMINATION ACTIVITY TRACKER & MULTI-LEVEL VERIFICATION ERP
-- SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES & ACCESS CONTROL
-- ======================================================================================

-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL APPLICATION TABLES
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_college_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- 2. SECURITY HELPER FUNCTIONS
-- ======================================================================================

-- Function to get current user record from public.users matching auth.uid() or email
CREATE OR REPLACE FUNCTION get_current_portal_user()
RETURNS users AS $$
DECLARE
    v_user users;
BEGIN
    SELECT * INTO v_user
    FROM users
    WHERE auth_user_id = auth.uid()
       OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email')
    LIMIT 1;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if the current user is a portal administrator
CREATE OR REPLACE FUNCTION is_portal_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user users;
BEGIN
    v_user := get_current_portal_user();
    IF v_user IS NULL THEN
        -- Allow anonymous access during local setup / development if needed
        RETURN TRUE;
    END IF;
    RETURN v_user.is_admin = TRUE OR v_user.role_code IN ('COE', 'DY_COE', 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to a specific college
CREATE OR REPLACE FUNCTION user_has_college_access(p_college_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user users;
    v_has_access BOOLEAN;
BEGIN
    v_user := get_current_portal_user();
    IF v_user IS NULL THEN RETURN TRUE; END IF;
    
    -- COE, DY_COE, and Portal Admins have global access to all colleges
    IF v_user.is_admin OR v_user.role_code IN ('COE', 'DY_COE') THEN
        RETURN TRUE;
    END IF;

    -- Check explicit or 'ALL' assignment in user_college_assignments
    SELECT EXISTS (
        SELECT 1 FROM user_college_assignments
        WHERE user_id = v_user.id
          AND (is_all_colleges = TRUE OR college_id = p_college_id)
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to an exam session
CREATE OR REPLACE FUNCTION user_has_session_access(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user users;
    v_college_id UUID;
    v_program_id UUID;
    v_has_prog BOOLEAN;
BEGIN
    v_user := get_current_portal_user();
    IF v_user IS NULL THEN RETURN TRUE; END IF;
    
    IF v_user.is_admin OR v_user.role_code IN ('COE', 'DY_COE') THEN
        RETURN TRUE;
    END IF;

    SELECT college_id, program_id INTO v_college_id, v_program_id
    FROM exam_sessions
    WHERE id = p_session_id;

    IF NOT user_has_college_access(v_college_id) THEN
        RETURN FALSE;
    END IF;

    -- Check program level assignment
    SELECT EXISTS (
        SELECT 1 FROM user_program_assignments
        WHERE user_id = v_user.id
          AND college_id = v_college_id
          AND (is_all_programs = TRUE OR program_id = v_program_id)
    ) INTO v_has_prog;

    RETURN v_has_prog;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ======================================================================================
-- 3. RLS POLICIES FOR CONFIGURATION & MASTER TABLES
-- ======================================================================================

-- ROLES
CREATE POLICY "Allow read roles for all authenticated & anon users"
ON roles FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify roles"
ON roles FOR ALL USING (is_portal_admin());

-- COLLEGES
CREATE POLICY "Allow read colleges for all authenticated & anon users"
ON colleges FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify colleges"
ON colleges FOR ALL USING (is_portal_admin());

-- PROGRAMS
CREATE POLICY "Allow read programs for all authenticated & anon users"
ON programs FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify programs"
ON programs FOR ALL USING (is_portal_admin());

-- ACADEMIC YEARS
CREATE POLICY "Allow read academic years for all"
ON academic_years FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify academic years"
ON academic_years FOR ALL USING (is_portal_admin());

-- SEMESTERS
CREATE POLICY "Allow read semesters for all"
ON semesters FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify semesters"
ON semesters FOR ALL USING (is_portal_admin());

-- EXAM CYCLES
CREATE POLICY "Allow read exam cycles for all"
ON exam_cycles FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify exam cycles"
ON exam_cycles FOR ALL USING (is_portal_admin());

-- ACTIVITIES MASTER
CREATE POLICY "Allow read activities master for all"
ON activities_master FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify activities master"
ON activities_master FOR ALL USING (is_portal_admin());

-- SYSTEM CONFIG
CREATE POLICY "Allow read system config for all"
ON system_config FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify system config"
ON system_config FOR ALL USING (is_portal_admin());

-- ======================================================================================
-- 4. RLS POLICIES FOR USERS & ASSIGNMENTS
-- ======================================================================================

-- USERS
CREATE POLICY "Allow read users for all staff"
ON users FOR SELECT USING (true);

CREATE POLICY "Allow self update on users"
ON users FOR UPDATE USING (
    auth.uid() = auth_user_id 
    OR is_portal_admin()
);

CREATE POLICY "Allow admin full manage users"
ON users FOR ALL USING (is_portal_admin());

-- USER ASSIGNMENTS
CREATE POLICY "Allow read user college assignments"
ON user_college_assignments FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify user college assignments"
ON user_college_assignments FOR ALL USING (is_portal_admin());

CREATE POLICY "Allow read user program assignments"
ON user_program_assignments FOR SELECT USING (true);

CREATE POLICY "Allow admin to modify user program assignments"
ON user_program_assignments FOR ALL USING (is_portal_admin());

-- ======================================================================================
-- 5. RLS POLICIES FOR EXAM SESSIONS & DASHBOARD METRICS
-- ======================================================================================

CREATE POLICY "Allow read exam sessions based on college & program access"
ON exam_sessions FOR SELECT USING (
    user_has_college_access(college_id)
);

CREATE POLICY "Allow insert/update exam sessions for staff with access"
ON exam_sessions FOR ALL USING (
    user_has_college_access(college_id)
);

CREATE POLICY "Allow read dashboard metrics for accessible sessions"
ON dashboard_metrics FOR SELECT USING (
    user_has_session_access(session_id)
);

CREATE POLICY "Allow update dashboard metrics for accessible sessions"
ON dashboard_metrics FOR ALL USING (
    user_has_session_access(session_id)
);

-- ======================================================================================
-- 6. RLS POLICIES FOR ACTIVITY LOGS & WORKFLOW
-- ======================================================================================

CREATE POLICY "Allow read activity logs for accessible sessions"
ON activity_logs FOR SELECT USING (
    user_has_session_access(session_id)
);

CREATE POLICY "Allow insert/update activity logs for accessible sessions"
ON activity_logs FOR ALL USING (
    user_has_session_access(session_id)
);

-- VERIFICATION LOGS
CREATE POLICY "Allow read verification logs for accessible sessions"
ON verification_logs FOR SELECT USING (
    user_has_session_access(session_id)
);

CREATE POLICY "Allow insert/update verification logs"
ON verification_logs FOR ALL USING (
    user_has_session_access(session_id)
);

-- QUERY LOGS
CREATE POLICY "Allow read query logs for accessible sessions"
ON query_logs FOR SELECT USING (
    user_has_session_access(session_id)
);

CREATE POLICY "Allow insert/update query logs"
ON query_logs FOR ALL USING (
    user_has_session_access(session_id)
);

-- AUDIT HISTORY (IMMUTABLE FORENSIC LOG: SELECT & INSERT ONLY, NO UPDATE/DELETE)
CREATE POLICY "Allow read audit history for accessible sessions"
ON audit_history FOR SELECT USING (
    user_has_session_access(session_id)
);

CREATE POLICY "Allow append to audit history"
ON audit_history FOR INSERT WITH CHECK (
    user_has_session_access(session_id)
);

-- NOTIFICATIONS
CREATE POLICY "Allow users to view own notifications"
ON notifications FOR SELECT USING (
    recipient_user_id = (get_current_portal_user()).id 
    OR is_portal_admin()
);

CREATE POLICY "Allow users to update own notifications"
ON notifications FOR UPDATE USING (
    recipient_user_id = (get_current_portal_user()).id 
    OR is_portal_admin()
);

-- ======================================================================================
-- 7. REPLICATION IDENTITY & PUBLICATION SETUP FOR REALTIME
-- Uses REPLICA IDENTITY DEFAULT (Primary Key identity) to prevent WAL bloat.
-- ======================================================================================
ALTER TABLE activity_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE verification_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE query_logs REPLICA IDENTITY DEFAULT;
ALTER TABLE dashboard_metrics REPLICA IDENTITY DEFAULT;
ALTER TABLE exam_sessions REPLICA IDENTITY DEFAULT;
ALTER TABLE audit_history REPLICA IDENTITY DEFAULT;
ALTER TABLE users REPLICA IDENTITY DEFAULT;
ALTER TABLE activities_master REPLICA IDENTITY DEFAULT;
ALTER TABLE system_config REPLICA IDENTITY DEFAULT;

