-- ==============================================================================
-- 06_PURGE_MITHIBAI_MBC_DJSCE.SQL
-- Migration: Permanently Purge All Data Related to MITHIBAI, MBC, and DJSCE
-- SVKM's Controller of Examinations Division (CED) - Exam Tracker Web Portal
--
-- TARGET ENTITIES REMOVED:
--   1. Colleges: 'MITHIBAI', 'MBC', 'DJSCE' (and full-name variants)
--   2. All associated Programs under these colleges
--   3. All Exam Sessions, Cohorts, and Context Keys
--   4. All Activity Logs, Verification Logs, Query Logs & Audit History
--   5. All Dashboard & Header Metrics
--   6. All User College & Program Scope Assignments
--   7. All SAP Excel Import records related to these colleges
--   8. System Config JSON cleanups
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 1: Log colleges and programs to be purged (diagnostic notice)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r_college RECORD;
    v_col_count INT := 0;
    v_prog_count INT := 0;
    v_sess_count INT := 0;
BEGIN
    FOR r_college IN 
        SELECT id, code, name 
        FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    LOOP
        v_col_count := v_col_count + 1;
        RAISE NOTICE 'Target College identified for purge: [%] % (ID: %)', r_college.code, r_college.name, r_college.id;
    END LOOP;

    SELECT COUNT(*) INTO v_prog_count
    FROM programs
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    );
    RAISE NOTICE 'Total Programs identified for purge: %', v_prog_count;

    SELECT COUNT(*) INTO v_sess_count
    FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%';
    RAISE NOTICE 'Total Exam Sessions identified for purge: %', v_sess_count;
END $$;

-- -----------------------------------------------------------------------------
-- Step 2: Delete Child Logs of Exam Sessions (Verification, Query, Activity, Audit)
-- -----------------------------------------------------------------------------
-- 2.1 Verification Logs
DELETE FROM verification_logs
WHERE session_id IN (
    SELECT id FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%'
);

-- 2.2 Query Logs
DELETE FROM query_logs
WHERE session_id IN (
    SELECT id FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%'
);

-- 2.3 Audit History
DELETE FROM audit_history
WHERE session_id IN (
    SELECT id FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%'
);

-- 2.4 Audit History Archive (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_history_archive') THEN
        DELETE FROM audit_history_archive
        WHERE session_id IN (
            SELECT id FROM exam_sessions
            WHERE college_id IN (
                SELECT id FROM colleges 
                WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
                   OR UPPER(name) ILIKE '%MITHIBAI%'
                   OR UPPER(name) ILIKE '%SANGHVI%'
            )
            OR context_key LIKE 'MITHIBAI__%'
            OR context_key LIKE 'MBC__%'
            OR context_key LIKE 'DJSCE__%'
        );
    END IF;
END $$;

-- 2.5 Activity Logs
DELETE FROM activity_logs
WHERE session_id IN (
    SELECT id FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%'
);

-- 2.6 Dashboard & Header Metrics
DELETE FROM dashboard_metrics
WHERE session_id IN (
    SELECT id FROM exam_sessions
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
    OR context_key LIKE 'MITHIBAI__%'
    OR context_key LIKE 'MBC__%'
    OR context_key LIKE 'DJSCE__%'
);

-- -----------------------------------------------------------------------------
-- Step 3: Delete Forward-Compatible Child Records (safely checked)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_col_ids UUID[];
    v_prog_ids UUID[];
    v_sess_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id) INTO v_col_ids
    FROM colleges
    WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
       OR UPPER(name) ILIKE '%MITHIBAI%'
       OR UPPER(name) ILIKE '%SANGHVI%';

    SELECT ARRAY_AGG(id) INTO v_prog_ids
    FROM programs
    WHERE college_id = ANY(v_col_ids);

    SELECT ARRAY_AGG(id) INTO v_sess_ids
    FROM exam_sessions
    WHERE college_id = ANY(v_col_ids)
       OR program_id = ANY(v_prog_ids)
       OR context_key LIKE 'MITHIBAI__%'
       OR context_key LIKE 'MBC__%'
       OR context_key LIKE 'DJSCE__%';

    -- SAP Excel Imports
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sap_excel_imports') THEN
        DELETE FROM sap_excel_imports 
        WHERE session_id = ANY(v_sess_ids)
           OR file_name ILIKE '%MITHIBAI%' 
           OR file_name ILIKE '%DJSCE%' 
           OR file_name ILIKE '%MBC%';
    END IF;

    -- Calling Sheets
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calling_sheets') THEN
        DELETE FROM calling_sheets WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;

    -- Examiner Allocations
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'examiner_allocations') THEN
        DELETE FROM examiner_allocations WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;

    -- Examination Planner
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'examination_planner') THEN
        DELETE FROM examination_planner WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;

    -- Evaluation Tracking
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evaluation_tracking') THEN
        DELETE FROM evaluation_tracking WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Moderation Tracking
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_tracking') THEN
        DELETE FROM moderation_tracking WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Seating Plans
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seating_plans') THEN
        DELETE FROM seating_plans WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Door Plans
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'door_plans') THEN
        DELETE FROM door_plans WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Hall Tickets
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hall_tickets') THEN
        DELETE FROM hall_tickets WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Result Processing
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'result_processing') THEN
        DELETE FROM result_processing WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Revaluation Requests
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revaluation_requests') THEN
        DELETE FROM revaluation_requests WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Honorarium Records
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'honorarium_records') THEN
        DELETE FROM honorarium_records WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Digilocker Logs
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digilocker_logs') THEN
        DELETE FROM digilocker_logs WHERE session_id = ANY(v_sess_ids);
    END IF;

    -- Convocation Records
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'convocation_records') THEN
        DELETE FROM convocation_records WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;

    -- Students
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        DELETE FROM students WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;

    -- Courses Master
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses_master') THEN
        DELETE FROM courses_master WHERE college_id = ANY(v_col_ids) OR program_id = ANY(v_prog_ids);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Step 4: Delete Exam Sessions
-- -----------------------------------------------------------------------------
DELETE FROM exam_sessions
WHERE college_id IN (
    SELECT id FROM colleges 
    WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
       OR UPPER(name) ILIKE '%MITHIBAI%'
       OR UPPER(name) ILIKE '%SANGHVI%'
)
OR context_key LIKE 'MITHIBAI__%'
OR context_key LIKE 'MBC__%'
OR context_key LIKE 'DJSCE__%';

-- -----------------------------------------------------------------------------
-- Step 5: Delete User Scope Assignments
-- -----------------------------------------------------------------------------
-- 5.1 Program Assignments
DELETE FROM user_program_assignments
WHERE college_id IN (
    SELECT id FROM colleges 
    WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
       OR UPPER(name) ILIKE '%MITHIBAI%'
       OR UPPER(name) ILIKE '%SANGHVI%'
)
OR program_id IN (
    SELECT id FROM programs
    WHERE college_id IN (
        SELECT id FROM colleges 
        WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
           OR UPPER(name) ILIKE '%MITHIBAI%'
           OR UPPER(name) ILIKE '%SANGHVI%'
    )
);

-- 5.2 College Assignments
DELETE FROM user_college_assignments
WHERE college_id IN (
    SELECT id FROM colleges 
    WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
       OR UPPER(name) ILIKE '%MITHIBAI%'
       OR UPPER(name) ILIKE '%SANGHVI%'
);

-- -----------------------------------------------------------------------------
-- Step 6: Delete Programs
-- -----------------------------------------------------------------------------
DELETE FROM programs
WHERE college_id IN (
    SELECT id FROM colleges 
    WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
       OR UPPER(name) ILIKE '%MITHIBAI%'
       OR UPPER(name) ILIKE '%SANGHVI%'
);

-- -----------------------------------------------------------------------------
-- Step 7: Delete Colleges
-- -----------------------------------------------------------------------------
DELETE FROM colleges
WHERE UPPER(code) IN ('MITHIBAI', 'MBC', 'DJSCE')
   OR UPPER(name) ILIKE '%MITHIBAI%'
   OR UPPER(name) ILIKE '%SANGHVI%';

-- -----------------------------------------------------------------------------
-- Step 8: Clean up System Config JSON (portal_settings)
-- -----------------------------------------------------------------------------
UPDATE system_config
SET config_value = jsonb_set(
    jsonb_set(
        config_value,
        '{colleges}',
        COALESCE((
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(config_value->'colleges') elem
            WHERE UPPER(COALESCE(elem->>'id', '')) NOT IN ('MITHIBAI', 'MBC', 'DJSCE')
              AND UPPER(COALESCE(elem->>'code', '')) NOT IN ('MITHIBAI', 'MBC', 'DJSCE')
        ), '[]'::jsonb)
    ),
    '{programs}',
    (config_value->'programs') - 'MITHIBAI' - 'MBC' - 'DJSCE' - 'mithibai' - 'mbc' - 'djsce'
)
WHERE config_key = 'portal_settings'
  AND config_value IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Step 9: Final Verification Summary
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_rem_colleges INT;
    v_rem_programs INT;
    v_rem_sessions INT;
    r RECORD;
BEGIN
    SELECT COUNT(*) INTO v_rem_colleges FROM colleges;
    SELECT COUNT(*) INTO v_rem_programs FROM programs;
    SELECT COUNT(*) INTO v_rem_sessions FROM exam_sessions;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'PURGE COMPLETE: All MITHIBAI, MBC & DJSCE data removed.';
    RAISE NOTICE 'Remaining Active Colleges in Supabase: %', v_rem_colleges;
    FOR r IN SELECT code, name FROM colleges ORDER BY code LOOP
        RAISE NOTICE '  - [%] %', r.code, r.name;
    END LOOP;
    RAISE NOTICE 'Remaining Programs in Supabase: %', v_rem_programs;
    RAISE NOTICE 'Remaining Exam Sessions in Supabase: %', v_rem_sessions;
    RAISE NOTICE '=======================================================';
END $$;

COMMIT;
