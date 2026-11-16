-- ======================================================================================
-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
-- ENTERPRISE EXAMINATION ACTIVITY TRACKER & MULTI-LEVEL VERIFICATION ERP
-- SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- ======================================================================================
-- Target Architecture: Supabase PostgreSQL 15+, Supabase Auth, Supabase Realtime
-- Capacity: 10+ Colleges, 100+ Staff Users, 200,000+ Students, Long-term Audit History
-- ======================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================================
-- 2. ENUMS & DOMAINS
-- ======================================================================================
DO $$ BEGIN
    CREATE TYPE user_role_code AS ENUM (
        'ASST',
        'ASST_COORD',
        'COORD',
        'AR',
        'DY_COE',
        'COE',
        'ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_cond_type AS ENUM (
        'ALL',
        'EVEN_ONLY',
        'FINAL_ONLY'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE exam_scope_type AS ENUM (
        'REGULAR_ONLY',
        'RE_EXAM_ONLY',
        'BOTH'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_status_type AS ENUM (
        'PENDING',
        'PERFORMED',
        'PARTIALLY_VERIFIED',
        'FULLY_VERIFIED',
        'QUERY_RAISED',
        'NA'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_type AS ENUM (
        'PERFORMED',
        'VERIFIED',
        'VERIFICATION_REVOKED',
        'QUERY_RAISED',
        'QUERY_RESOLVED',
        'MARKED_NA',
        'MARKED_APPLICABLE',
        'PERFORM_CLEARED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status_type AS ENUM (
        'PLANNING',
        'ACTIVE',
        'EVALUATION',
        'RESULTS_DECLARED',
        'CONCLUDED',
        'ARCHIVED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ======================================================================================
-- 3. UTILITY FUNCTIONS (TRIGGERS & TIMESTAMP AUDITING)
-- ======================================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================================
-- 4. ROLES MASTER
-- ======================================================================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    rank INT NOT NULL DEFAULT 0,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_roles
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 5. COLLEGES MASTER
-- ======================================================================================
CREATE TABLE IF NOT EXISTS colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sap_college_code VARCHAR(50),
    address TEXT,
    contact_email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON colleges(is_active);

CREATE TRIGGER set_timestamp_colleges
BEFORE UPDATE ON colleges
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 6. PROGRAMS MASTER
-- ======================================================================================
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(50) NOT NULL DEFAULT 'UG',
    duration_years INT NOT NULL DEFAULT 3,
    total_semesters INT NOT NULL DEFAULT 6,
    sap_program_id VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_college_program UNIQUE (college_id, name)
);

CREATE INDEX IF NOT EXISTS idx_programs_college ON programs(college_id);
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);
CREATE INDEX IF NOT EXISTS idx_programs_code ON programs(code);

CREATE TRIGGER set_timestamp_programs
BEFORE UPDATE ON programs
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 7. ACADEMIC YEARS (BATCHES)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g. '2024-25', '2025-26', '2026-27'
    label VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_years_code ON academic_years(code);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current);

CREATE TRIGGER set_timestamp_academic_years
BEFORE UPDATE ON academic_years
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 8. SEMESTERS MASTER
-- ======================================================================================
CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'Sem I', 'Sem II', ... 'Sem VIII'
    label VARCHAR(100) NOT NULL,
    semester_number INT NOT NULL,
    is_even BOOLEAN NOT NULL DEFAULT FALSE,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semesters_number ON semesters(semester_number);

-- ======================================================================================
-- 9. EXAM CYCLES MASTER
-- ======================================================================================
CREATE TABLE IF NOT EXISTS exam_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'Regular', 'Re-Exam'
    label VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- 10. USERS (STAFF & EXAM ERP USERS)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id VARCHAR(100) UNIQUE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    role_code VARCHAR(50) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_user_id);

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 11. USER COLLEGE & PROGRAM ASSIGNMENTS
-- ======================================================================================
CREATE TABLE IF NOT EXISTS user_college_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    is_all_colleges BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_college UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_user_col_user ON user_college_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_col_col ON user_college_assignments(college_id);

CREATE TABLE IF NOT EXISTS user_program_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    is_all_programs BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_prog UNIQUE (user_id, college_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_user_prog_user ON user_program_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prog_prog ON user_program_assignments(program_id);

-- ======================================================================================
-- 12. EXAM SESSIONS (NORMALIZED EXAMINATION CONTEXT)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_key VARCHAR(255) UNIQUE NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    exam_cycle_id UUID NOT NULL REFERENCES exam_cycles(id) ON DELETE RESTRICT,
    exam_month_year VARCHAR(100),
    status session_status_type NOT NULL DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_composite UNIQUE (college_id, academic_year_id, program_id, semester_id, exam_cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_key ON exam_sessions(context_key);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_col ON exam_sessions(college_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_year ON exam_sessions(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_prog ON exam_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_cycle ON exam_sessions(exam_cycle_id);

CREATE TRIGGER set_timestamp_exam_sessions
BEFORE UPDATE ON exam_sessions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 13. DASHBOARD METRICS (SESSION HEADER METRICS)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    total_students INT NOT NULL DEFAULT 0,
    pwd_students INT NOT NULL DEFAULT 0,
    debarred_students INT NOT NULL DEFAULT 0,
    ufm_cases INT NOT NULL DEFAULT 0,
    num_modules INT NOT NULL DEFAULT 0,
    reg_batch_students INT NOT NULL DEFAULT 0,
    prev_batch_students INT NOT NULL DEFAULT 0,
    appearing_batches VARCHAR(255),
    num_programs INT NOT NULL DEFAULT 1,
    exam_month_year VARCHAR(100),
    batch_year VARCHAR(50),
    extra_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_session ON dashboard_metrics(session_id);

CREATE TRIGGER set_timestamp_dashboard_metrics
BEFORE UPDATE ON dashboard_metrics
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 14. ACTIVITIES MASTER (230 ENTERPRISE EXAMINATION ACTIVITIES)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS activities_master (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'act_8', 'act_9', etc.
    sr_no INT NOT NULL,
    name TEXT NOT NULL,
    phase VARCHAR(100) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL REFERENCES roles(code) ON UPDATE CASCADE,
    required_verifiers TEXT[] NOT NULL DEFAULT '{}',
    cond activity_cond_type NOT NULL DEFAULT 'ALL',
    exam_scope exam_scope_type NOT NULL DEFAULT 'BOTH',
    timeline_days_offset INT DEFAULT 0,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_sr_no ON activities_master(sr_no);
CREATE INDEX IF NOT EXISTS idx_activities_phase ON activities_master(phase);
CREATE INDEX IF NOT EXISTS idx_activities_perf_role ON activities_master(performed_by_role);
CREATE INDEX IF NOT EXISTS idx_activities_cond ON activities_master(cond);
CREATE INDEX IF NOT EXISTS idx_activities_scope ON activities_master(exam_scope);

CREATE TRIGGER set_timestamp_activities_master
BEFORE UPDATE ON activities_master
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 15. ACTIVITY LOGS (SESSION ACTIVITY EXECUTION)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    activity_id VARCHAR(50) NOT NULL REFERENCES activities_master(id) ON DELETE RESTRICT,
    is_na BOOLEAN NOT NULL DEFAULT FALSE,
    performed_date DATE,
    performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    performed_by_email VARCHAR(255),
    performed_at TIMESTAMPTZ,
    remarks TEXT,
    status activity_status_type NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_activity UNIQUE (session_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_act_logs_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_act_logs_activity ON activity_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_act_logs_status ON activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_act_logs_perf_date ON activity_logs(performed_date);

CREATE TRIGGER set_timestamp_activity_logs
BEFORE UPDATE ON activity_logs
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 16. VERIFICATION LOGS (MULTI-TIER VERIFICATION WORKFLOW)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL REFERENCES roles(code) ON UPDATE CASCADE,
    verifier_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verifier_name VARCHAR(255) NOT NULL,
    verifier_email VARCHAR(255) NOT NULL,
    verification_date DATE NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_activity_role_verif UNIQUE (activity_log_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_verif_act_log ON verification_logs(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_verif_session ON verification_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_verif_role ON verification_logs(role_code);
CREATE INDEX IF NOT EXISTS idx_verif_status ON verification_logs(is_verified, is_revoked);

-- ======================================================================================
-- 17. QUERY LOGS (FLAGGING & RESOLUTION AUDIT)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    activity_id VARCHAR(50) NOT NULL REFERENCES activities_master(id) ON DELETE RESTRICT,
    raised_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    raised_by_name VARCHAR(255) NOT NULL,
    raised_by_role VARCHAR(50) NOT NULL,
    raised_by_email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by_name VARCHAR(255),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_act_log ON query_logs(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_query_session ON query_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_query_status ON query_logs(is_resolved);

CREATE TRIGGER set_timestamp_query_logs
BEFORE UPDATE ON query_logs
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ======================================================================================
-- 18. AUDIT HISTORY (IMMUTABLE FORENSIC AUDIT TRAIL)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS audit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id VARCHAR(100),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE,
    activity_id VARCHAR(50) NOT NULL REFERENCES activities_master(id) ON DELETE RESTRICT,
    action audit_action_type NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    date_value DATE,
    details TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_history(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_activity ON audit_history(activity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_history(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_history(user_email);

-- ======================================================================================
-- 19. NOTIFICATIONS & ALERTS
-- ======================================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'ACTION_REQUIRED',
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    activity_id VARCHAR(50) REFERENCES activities_master(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ======================================================================================
-- 20. SYSTEM CONFIGURATION (REPLACING exam_portal_config)
-- ======================================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ======================================================================================
-- 21. FUTURE ENTERPRISE EXAMINATION ERP MODULES
-- Forward-compatible tables designed to integrate with core colleges, programs,
-- academic_years, semesters, exam_sessions, and staff users without schema redesign.
-- ======================================================================================

-- Module 1: Student Master
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sap_student_id VARCHAR(50) UNIQUE,
    roll_number VARCHAR(50) NOT NULL,
    prn VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    current_semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    admission_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    is_pwd BOOLEAN NOT NULL DEFAULT FALSE,
    is_debarred BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_roll_college UNIQUE (college_id, roll_number)
);

-- Module 2: Course Master
CREATE TABLE IF NOT EXISTS courses_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    course_type VARCHAR(50) DEFAULT 'THEORY', -- THEORY, PRACTICAL, PROJECT
    credits NUMERIC(4,2) DEFAULT 4.00,
    max_marks_ica NUMERIC(5,2) DEFAULT 25.00,
    max_marks_tee NUMERIC(5,2) DEFAULT 75.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_college_code UNIQUE (college_id, course_code)
);

-- Module 3: SAP Excel Data Imports
CREATE TABLE IF NOT EXISTS sap_excel_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    import_type VARCHAR(100) NOT NULL, -- 'STUDENT_ENROLLMENT', 'COURSE_STRUCTURE', 'MARKS_ENTRY'
    file_name VARCHAR(255) NOT NULL,
    row_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    errors JSONB DEFAULT '[]'::jsonb,
    imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Module 4: Examination Planner Portal
CREATE TABLE IF NOT EXISTS examination_planner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    activity_id VARCHAR(50) NOT NULL REFERENCES activities_master(id) ON DELETE RESTRICT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    milestone_name VARCHAR(255),
    depends_on_activity_id VARCHAR(50) REFERENCES activities_master(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'ON_SCHEDULE', -- ON_SCHEDULE, DELAYED, COMPLETED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Module 5: Examiner Allocation
CREATE TABLE IF NOT EXISTS examiner_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    examiner_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    role_type VARCHAR(50) NOT NULL, -- 'PAPER_SETTER', 'EVALUATOR', 'MODERATOR'
    status VARCHAR(50) NOT NULL DEFAULT 'ALLOCATED',
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    allocated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Module 6: Calling Sheet Management
CREATE TABLE IF NOT EXISTS calling_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    bundle_number VARCHAR(50) NOT NULL,
    total_scripts INT NOT NULL DEFAULT 0,
    received_count INT NOT NULL DEFAULT 0,
    missing_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Module 7: Evaluation Tracking (OSM & Physical)
CREATE TABLE IF NOT EXISTS evaluation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    examiner_allocation_id UUID REFERENCES examiner_allocations(id) ON DELETE SET NULL,
    bundle_number VARCHAR(50) NOT NULL,
    scripts_allocated INT NOT NULL DEFAULT 0,
    scripts_evaluated INT NOT NULL DEFAULT 0,
    evaluation_mode VARCHAR(50) DEFAULT 'OSM', -- 'OSM', 'PHYSICAL'
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    completed_at TIMESTAMPTZ
);

-- Module 8: Moderation Tracking
CREATE TABLE IF NOT EXISTS moderation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    moderator_allocation_id UUID REFERENCES examiner_allocations(id) ON DELETE SET NULL,
    bundle_number VARCHAR(50) NOT NULL,
    sampled_count INT NOT NULL DEFAULT 0,
    marks_changed_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    completed_at TIMESTAMPTZ
);

-- Module 9: Seating Plan
CREATE TABLE IF NOT EXISTS seating_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    slot VARCHAR(50) NOT NULL, -- 'MORNING', 'AFTERNOON'
    hall_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 40,
    allocated_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Module 10: Door Plan
CREATE TABLE IF NOT EXISTS door_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seating_plan_id UUID NOT NULL REFERENCES seating_plans(id) ON DELETE CASCADE,
    block_number VARCHAR(50) NOT NULL,
    roll_number_from VARCHAR(50) NOT NULL,
    roll_number_to VARCHAR(50) NOT NULL,
    invigilator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'READY'
);

-- Module 11: Hall Ticket Management
CREATE TABLE IF NOT EXISTS hall_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    barcode VARCHAR(100) UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_issued BOOLEAN NOT NULL DEFAULT TRUE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    debar_reason TEXT,
    qr_code_hash VARCHAR(255),
    CONSTRAINT uq_hall_ticket_student UNIQUE (session_id, student_id)
);

-- Module 12: Result Processing
CREATE TABLE IF NOT EXISTS result_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    ica_marks NUMERIC(5,2),
    tee_marks NUMERIC(5,2),
    total_marks NUMERIC(5,2),
    grade_point NUMERIC(4,2),
    letter_grade VARCHAR(10),
    result_status VARCHAR(50) DEFAULT 'PASS', -- PASS, FAIL, ATKT, UFM, DEBARRED
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_result_course UNIQUE (session_id, student_id, course_id)
);

-- Module 13: Revaluation Processing
CREATE TABLE IF NOT EXISTS revaluation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses_master(id) ON DELETE RESTRICT,
    original_marks NUMERIC(5,2) NOT NULL,
    reval_marks NUMERIC(5,2),
    revised_grade VARCHAR(10),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, EVALUATING, RESOLVED, REJECTED
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Module 14: Honorarium Processing
CREATE TABLE IF NOT EXISTS honorarium_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    examiner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_type VARCHAR(50) NOT NULL,
    scripts_count INT NOT NULL DEFAULT 0,
    rate_per_script NUMERIC(8,2) NOT NULL DEFAULT 35.00,
    gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_deduction NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ
);

-- Module 15: DigiLocker Integration
CREATE TABLE IF NOT EXISTS digilocker_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'MARKSHEET', 'TRANSCRIPT', 'PASSING_CERT'
    transaction_id VARCHAR(100) UNIQUE,
    upload_status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    digilocker_uri TEXT,
    pushed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Module 16: Convocation Management
CREATE TABLE IF NOT EXISTS convocation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    degree_certificate_number VARCHAR(100) UNIQUE NOT NULL,
    convocation_date DATE NOT NULL,
    dispatch_status VARCHAR(50) DEFAULT 'CONFERRED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- 22. HIGH PERFORMANCE REPORTING VIEWS
-- ======================================================================================

-- View 1: Executive Dashboard Summary View
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

-- View 2: Complete Activity Tracker Detail View
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

-- ======================================================================================
-- 23. AUTOMATION & BUSINESS LOGIC TRIGGERS
-- ======================================================================================

-- Trigger 1: Auto-derive and update status on activity_logs
CREATE OR REPLACE FUNCTION sync_activity_log_status()
RETURNS TRIGGER AS $$
DECLARE
    v_req_verifiers TEXT[];
    v_verified_count INT;
    v_has_active_query BOOLEAN;
BEGIN
    -- Check if active query exists
    SELECT EXISTS (
        SELECT 1 FROM query_logs 
        WHERE activity_log_id = NEW.id AND is_resolved = FALSE
    ) INTO v_has_active_query;

    IF v_has_active_query THEN
        NEW.status = 'QUERY_RAISED';
        RETURN NEW;
    END IF;

    IF NEW.is_na THEN
        NEW.status = 'NA';
        RETURN NEW;
    END IF;

    IF NEW.performed_date IS NULL THEN
        NEW.status = 'PENDING';
        RETURN NEW;
    END IF;

    -- Fetch required verifiers
    SELECT required_verifiers INTO v_req_verifiers 
    FROM activities_master 
    WHERE id = NEW.activity_id;

    IF array_length(v_req_verifiers, 1) IS NULL OR array_length(v_req_verifiers, 1) = 0 THEN
        NEW.status = 'FULLY_VERIFIED';
        RETURN NEW;
    END IF;

    -- Count active verifications
    SELECT COUNT(*) INTO v_verified_count
    FROM verification_logs
    WHERE activity_log_id = NEW.id 
      AND is_verified = TRUE 
      AND is_revoked = FALSE
      AND role_code = ANY(v_req_verifiers);

    IF v_verified_count = array_length(v_req_verifiers, 1) THEN
        NEW.status = 'FULLY_VERIFIED';
    ELSIF v_verified_count > 0 THEN
        NEW.status = 'PARTIALLY_VERIFIED';
    ELSE
        NEW.status = 'PERFORMED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_activity_log_status
BEFORE INSERT OR UPDATE ON activity_logs
FOR EACH ROW EXECUTE FUNCTION sync_activity_log_status();

-- ======================================================================================
-- 24. SUPABASE REALTIME REPLICATION SETUP
-- Enables instant WebSocket broadcasts to frontend clients
-- ======================================================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE verification_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE query_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_history;
    ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_metrics;
    ALTER PUBLICATION supabase_realtime ADD TABLE exam_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
    ALTER PUBLICATION supabase_realtime ADD TABLE activities_master;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
