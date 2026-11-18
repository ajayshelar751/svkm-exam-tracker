-- ======================================================================================
-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
-- ENTERPRISE EXAMINATION ACTIVITY TRACKER & MULTI-LEVEL VERIFICATION ERP
-- ROLLBACK SCRIPT FOR SCHEMA OPTIMIZATION MIGRATION (05_optimized_schema_migration.sql)
-- ======================================================================================

BEGIN;

-- 1. Restore original indexes
CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);
CREATE INDEX IF NOT EXISTS idx_academic_years_code ON academic_years(code);
CREATE INDEX IF NOT EXISTS idx_semesters_number ON semesters(semester_number);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_col ON exam_sessions(college_id);
CREATE INDEX IF NOT EXISTS idx_act_logs_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_verif_act_log ON verification_logs(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_query_act_log ON query_logs(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_history(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_history(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_activity ON audit_history(activity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_history(timestamp DESC);

-- Drop optimized indexes
DROP INDEX IF EXISTS idx_audit_history_session_ts;
DROP INDEX IF EXISTS idx_audit_history_act_log_ts;
DROP INDEX IF EXISTS idx_audit_history_brin_ts;
DROP INDEX IF EXISTS idx_act_logs_unverified;
DROP INDEX IF EXISTS idx_act_logs_perf_date_active;
DROP INDEX IF EXISTS idx_verif_active_status;
DROP INDEX IF EXISTS idx_query_unresolved_active;
DROP INDEX IF EXISTS idx_result_processing_atkt;

-- 2. Drop views temporarily to restore original column types
DROP VIEW IF EXISTS v_activity_tracker_detail CASCADE;
DROP VIEW IF EXISTS v_executive_dashboard_summary CASCADE;

-- Restore types to INT / NUMERIC(5,2)
ALTER TABLE roles ALTER COLUMN rank TYPE INT;
ALTER TABLE programs ALTER COLUMN duration_years TYPE INT, ALTER COLUMN total_semesters TYPE INT, ALTER COLUMN degree_type TYPE VARCHAR(50);
ALTER TABLE semesters ALTER COLUMN semester_number TYPE INT;
ALTER TABLE activities_master ALTER COLUMN sr_no TYPE INT, ALTER COLUMN timeline_days_offset TYPE INT;
ALTER TABLE dashboard_metrics ALTER COLUMN num_modules TYPE INT, ALTER COLUMN num_programs TYPE INT;

-- 3. Drop automated user meta sync triggers
DROP TRIGGER IF EXISTS trg_sync_user_meta_activity_logs ON activity_logs;
DROP FUNCTION IF EXISTS trg_sync_activity_log_user_meta();
DROP TRIGGER IF EXISTS trg_sync_user_meta_verification_logs ON verification_logs;
DROP FUNCTION IF EXISTS trg_sync_verification_user_meta();

-- 4. Restore original view definitions
CREATE OR REPLACE VIEW v_executive_dashboard_summary AS
SELECT 
    c.id AS college_id,
    c.code AS college_code,
    c.name AS college_name,
    ay.code AS academic_year,
    ec.code AS exam_cycle,
    COUNT(DISTINCT es.id) AS total_sessions,
    COUNT(DISTINCT p.id) AS total_programs,
    COALESCE(SUM(dm.total_students), 0) AS total_students,
    COALESCE(SUM(dm.pwd_students), 0) AS total_pwd_students,
    COALESCE(SUM(dm.debarred_students), 0) AS total_debarred_students,
    COALESCE(SUM(dm.ufm_cases), 0) AS total_ufm_cases,
    COALESCE(SUM(dm.num_modules), 0) AS total_modules,
    COUNT(al.id) FILTER (WHERE al.performed_date IS NOT NULL) AS performed_activities_count,
    COUNT(al.id) FILTER (WHERE al.status = 'FULLY_VERIFIED') AS fully_verified_count,
    COUNT(ql.id) FILTER (WHERE ql.is_resolved = FALSE) AS active_queries_count
FROM colleges c
CROSS JOIN academic_years ay
CROSS JOIN exam_cycles ec
LEFT JOIN exam_sessions es 
    ON es.college_id = c.id 
    AND es.academic_year_id = ay.id 
    AND es.exam_cycle_id = ec.id
LEFT JOIN programs p ON p.id = es.program_id
LEFT JOIN dashboard_metrics dm ON dm.session_id = es.id
LEFT JOIN activity_logs al ON al.session_id = es.id
LEFT JOIN query_logs ql ON ql.session_id = es.id
GROUP BY c.id, c.code, c.name, ay.code, ec.code;

CREATE OR REPLACE VIEW v_activity_tracker_detail AS
SELECT 
    es.context_key,
    c.code AS college_code,
    c.name AS college_name,
    ay.code AS academic_year,
    p.name AS program_name,
    s.code AS semester,
    ec.code AS exam_cycle,
    am.id AS activity_id,
    am.sr_no,
    am.name AS activity_name,
    am.phase,
    am.performed_by_role,
    am.required_verifiers,
    am.cond,
    am.exam_scope,
    al.id AS activity_log_id,
    al.is_na,
    al.performed_date,
    al.performed_by_name,
    al.performed_by_email,
    al.performed_at,
    al.remarks,
    al.status AS activity_status,
    COALESCE(jsonb_object_agg(
        vl.role_code, 
        jsonb_build_object(
            'verified', vl.is_verified,
            'is_revoked', vl.is_revoked,
            'date', vl.verification_date,
            'userName', vl.verifier_name,
            'userEmail', vl.verifier_email,
            'systemTimestamp', vl.verified_at
        )
    ) FILTER (WHERE vl.id IS NOT NULL), '{}'::jsonb) AS verifications,
    CASE 
        WHEN ql.id IS NOT NULL THEN jsonb_build_object(
            'reason', ql.reason,
            'raisedBy', ql.raised_by_name,
            'role', ql.raised_by_role,
            'email', ql.raised_by_email,
            'timestamp', ql.raised_at,
            'resolved', ql.is_resolved,
            'resolvedBy', ql.resolved_by_name,
            'resolutionNotes', ql.resolution_notes,
            'resolvedAt', ql.resolved_at
        )
        ELSE NULL 
    END AS query_details
FROM exam_sessions es
JOIN colleges c ON c.id = es.college_id
JOIN academic_years ay ON ay.id = es.academic_year_id
JOIN programs p ON p.id = es.program_id
JOIN semesters s ON s.id = es.semester_id
JOIN exam_cycles ec ON ec.id = es.exam_cycle_id
CROSS JOIN activities_master am
LEFT JOIN activity_logs al ON al.session_id = es.id AND al.activity_id = am.id
LEFT JOIN verification_logs vl ON vl.activity_log_id = al.id AND vl.is_revoked = FALSE
LEFT JOIN query_logs ql ON ql.activity_log_id = al.id AND ql.is_resolved = FALSE
GROUP BY 
    es.context_key, c.code, c.name, ay.code, p.name, s.code, ec.code,
    am.id, am.sr_no, am.name, am.phase, am.performed_by_role, am.required_verifiers,
    am.cond, am.exam_scope, al.id, al.is_na, al.performed_date, al.performed_by_name,
    al.performed_by_email, al.performed_at, al.remarks, al.status, ql.id;

COMMIT;
