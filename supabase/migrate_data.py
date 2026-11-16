#!/usr/bin/env python3
"""
SVKM Controller of Examinations Division (CED)
Production Data Migration Script: JSON Backup to Supabase PostgreSQL

Usage:
  # Option 1: Generate SQL file
  python migrate_data.py --backup SVKM_Exam_Tracker_Backup_2026-11-16.json --sql-out 03_seed_and_migration.sql

  # Option 2: Direct Supabase REST/Postgres Import
  python migrate_data.py --backup SVKM_Exam_Tracker_Backup_2026-11-16.json --url https://your-id.supabase.co --key your-service-role-key
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.error

def sql_str(val):
    if val is None:
        return 'NULL'
    clean = str(val).replace("'", "''")
    return f"'{clean}'"

def sql_bool(val):
    return 'TRUE' if val else 'FALSE'

def generate_sql(data):
    lines = []
    lines.append('-- ======================================================================================')
    lines.append('-- SVKM CONTROLLER OF EXAMINATIONS DIVISION (CED)')
    lines.append('-- PRODUCTION DATA MIGRATION & SEED SCRIPT FOR SUPABASE POSTGRESQL')
    lines.append('-- ======================================================================================\n')
    lines.append('BEGIN;\n')

    # 1. ROLES
    roles_data = [
        ('ASST', 'Assistant', 0, 'Entry tier staff member responsible for performing initial maker entries.'),
        ('ASST_COORD', 'Assistant Coordinator', 1, 'Tier 1 verifier and coordinator helper.'),
        ('COORD', 'Coordinator', 2, 'Program coordinator responsible for program-level verification and oversight.'),
        ('AR', 'Assistant Registrar', 3, 'Assistant Registrar with administrative review and operational sign-off privileges.'),
        ('DY_COE', 'Deputy Controller of Exams', 4, 'Executive exam authority conducting division-wide verification.'),
        ('COE', 'Controller of Examinations', 5, 'Chief executive examination authority with final institutional sign-off.'),
        ('ADMIN', 'System Administrator', 6, 'Superuser role with complete configuration, master data, and override rights.')
    ]
    for code, name, rank, desc in roles_data:
        lines.append(f"INSERT INTO roles (code, name, rank, description) VALUES ({sql_str(code)}, {sql_str(name)}, {rank}, {sql_str(desc)}) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, description = EXCLUDED.description;")

    # 2. ACADEMIC YEARS
    current_batch = data['config'].get('currentBatch', '2026-27')
    for b in data['config'].get('batches', []):
        is_curr = (b == current_batch)
        lines.append(f"INSERT INTO academic_years (code, label, is_current, is_active) VALUES ({sql_str(b)}, {sql_str('Academic Year ' + b)}, {sql_bool(is_curr)}, TRUE) ON CONFLICT (code) DO UPDATE SET is_current = EXCLUDED.is_current;")

    # 3. SEMESTERS
    semesters = data['config'].get('semesters', [])
    for i, s in enumerate(semesters, 1):
        is_even = i % 2 == 0
        is_final = i >= 6
        lines.append(f"INSERT INTO semesters (code, label, semester_number, is_even, is_final) VALUES ({sql_str(s)}, {sql_str(s)}, {i}, {sql_bool(is_even)}, {sql_bool(is_final)}) ON CONFLICT (code) DO NOTHING;")

    # 4. EXAM CYCLES
    for ec in data['config'].get('examCycles', []):
        lines.append(f"INSERT INTO exam_cycles (code, label, is_active) VALUES ({sql_str(ec)}, {sql_str(ec + ' Examination Cycle')}, TRUE) ON CONFLICT (code) DO NOTHING;")

    # 5. COLLEGES
    college_meta = {
        'NM': ('NM College', 'Narsee Monjee College of Commerce and Economics'),
        'NMC': ('Narsee Monjee College', 'Narsee Monjee College of Commerce and Economics'),
        'UPG': ('UPG College', 'Usha Pravin Gandhi College of Arts, Science and Commerce'),
        'MBC': ('Mithibai College', 'Mithibai College of Arts, Chauhan Institute of Science'),
        'MITHIBAI': ('Mithibai College', 'Mithibai College of Arts, Chauhan Institute of Science'),
        'DJSCE': ('D.J. Sanghvi College', 'Dwarkadas J. Sanghvi College of Engineering')
    }
    for c in data['config'].get('colleges', []):
        code = c['code']
        name = c.get('name', code)
        lines.append(f"INSERT INTO colleges (code, name, is_active) VALUES ({sql_str(code)}, {sql_str(name)}, TRUE) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;")

    for code, (short_name, full_name) in college_meta.items():
        lines.append(f"INSERT INTO colleges (code, name, is_active) VALUES ({sql_str(code)}, {sql_str(full_name)}, TRUE) ON CONFLICT (code) DO NOTHING;")

    # 6. PROGRAMS
    programs_dict = data['config'].get('programs', {})
    for col_code, progs in programs_dict.items():
        for p in progs:
            lines.append(f"INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = {sql_str(col_code)} LIMIT 1), {sql_str(p)}, TRUE) ON CONFLICT (college_id, name) DO NOTHING;")

    lines.append(f"INSERT INTO programs (college_id, name, is_active) VALUES ((SELECT id FROM colleges WHERE code = 'NM' LIMIT 1), '45611 - B.Com.', TRUE) ON CONFLICT (college_id, name) DO NOTHING;")

    # 7. SYSTEM CONFIG
    cfg_json = json.dumps({'hideDemoLogins': data['config'].get('hideDemoLogins', True), 'currentBatch': current_batch}).replace("'", "''")
    lines.append(f"INSERT INTO system_config (config_key, config_value, description) VALUES ('portal_settings', '{cfg_json}'::jsonb, 'Global portal configuration and display toggles') ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;")

    # 8. USERS
    for u in data['users']:
        u_id = sql_str(u.get('id'))
        u_name = sql_str(u.get('name'))
        u_email = sql_str(u.get('email'))
        u_role = sql_str(u.get('role'))
        u_admin = sql_bool(u.get('isAdmin', False))
        u_active = sql_bool(u.get('active', True))
        u_must_change = sql_bool(u.get('mustChangePassword', False))
        u_pass = sql_str(u.get('password'))

        lines.append(f"""INSERT INTO users (legacy_id, name, email, role_code, role_id, is_admin, is_active, must_change_password, password_hash)
VALUES ({u_id}, {u_name}, {u_email}, {u_role}, (SELECT id FROM roles WHERE code = {u_role}), {u_admin}, {u_active}, {u_must_change}, {u_pass})
ON CONFLICT (email) DO UPDATE SET
    legacy_id = EXCLUDED.legacy_id,
    name = EXCLUDED.name,
    role_code = EXCLUDED.role_code,
    role_id = EXCLUDED.role_id,
    is_admin = EXCLUDED.is_admin,
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    password_hash = EXCLUDED.password_hash;""")

    # 9. USER ASSIGNMENTS
    for u in data['users']:
        u_email = sql_str(u.get('email'))
        assigned_cols = u.get('assignedColleges', [])
        if 'ALL' in assigned_cols:
            lines.append(f"""INSERT INTO user_college_assignments (user_id, college_id, is_all_colleges)
VALUES ((SELECT id FROM users WHERE email = {u_email}), NULL, TRUE)
ON CONFLICT (user_id, college_id) DO NOTHING;""")
        else:
            for c_code in assigned_cols:
                lines.append(f"""INSERT INTO user_college_assignments (user_id, college_id, is_all_colleges)
VALUES ((SELECT id FROM users WHERE email = {u_email}), (SELECT id FROM colleges WHERE code = {sql_str(c_code)} LIMIT 1), FALSE)
ON CONFLICT (user_id, college_id) DO NOTHING;""")

        assigned_progs = u.get('assignedPrograms', {})
        for col_k, p_list in assigned_progs.items():
            if col_k == 'ALL' or 'ALL' in p_list:
                if col_k == 'ALL':
                    lines.append(f"""INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
SELECT (SELECT id FROM users WHERE email = {u_email}), c.id, NULL, TRUE
FROM colleges c
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;""")
                else:
                    lines.append(f"""INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
VALUES ((SELECT id FROM users WHERE email = {u_email}), (SELECT id FROM colleges WHERE code = {sql_str(col_k)} LIMIT 1), NULL, TRUE)
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;""")
            else:
                for p_name in p_list:
                    lines.append(f"""INSERT INTO user_program_assignments (user_id, college_id, program_id, is_all_programs)
VALUES ((SELECT id FROM users WHERE email = {u_email}), (SELECT id FROM colleges WHERE code = {sql_str(col_k)} LIMIT 1), (SELECT id FROM programs WHERE name = {sql_str(p_name)} AND college_id = (SELECT id FROM colleges WHERE code = {sql_str(col_k)} LIMIT 1) LIMIT 1), FALSE)
ON CONFLICT (user_id, college_id, program_id) DO NOTHING;""")

    # 10. ACTIVITIES MASTER
    for a in data['activities']:
        a_id = sql_str(a['id'])
        sr_no = int(a.get('srNo', 0))
        name = sql_str(a.get('name', ''))
        phase = sql_str(a.get('phase', ''))
        cond = sql_str(a.get('cond', 'ALL'))
        scope = sql_str(a.get('examScope', 'BOTH') or 'BOTH')
        perf_by = sql_str(a.get('performedBy', 'ASST'))
        req_verifs = a.get('requiredVerifiers', [])
        verif_arr_str = "ARRAY[" + ", ".join([f"'{v}'" for v in req_verifs]) + "]::TEXT[]" if req_verifs else "'{}'::TEXT[]"

        lines.append(f"""INSERT INTO activities_master (id, sr_no, name, phase, cond, exam_scope, performed_by_role, required_verifiers)
VALUES ({a_id}, {sr_no}, {name}, {phase}, {cond}::activity_cond_type, {scope}::exam_scope_type, {perf_by}, {verif_arr_str})
ON CONFLICT (id) DO UPDATE SET
    sr_no = EXCLUDED.sr_no,
    name = EXCLUDED.name,
    phase = EXCLUDED.phase,
    cond = EXCLUDED.cond,
    exam_scope = EXCLUDED.exam_scope,
    performed_by_role = EXCLUDED.performed_by_role,
    required_verifiers = EXCLUDED.required_verifiers;""")

    # 11. EXAM SESSIONS & CONTEXTS
    for ctx_key, ctx_val in data['contexts'].items():
        parts = ctx_key.split('__')
        col_code, batch, prog_name, sem_code, cycle_code = parts
        hm = ctx_val.get('headerMetrics', {})
        exam_month_year = sql_str(hm.get('examMonthYear'))

        lines.append(f"""INSERT INTO exam_sessions (
    context_key, college_id, academic_year_id, program_id, semester_id, exam_cycle_id, exam_month_year
) VALUES (
    {sql_str(ctx_key)},
    (SELECT id FROM colleges WHERE code = {sql_str(col_code)} LIMIT 1),
    (SELECT id FROM academic_years WHERE code = {sql_str(batch)} LIMIT 1),
    (SELECT id FROM programs WHERE name = {sql_str(prog_name)} AND college_id = (SELECT id FROM colleges WHERE code = {sql_str(col_code)} LIMIT 1) LIMIT 1),
    (SELECT id FROM semesters WHERE code = {sql_str(sem_code)} LIMIT 1),
    (SELECT id FROM exam_cycles WHERE code = {sql_str(cycle_code)} LIMIT 1),
    {exam_month_year}
) ON CONFLICT (context_key) DO UPDATE SET exam_month_year = EXCLUDED.exam_month_year;""")

        tot = int(hm.get('totalStudents') or 0)
        pwd = int(hm.get('pwdStudents') or 0)
        deb = int(hm.get('debarredStudents') or 0)
        ufm = int(hm.get('ufmCases') or 0)
        modules = int(hm.get('numModules') or 0)
        reg_std = int(hm.get('regBatchStudents') or 0)
        prev_std = int(hm.get('prevBatchStudents') or 0)
        app_batch = sql_str(hm.get('appearingBatches'))
        num_prog = int(hm.get('numPrograms') or 1)
        b_year = sql_str(hm.get('batch') or batch)

        lines.append(f"""INSERT INTO dashboard_metrics (
    session_id, total_students, pwd_students, debarred_students, ufm_cases, num_modules,
    reg_batch_students, prev_batch_students, appearing_batches, num_programs, exam_month_year, batch_year
) VALUES (
    (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}),
    {tot}, {pwd}, {deb}, {ufm}, {modules}, {reg_std}, {prev_std}, {app_batch}, {num_prog}, {exam_month_year}, {b_year}
) ON CONFLICT (session_id) DO UPDATE SET
    total_students = EXCLUDED.total_students,
    pwd_students = EXCLUDED.pwd_students,
    debarred_students = EXCLUDED.debarred_students,
    ufm_cases = EXCLUDED.ufm_cases,
    num_modules = EXCLUDED.num_modules,
    reg_batch_students = EXCLUDED.reg_batch_students,
    prev_batch_students = EXCLUDED.prev_batch_students,
    appearing_batches = EXCLUDED.appearing_batches,
    num_programs = EXCLUDED.num_programs,
    exam_month_year = EXCLUDED.exam_month_year,
    batch_year = EXCLUDED.batch_year;""")

    # 12. LOGS, VERIFICATIONS, QUERIES, AUDIT
    for ctx_key, ctx_val in data['contexts'].items():
        logs = ctx_val.get('logs', {})
        for act_id, log in logs.items():
            is_na = sql_bool(log.get('isNA', False))
            perf_date = sql_str(log.get('performedDate')) if log.get('performedDate') else 'NULL'
            perf_user = log.get('performedByUser') or {}
            perf_name = sql_str(perf_user.get('name'))
            perf_email = sql_str(perf_user.get('email'))
            perf_at = sql_str(perf_user.get('timestamp')) if perf_user.get('timestamp') else 'NULL'
            remarks = sql_str(log.get('remarks'))

            lines.append(f"""INSERT INTO activity_logs (
    session_id, activity_id, is_na, performed_date, performed_by_user_id,
    performed_by_name, performed_by_email, performed_at, remarks
) VALUES (
    (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}),
    {sql_str(act_id)},
    {is_na},
    {perf_date},
    (SELECT id FROM users WHERE email = {perf_email}),
    {perf_name},
    {perf_email},
    {perf_at},
    {remarks}
) ON CONFLICT (session_id, activity_id) DO UPDATE SET
    is_na = EXCLUDED.is_na,
    performed_date = EXCLUDED.performed_date,
    performed_by_user_id = EXCLUDED.performed_by_user_id,
    performed_by_name = EXCLUDED.performed_by_name,
    performed_by_email = EXCLUDED.performed_by_email,
    performed_at = EXCLUDED.performed_at,
    remarks = EXCLUDED.remarks;""")

            verifs = log.get('verifications') or {}
            for v_role, v_info in verifs.items():
                v_date = sql_str(v_info.get('date'))
                v_at = sql_str(v_info.get('systemTimestamp')) if v_info.get('systemTimestamp') else 'NOW()'
                v_name = sql_str(v_info.get('userName'))
                v_email = sql_str(v_info.get('userEmail'))
                v_is_ver = sql_bool(v_info.get('verified', True))

                lines.append(f"""INSERT INTO verification_logs (
    activity_log_id, session_id, role_code, verifier_user_id, verifier_name,
    verifier_email, verification_date, verified_at, is_verified
) VALUES (
    (SELECT id FROM activity_logs WHERE session_id = (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}) AND activity_id = {sql_str(act_id)}),
    (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}),
    {sql_str(v_role)},
    (SELECT id FROM users WHERE email = {v_email}),
    {v_name},
    {v_email},
    {v_date},
    {v_at},
    {v_is_ver}
) ON CONFLICT (activity_log_id, role_code) DO UPDATE SET
    verification_date = EXCLUDED.verification_date,
    verified_at = EXCLUDED.verified_at,
    is_verified = EXCLUDED.is_verified,
    verifier_name = EXCLUDED.verifier_name,
    verifier_email = EXCLUDED.verifier_email;""")

            q_info = log.get('queryDetails')
            if q_info:
                q_reason = sql_str(q_info.get('reason'))
                q_r_name = sql_str(q_info.get('raisedBy'))
                q_r_role = sql_str(q_info.get('role'))
                q_r_email = sql_str(q_info.get('email'))
                q_r_at = sql_str(q_info.get('timestamp')) if q_info.get('timestamp') else 'NOW()'
                q_is_res = sql_bool(q_info.get('resolved', False))
                q_res_by = sql_str(q_info.get('resolvedBy'))
                q_res_notes = sql_str(q_info.get('resolutionNotes'))
                q_res_at = sql_str(q_info.get('resolvedAt')) if q_info.get('resolvedAt') else 'NULL'

                lines.append(f"""INSERT INTO query_logs (
    activity_log_id, session_id, activity_id, raised_by_user_id, raised_by_name,
    raised_by_role, raised_by_email, reason, raised_at, is_resolved,
    resolved_by_user_id, resolved_by_name, resolution_notes, resolved_at
) VALUES (
    (SELECT id FROM activity_logs WHERE session_id = (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}) AND activity_id = {sql_str(act_id)}),
    (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}),
    {sql_str(act_id)},
    (SELECT id FROM users WHERE email = {q_r_email}),
    {q_r_name},
    {q_r_role},
    {q_r_email},
    {q_reason},
    {q_r_at},
    {q_is_res},
    (SELECT id FROM users WHERE name = {q_res_by} LIMIT 1),
    {q_res_by},
    {q_res_notes},
    {q_res_at}
);""")

            for h in log.get('history', []):
                h_id = sql_str(h.get('id'))
                h_action = sql_str(h.get('action'))
                h_role = sql_str(h.get('role'))
                h_u_name = sql_str(h.get('userName'))
                h_u_email = sql_str(h.get('userEmail'))
                h_dt_val = sql_str(h.get('dateValue')) if h.get('dateValue') else 'NULL'
                h_details = sql_str(h.get('details'))
                h_ts = sql_str(h.get('timestamp')) if h.get('timestamp') else 'NOW()'

                lines.append(f"""INSERT INTO audit_history (
    legacy_id, session_id, activity_log_id, activity_id, action,
    role_code, user_id, user_name, user_email, date_value, details, timestamp
) VALUES (
    {h_id},
    (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}),
    (SELECT id FROM activity_logs WHERE session_id = (SELECT id FROM exam_sessions WHERE context_key = {sql_str(ctx_key)}) AND activity_id = {sql_str(act_id)}),
    {sql_str(act_id)},
    {h_action}::audit_action_type,
    {h_role},
    (SELECT id FROM users WHERE email = {h_u_email}),
    {h_u_name},
    {h_u_email},
    {h_dt_val},
    {h_details},
    {h_ts}
);""")

    lines.append('\nCOMMIT;\n')
    return '\n'.join(lines)

def main():
    parser = argparse.ArgumentParser(description="Migrate SVKM Exam Portal JSON Backup to Supabase PostgreSQL")
    parser.add_argument("--backup", default="SVKM_Exam_Tracker_Backup_2026-11-16.json", help="Path to JSON backup")
    parser.add_argument("--sql-out", default="supabase/03_seed_and_migration.sql", help="Output path for SQL migration script")
    parser.add_argument("--url", help="Supabase Project URL (e.g. https://xyz.supabase.co)")
    parser.add_argument("--key", help="Supabase Service Role Key")

    args = parser.parse_args()

    if not os.path.exists(args.backup):
        print(f"Error: Backup file '{args.backup}' not found!")
        sys.exit(1)

    print(f"Loading authoritative JSON backup from '{args.backup}'...")
    with open(args.backup, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sql_content = generate_sql(data)

    if args.sql_out:
        with open(args.sql_out, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f"Migration SQL successfully written to '{args.sql_out}'!")

    if args.url and args.key:
        print(f"Executing direct Supabase REST API checks against {args.url}...")
        # Test connection
        headers = {
            "apikey": args.key,
            "Authorization": f"Bearer {args.key}",
            "Content-Type": "application/json"
        }
        req = urllib.request.Request(f"{args.url}/rest/v1/roles?select=count", headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                print("Connected to Supabase REST endpoint successfully!")
        except Exception as e:
            print(f"Note: REST ping returned: {e}")
            print("To apply SQL migration, execute the generated SQL file directly in the Supabase SQL Editor.")

if __name__ == '__main__':
    main()
