import os
import re

globals_to_check = [
    'Icon', 'SupabaseService', 'StorageService', 'INITIAL_ACTIVITIES',
    'INITIAL_COLLEGES', 'INITIAL_PROGRAMS', 'INITIAL_BATCHES', 'INITIAL_SEMESTERS',
    'INITIAL_EXAM_CYCLES', 'INITIAL_PHASES', 'INITIAL_USERS', 'ROLE_RANKS',
    'ROLE_LABELS', 'SUPABASE_CONFIG', 'FIREBASE_CONFIG', 'hashPassword',
    'verifyPassword', 'formatDateDisplay', 'getTodayYYYYMMDD', 'formatExamMonthYear',
    'isActivityApplicableForCycle', 'getActivityExamScope', 'normalizeExamCycles',
    'getContextKey', 'computeActivityStatus', 'computeUserActionableItems',
    'exportCurrentViewExcel', 'exportExecutiveDashboardExcel', 'XLSX'
]

for root, dirs, filenames in os.walk('src'):
    for fname in filenames:
        if fname.endswith('.jsx') or fname.endswith('.js'):
            fpath = os.path.join(root, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.splitlines()
            # Extract header imports
            import_lines = []
            for l in lines:
                if l.startswith('import ') or (import_lines and not l.startswith('export ') and not l.startswith('function ') and not l.startswith('const ')):
                    import_lines.append(l)
                elif l.startswith('export ') or l.startswith('function ') or l.startswith('const ') or l.startswith('class '):
                    break
            import_text = " ".join(import_lines)

            # Skip checking declarations in their own defining files
            missing = []
            for g in globals_to_check:
                # regex word boundary
                if re.search(r'\b' + g + r'\b', content):
                    # Check if imported or declared in this file
                    if g not in import_text and f'export const {g}' not in content and f'export function {g}' not in content and f'function {g}(' not in content and f'class {g}' not in content and f'export class {g}' not in content and f'const {g}' not in content:
                        missing.append(g)

            if missing:
                print(f"[MISSING IDENTIFIERS] {fpath}: {missing}")

