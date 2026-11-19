-- ======================================================================================
-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)
-- PRODUCTION DATA MIGRATION & SEED SCRIPT FOR SUPABASE POSTGRESQL
-- ======================================================================================

BEGIN;

INSERT INTO roles (code, name, rank, description) VALUES ('ASST', 'Assistant', 0, 'Entry tier staff member responsible for performing initial maker entries.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('ASST_COORD', 'Assistant Coordinator', 1, 'Tier 1 verifier and coordinator helper.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('COORD', 'Coordinator', 2, 'Program coordinator responsible for program-level verification and oversight.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('AR', 'Assistant Registrar', 3, 'Assistant Registrar with administrative review and operational sign-off privileges.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('DY_COE', 'Deputy Controller of Exams', 4, 'Executive exam authority conducting division-wide verification.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('COE', 'Controller of Examinations', 5, 'Chief executive examination authority with final institutional sign-off.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO roles (code, name, rank, description) VALUES ('ADMIN', 'System Administrator', 6, 'Superuser role with complete configuration, master data, and override rights.') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;
INSERT INTO academic_years (code, label, is_current, is_active) VALUES ('2024-25', 'Academic Year 2024-25', FALSE, TRUE) ON CONFLICT (code) DO UPDATE SET is_current = EXCLUDED.is_current;
INSERT INTO academic_years (code, label, is_current, is_active) VALUES ('2025-26', 'Academic Year 2025-26', FALSE, TRUE) ON CONFLICT (code) DO UPDATE SET is_current = EXCLUDED.is_current;
INSERT INTO academic_years (code, label, is_current, is_active) VALUES ('2026-27', 'Academic Year 2026-27', TRUE, TRUE) ON CONFLICT (code) DO UPDATE SET is_current = EXCLUDED.is_current;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem I', 'Sem I', 1, FALSE, FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem II', 'Sem II', 2, TRUE, FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem III', 'Sem III', 3, FALSE, FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem IV', 'Sem IV', 4, TRUE, FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem V', 'Sem V', 5, FALSE, FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem VI', 'Sem VI', 6, TRUE, TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem VII', 'Sem VII', 7, FALSE, TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ('Sem VIII', 'Sem VIII', 8, TRUE, TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO exam_cycles (code, label, is_active) VALUES ('Regular', 'Regular Examination Cycle', TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO exam_cycles (code, label, is_active) VALUES ('Re-Exam', 'Re-Exam Examination Cycle', TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO colleges (code, name, is_active) VALUES ('NMC', 'Narsee Monjee College', TRUE) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO colleges (code, name, is_active) VALUES ('UPG', 'Usha Pravin Gandhi College', TRUE) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO colleges (code, name, is_active) VALUES ('NM', 'Narsee Monjee College of Commerce and Economics', TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO colleges (code, name, is_active) VALUES ('NMC', 'Narsee Monjee College of Commerce and Economics', TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO colleges (code, name, is_active) VALUES ('UPG', 'Usha Pravin Gandhi College of Arts, Science and Commerce', TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45611 - B.Com.', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45612 - B.Com.(FM)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45613 - B.Com.(A&F)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45614 - B.M.S.', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45615 - B.Com.(M&F)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45616 - B.Com.(Eco)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45617 - B.Com.(Eco&Ana)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45618 - B.Sc.(IT)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45619 - B.Sc.(AI&DA)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45620 - B.Com.(MS)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45621 - B.Com.(C&M)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45701 - M.Com.(AA)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45702 - M.Com.(B&F)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NMC' LIMIT 1), '45703 - M.Com.(BM)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53011 - B.A.(MMC)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53013 - B.Sc.(IT)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53014 - B.A.(FT&NMP)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53015 - B.Com.(MS)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53016 - B.Sc.(AI&DS)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53012 - B.M.S.', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53021 - M.Sc.(IT)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53022 - M.A.(EMA)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53024 - M.A.(MC-FTNM)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53026 - M.Sc.(AI&DS)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'UPG' LIMIT 1), '53023 - M.Com.(BM)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'B.Com', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'B.Com (Hons)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'BMS', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'BAF', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'BFM', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'B.Sc. Finance', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'B.Sc. Economics', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'M.Com', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), 'Bachelor of Commerce (Commerce & Management)', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), '45611 - B.Com.', TRUE) ON CONFLICT (college_id, name) DO NOTHING;
INSERT INTO system_config (config_key, config_value, description) VALUES ('portal_settings', '{"hideDemoLogins": true, "currentBatch": "2026-27"}'::jsonb, 'Global portal configuration and display toggles') ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
INSERT INTO users (legacy_id, name, email, role_code, role_id, is_admin, is_active, must_change_password, password_hash)
VALUES ('user_ajay', 'Ajay Shelar', 'ajay.shelar@svkm.ac.in', 'AR', (SELECT id FROM roles WHERE code = 'AR'), TRUE, TRUE, FALSE, 'Krishna75')
ON CONFLICT (email) DO UPDATE SET
    legacy_id = EXCLUDED.legacy_id,
    name = EXCLUDED.name,
    role_code = EXCLUDED.role_code,
    role_id = EXCLUDED.role_id,
    is_admin = EXCLUDED.is_admin,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    password_hash = EXCLUDED.password_hash;
INSERT INTO users (legacy_id, name, email, role_code, role_id, is_admin, is_active, must_change_password, password_hash)
VALUES ('user_alka', 'Alka Shukla', 'alka.shukla@svkm.ac.in', 'COE', (SELECT id FROM roles WHERE code = 'COE'), TRUE, TRUE, TRUE, 'Pass@123')
ON CONFLICT (email) DO UPDATE SET
    legacy_id = EXCLUDED.legacy_id,
    name = EXCLUDED.name,
    role_code = EXCLUDED.role_code,
    role_id = EXCLUDED.role_id,
    is_admin = EXCLUDED.is_admin,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    password_hash = EXCLUDED.password_hash;
INSERT INTO users (legacy_id, name, email, role_code, role_id, is_admin, is_active, must_change_password, password_hash)
VALUES ('user_rupesh', 'Dr. Rupesh Mundada', 'rupesh.mundada@svkm.ac.in', 'DY_COE', (SELECT id FROM roles WHERE code = 'DY_COE'), TRUE, TRUE, TRUE, 'Pass@123')
ON CONFLICT (email) DO UPDATE SET
    legacy_id = EXCLUDED.legacy_id,
    name = EXCLUDED.name,
    role_code = EXCLUDED.role_code,
    role_id = EXCLUDED.role_id,
    is_admin = EXCLUDED.is_admin,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    password_hash = EXCLUDED.password_hash;
INSERT INTO user_college_assignments (user_id, college_id, is_all_colleges)
VALUES ((SELECT id FROM users WHERE email = 'ajay.shelar@svkm.ac.in'), NULL, TRUE)
ON CONFLICT (user_id, college_id) DO NOTHING;
INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
SELECT (SELECT id FROM users WHERE email = 'ajay.shelar@svkm.ac.in'), c.id, NULL, TRUE
FROM colleges c
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;
INSERT INTO user_college_assignments (user_id, college_id, is_all_colleges)
VALUES ((SELECT id FROM users WHERE email = 'alka.shukla@svkm.ac.in'), NULL, TRUE)
ON CONFLICT (user_id, college_id) DO NOTHING;
INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
SELECT (SELECT id FROM users WHERE email = 'alka.shukla@svkm.ac.in'), c.id, NULL, TRUE
FROM colleges c
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;
INSERT INTO user_college_assignments (user_id, college_id, is_all_colleges)
VALUES ((SELECT id FROM users WHERE email = 'rupesh.mundada@svkm.ac.in'), NULL, TRUE)
ON CONFLICT (user_id, college_id) DO NOTHING;
INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
SELECT (SELECT id FROM users WHERE email = 'rupesh.mundada@svkm.ac.in'), c.id, NULL, TRUE
FROM colleges c
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_8', 1, 'Maintain PI Table (in January Month) [ZMU_PI]', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'REGULAR_ONLY'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_9', 2, 'Received Academic Calendar from College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_10', 3, 'Received Course Structure from College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_11', 11, 'Received Audit Report from College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_12', 12, 'Verified Course Structure & Audit Report', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['AR', 'DY_COE', 'COE', 'COORD', 'ASST_COORD']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_13', 13, 'Verified Audit Report [ZAUDIT_REPORT]', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['AR', 'DY_COE', 'COE', 'COORD', 'ASST_COORD']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_14', 14, 'Verified Acad Report [ZACAD_REPORT]', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_15', 15, 'Received Common Modules Matrix from College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_16', 16, 'Verified Credit Report [ZCREDITREPORT]', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_17', 17, 'Confirmed Audit Reports [ZAUDIT_CHECK]', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_18', 18, 'Sent Examiners'' Panel Blank format to College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_19', 19, 'Sent Ext. Examiners'' Panel format to College', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_20', 20, 'Uploaded Passing Crieteria for New Modules in SAP', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_21', 21, 'Verified Passing Crieteria for Modules in SAP', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_22', 22, 'Preared Exam Time tables', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_23', 23, 'Regular Exam Start Date', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_24', 24, 'Regular Exam End Date', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_25', 25, 'Exam Timing (From - to)', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_26', 26, 'Sent Exam Time tables to Colleges', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_27', 27, 'Maintained Month & Year of Examination in SAP', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_28', 28, 'Pre-Exam Process (for Regular Exam) in SAP', 'Phase 1: Academic & SAP Setup', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_29', 29, 'Uploaded Schedule Assessment & E1 Open for Internal & Practical', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_30', 30, 'Downloaded Blank Marksheets of Practical/Lab/Project', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_31', 31, 'Received Practical/Lab/Project/Viva Timetables from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_32', 32, 'Received ICA Portal Notice from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_33', 33, 'Last date to upload ICA on the Student Portal', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_34', 34, 'Date of ICA marks publish & receipt of Student GR', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_35', 35, 'Date of Edit Option and Student Portal Closure', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_36', 36, 'Sent Blank Marksheets of Practical/Lab/Project to College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_37', 37, 'Received Seating Plan from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_38', 38, 'Verified Seating Plan received from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_39', 39, 'Prepared & Verified Schedule Assessment (WRIT)', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_40', 40, 'Uploaded Schedule Assessment & E1 Booking (PWD)(WRIT)', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_41', 41, 'Uploaded Schedule Assessment & E1 Booking (WRIT)', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_42', 42, 'Confirmed ICA Marks Pushed into SAP by College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_43', 43, 'Received Examiners'' Panel from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_44', 44, 'Received Ext. Examiners'' Panel from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_45', 45, 'Received Admission Cancelled Students List from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_46', 46, 'Date of Last Instruction Day', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_47', 47, 'Confirmation of the student Portal IDs & Exam Roles from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_48', 48, 'Received Attendance Defaulters List from College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_49', 49, 'Sent Attendance Defaulter & Cancelled Students List to Splashgain', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_50', 50, 'Sent email to Splashgain for Activation of Deactivated Students', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_51', 51, 'Verified Attendance Defaulter & Cancelled Students List in SAP', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_52', 52, 'Received O.229 List (only in Even Semesters) from College', 'Phase 2: ICA & Pre-Conduct', 'EVEN_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_53', 53, 'Uploaded O.229 (only in Even Semesters) in SAP', 'Phase 2: ICA & Pre-Conduct', 'EVEN_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_54', 54, 'Printed QR Codes', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_55', 55, 'Verified QR Codes', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST_COORD', ARRAY['COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_56', 56, 'Submitted QR Codes to College', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_57', 57, 'Sent Halltickets emails & SMSs to Students', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_58', 58, 'Last Day of Regular Exam Practical/Lab/Project', 'Phase 2: ICA & Pre-Conduct', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_59', 59, 'Maintained Exam Attendance in Splashgain (Daily)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_60', 60, 'Verified OSM UFM Count & Reject Count in Splashgain (Daily)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_61', 61, 'Received Marksheets of Practical/Lab/Project/Viva from College', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_62', 62, 'Uploaded Marks of ICA/Lab/Project/Viva in SAP', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_63', 63, 'Verified Internal Marks Pushed in SAP (10% Data)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_64', 64, 'Evaluation of All Modules Completed', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_65', 65, 'Verified Question wise Marks of Splashgain (for Reopen process)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_66', 66, 'Reopened Answer books for Moderation (if any)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_67', 67, 'Moderation of All Modules Completed', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_68', 68, 'Verified Assessment Report', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_69', 69, 'Verfified Moderation Report', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_70', 70, 'Verified IVR with OSM Marks', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_71', 71, '100% Moderation (if Marks % Change > 10% in 50% of Total Students)', 'Phase 3: OSM & Evaluation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_72', 72, 'Confirm UFM Cases with College', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_73', 73, 'UFM Cases & Credit Shortage Students (Results in abeyance/Exm hold)', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_74', 74, 'Executed and Verified Gracing', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_75', 75, 'Executed & Verified Highest Marks', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'REGULAR_ONLY'::exam_scope_type, 'ASST_COORD', ARRAY['DY_COE', 'COE', 'COORD', 'AR']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_76', 76, 'Executed and Verified GPA', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_77', 77, 'Executed and Verified Progression', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_78', 78, 'Received UMIC Meeting Minutes from College', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_79', 79, 'Performed Revert Gracing of UFM Absolved Students (if any)', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_80', 80, 'Applied Exam Hold on UFM Cases Students', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_81', 81, 'Processed & Locked the Results of UFM Cases Students', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_82', 82, 'Sent email to college regarding Results of UFM Cases Students', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_83', 83, 'Verified GPA & CGPA Report (Final Semesters)', 'Phase 4: Regular Results', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_84', 84, 'Verified Result Gazettes', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_85', 85, 'Verified Grade Sheets', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_86', 86, 'Updated Pass % Excel file', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_87', 87, 'Sent Result Gazettes & Pass % to CoE', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_88', 88, 'Generated Regular Exam Toppers List', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_89', 89, 'Removed Hold on UFM Absolved Cases (if any)', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_90', 90, 'Informed College after Processing of Result of UFM Absolved Cases', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_91', 91, 'Regular Exam Results Declared', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_92', 92, 'Downloaded Result Gazettes after Result Declaration', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_93', 93, 'Downloaded Grad Sheets', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_94', 94, 'Result Notice Page', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_95', 95, 'Downloaded Result Analysis (Programwise, Modulewise & Overall)', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_96', 96, 'Downloaded Toppers Lists', 'Phase 4: Regular Results', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_97', 97, 'Date of GR (Reval) Portal Open', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_98', 98, 'Date of GR (Reval) Portal Closure', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_99', 99, 'GR (Reval) Application Stuck Student Email to SAP', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_100', 100, 'Download final GR (Reval) Application Students List', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_101', 101, 'Number of GR (Reval) Applications Received', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_102', 102, 'Revaluation Completed', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_103', 103, 'Verified Revaluation Result Gazettes', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_104', 104, 'Verified Passing Certificates (Final Semesters only)', 'Phase 5: Revaluation (GR)', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_105', 105, 'Revaluation Results Delcared', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_106', 106, 'Printed Result Gazettes, Grade Sheets, Passing, Analysis (After Reval)', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_107', 107, 'Updated Pass %, CoE Report (After Revaluation)', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_108', 108, 'Sent Result Gazettes, Refund Lists & Reval Report for CoE Signature', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_109', 109, 'Prepared Letter to College for Submission of Reports', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_110', 110, 'Sent Result Sheets, Grade Cards, Passing, Acknowldgement list to College', 'Phase 5: Revaluation (GR)', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_111', 111, 'Prepared Re-Exam Portal Opening Notice', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_112', 112, 'Send Re-Exam Portal Opening Notice to College', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_113', 113, 'Re-Exam Portal Opening Date', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_114', 114, 'Re-Exam Portal Closing Date', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_115', 115, 'Re-Exam Portal Super Late Fee Date', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_116', 116, 'Downloaded Failure Report from SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_117', 117, 'Prepared Re-Exam Timetables (based on Failure List)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_118', 118, 'Re-exam Portal Opening Process in SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_119', 119, 'Performed Pre-Exam Process for Re-Exam', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_120', 120, 'Re-Exam Portal email & SMS sent', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_121', 121, 'Sent Stuck Student Email to SAP Team', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_122', 122, 'Downloaded Final Re-exam Appl. Data', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_123', 123, 'Re-Exam Offline Applications (if any)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_124', 124, 'Finalised Re-Exam Time tables (based on Applications)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_125', 125, 'Sent Blank Marksheets of ICA to College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_126', 126, 'Received Seating Arrangement from College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_127', 127, 'Verified Seating Arrangement received from College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_128', 128, 'Uploaded Schedule Assessment (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_129', 129, 'Sent Halltickets email/sms (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_130', 130, 'Printed & Verified QR Codes (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_131', 131, 'Sent QR Codes to College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_132', 132, 'Received Marksheets of ICA from College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_133', 133, 'Uploaded ICA Marks in SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_134', 134, 'Verifed ICA Marks entered in SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_135', 135, 'Re-Exam Start Date', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_136', 136, 'Re-Exam End Date', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_137', 137, 'Evaluation of All Modules Completed (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_138', 138, 'Moderation of All Modules Completed (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_139', 139, 'Verified Question wise Marks of Splashgain (for Reopen process)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_140', 140, 'Reopened Answer books for Moderation (if any)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_141', 141, 'Verfify Moderation Report (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_142', 142, '100% Moderation (if Marks % Change > 10% in 50% of Total Students)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_143', 143, 'Received UMIC Meeting Minutes from College (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_144', 144, 'Maintained UFM Penalty in SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_145', 145, 'Executed & Verified Gracing (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_146', 146, 'Executed & Verified GPA (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_147', 147, 'Executed & Verified Progression (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_148', 148, 'Generated & Verified Result Gazettes (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_149', 149, 'Generated & Verified Grade Sheets (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_150', 150, 'Sent Result Gazettes & Pass % to CoE (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_151', 151, 'Results Declared & Locked (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_152', 152, 'Revert Gracing of UFM Case Students (if the decision received after declaration of results)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_153', 153, 'Opening Date of GR (Reval) Portal Open (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_154', 154, 'Closing Date of GR (Reval) Portal Closed (Re-Exam)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_155', 155, 'GR Application Stuck Student Email (Re-Exam) to SAP Team', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_156', 156, 'Generated final GR Application Report', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_157', 157, 'Revaluation Completed', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_158', 158, 'Executed & Verified Gracing (Re-Exam GR)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_159', 159, 'Executed & Verified GPA (Re-Exam GR)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_160', 160, 'Executed & Verified Progression (Re-Exam GR)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_161', 161, 'Progression (for SNGU after Result Declare)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_162', 162, 'Reval Results Delcared (Re-Exam GR)', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_163', 163, 'Downloaded Final GMR', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_164', 164, 'Updated Grade Card, Result Sheet, Analysis, update Pass %, CoE Report', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_165', 165, 'Maintained Exam Hold of UFM Cases in SAP', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_166', 166, 'Sent Result Gazettes, Refund List & Reval Report for CoE Signature', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_167', 167, 'Letter to College for Submission of Result Sheets, Grade Cards, etc.', 'Phase 6: Re-Exam & Re-Exam GR', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_168', 168, 'Failure Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_169', 169, 'Print Result Gazettes', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_170', 170, 'Print QR Codes', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_171', 171, 'Print Grade Cards (including RRLE Cases)', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_172', 172, 'Declare Results', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_173', 173, 'Download/Execute Digilocker Data API', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_174', 174, 'Deregistration of Pass Students (Final Sem)', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_175', 175, 'Creation of Student Portal IDs', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_176', 176, 'Lateral Entry Students Portal IDs', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_177', 177, 'Block UFM Students Portal IDs', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_178', 178, 'Stuck Student Re-exam appl. mail', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_179', 179, 'Monitor Halltickets email/sms mail to SAP', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_180', 180, 'Activation of Deactivated Students', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_181', 181, 'Exam Time table', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_182', 182, 'Attendance Defaulter List', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_183', 183, 'Examiners'' Panel', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_184', 184, 'Blank Ext. Examiners'' List', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_185', 185, 'Send QR Codes to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_186', 186, 'Re-Exam Portal Notice', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_187', 187, 'ICA/Lab Blank Marksheets Sent to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_188', 188, 'Confirmation E-mail', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_189', 189, 'O.229 Students List', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'EVEN_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_190', 190, 'Halltickets', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_191', 191, 'QR Codes', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_192', 192, 'Identify "0" ICA Marks Students & confirm', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_193', 193, 'Practical/ICA/Lab Marksheets', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_194', 194, 'Verified Moderation Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_195', 195, 'Question wise marks Verified', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_196', 196, 'Completed Moderation of Reopened ABs', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_197', 197, 'Monitor Result Declaration mail to SAP', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_198', 198, 'GR Stuck Student mail', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_199', 199, 'Manual Creation of GR Record (if any)', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_200', 200, 'Moderation Count for Honorarimum', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_201', 201, 'Reval Refund Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_202', 202, 'Revaluation Count for Honorarium', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_203', 203, 'Grade Cards', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_204', 204, 'Stock of Stationery', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_205', 205, 'Question wise marks', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_206', 206, 'Question wise marks uploaded', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_207', 207, 'Submit Grade Cards to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_208', 208, 'Update CoE Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_209', 209, 'Upload ABC IDs on DigiLocker', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_210', 210, 'Send Rejected Answer Books Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_211', 211, 'Send OSM-UFM Report to COE', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_212', 212, 'Send Result Processing Status', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_213', 213, 'Maintain UFM Pass % file CoE Report, etc.', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_214', 214, '100% Moderation Process', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_215', 215, 'Upload in Digilocker', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_216', 216, 'Upadated Grade Cards', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_217', 217, 'Upadate in Convocation Data', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_218', 218, 'Update in CoE Report', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_219', 219, 'NAD-Digilocker (ABC Data)', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_220', 220, 'UoM - Exam Track Data', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_221', 221, 'UoM - Result Track Data', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_222', 222, 'Prepare Convocation Data', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_223', 223, 'Sent Convocation Data to CoE', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_224', 224, 'Mass Deregistration in SAP', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'COORD', ARRAY['AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_225', 225, 'Result Declaration Resolution to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'AR', ARRAY['DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_226', 226, 'Receive Convocation IDs from College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_227', 227, 'Upload Convocation Data in SAP', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_228', 228, 'Download Result Gazettes & Grade Sheets with Convocation IDs', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_229', 229, 'Send Result Gazettes & Grade Sheets with Convocation IDs to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_230', 230, 'Send Convocation Count in Required Format to College', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_231', 231, 'Prepare Convocation Register', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_232', 232, 'List of Meritorious Students', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_233', 233, 'Send Digilocker Error file to College (if any)', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_234', 234, 'maintain convocation summary report year wise', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'FINAL_ONLY'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_235', 235, 'Check SMS Balance in Kaleyra', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_236', 236, 'Admission Cancellations', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;
INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ('act_237', 237, 'List of Rank Holders & Meritorious Students', 'Phase 7: Post-Exam, DigiLocker & Convocation', 'ALL'::activity_cond_type, 'BOTH'::exam_scope_type, 'ASST', ARRAY['ASST_COORD', 'COORD', 'AR', 'DY_COE', 'COE']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;

COMMIT;
