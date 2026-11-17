-- ======================================================================================
-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
-- PRODUCTION CLEANUP SCRIPT: PURGE ALL SAMPLE SESSIONS & MOCK DATA
-- ======================================================================================
-- Run this script in the Supabase SQL Editor if your database contains sample or test sessions
-- created during the development/prototype phase.
-- ======================================================================================

BEGIN;

-- 1. Remove mock activity logs and verifications for sample sessions
DELETE FROM audit_history 
WHERE session_id IN (
    SELECT id FROM exam_sessions 
    WHERE context_key IN (
        'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
        'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
        'NM__2025-26__B.Com__Sem I__Regular',
        'NM__2026-27__B.Com__Sem I__Regular',
        'NM__2026-27__45611 - B.Com.__Sem I__Regular',
        'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
        'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
    )
);

DELETE FROM query_logs 
WHERE session_id IN (
    SELECT id FROM exam_sessions 
    WHERE context_key IN (
        'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
        'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
        'NM__2025-26__B.Com__Sem I__Regular',
        'NM__2026-27__B.Com__Sem I__Regular',
        'NM__2026-27__45611 - B.Com.__Sem I__Regular',
        'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
        'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
    )
);

DELETE FROM verification_logs 
WHERE activity_log_id IN (
    SELECT id FROM activity_logs WHERE session_id IN (
        SELECT id FROM exam_sessions 
        WHERE context_key IN (
            'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
            'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
            'NM__2025-26__B.Com__Sem I__Regular',
            'NM__2026-27__B.Com__Sem I__Regular',
            'NM__2026-27__45611 - B.Com.__Sem I__Regular',
            'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
            'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
        )
    )
);

DELETE FROM activity_logs 
WHERE session_id IN (
    SELECT id FROM exam_sessions 
    WHERE context_key IN (
        'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
        'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
        'NM__2025-26__B.Com__Sem I__Regular',
        'NM__2026-27__B.Com__Sem I__Regular',
        'NM__2026-27__45611 - B.Com.__Sem I__Regular',
        'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
        'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
    )
);

-- 2. Delete mock dashboard metrics
DELETE FROM dashboard_metrics 
WHERE session_id IN (
    SELECT id FROM exam_sessions 
    WHERE context_key IN (
        'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
        'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
        'NM__2025-26__B.Com__Sem I__Regular',
        'NM__2026-27__B.Com__Sem I__Regular',
        'NM__2026-27__45611 - B.Com.__Sem I__Regular',
        'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
        'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
    )
);

-- 3. Delete mock exam sessions
DELETE FROM exam_sessions 
WHERE context_key IN (
    'NMC__2025-26__45611 - B.Com.__Sem I__Regular',
    'NMC__2026-27__45611 - B.Com.__Sem I__Regular',
    'NM__2025-26__B.Com__Sem I__Regular',
    'NM__2026-27__B.Com__Sem I__Regular',
    'NM__2026-27__45611 - B.Com.__Sem I__Regular',
    'UPG__2026-27__53014 - B.A.(FT&NMP)__Sem I__Regular',
    'NMC__2026-27__45614 - B.M.S.__Sem I__Regular'
);

-- 4. Clean user assignments for demo staff accounts
DELETE FROM user_college_assignments 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email NOT IN (
        'alka.shukla@svkm.ac.in',
        'rupesh.mundada@svkm.ac.in',
        'ajay.shelar@svkm.ac.in'
    )
);

DELETE FROM user_program_assignments 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email NOT IN (
        'alka.shukla@svkm.ac.in',
        'rupesh.mundada@svkm.ac.in',
        'ajay.shelar@svkm.ac.in'
    )
);

-- 5. Delete demo staff accounts, keeping only real CED administrators
DELETE FROM users 
WHERE email NOT IN (
    'alka.shukla@svkm.ac.in',
    'rupesh.mundada@svkm.ac.in',
    'ajay.shelar@svkm.ac.in'
);

COMMIT;
