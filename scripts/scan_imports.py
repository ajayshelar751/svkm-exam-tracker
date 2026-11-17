import os
import re

files = []
for root, dirs, filenames in os.walk('src'):
    for f in filenames:
        if f.endswith('.jsx') or f.endswith('.js'):
            files.append(os.path.join(root, f))

print(f"Scanning {len(files)} files...")

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for undeclared globals commonly used:
    # 1. SupabaseService / StorageService
    if 'SupabaseService' in content and 'class SupabaseService' not in content:
        if 'SupabaseService' not in content[:content.find('export default') if 'export default' in content else len(content)]:
            print(f"[MISSING IMPORT] SupabaseService in {path}")
    if 'StorageService' in content and 'class SupabaseService' not in content and 'const StorageService' not in content:
        if 'StorageService' not in content[:content.find('export default') if 'export default' in content else len(content)]:
            print(f"[MISSING IMPORT] StorageService in {path}")

    # 2. XLSX
    if 'XLSX' in content:
        if 'xlsx' not in content[:content.find('export default') if 'export default' in content else len(content)]:
            print(f"[MISSING IMPORT] XLSX in {path}")

    # 3. React hooks: useState, useEffect, useMemo, useRef, useCallback
    for hook in ['useState', 'useEffect', 'useMemo', 'useRef', 'useCallback']:
        # if hook is used like useState( but not imported
        if re.search(r'\b' + hook + r'\s*\(', content):
            if hook not in content[:500]:
                print(f"[MISSING IMPORT] {hook} in {path}")

    # 4. Icon
    if '<Icon ' in content and 'Icon' not in content[:500]:
        print(f"[MISSING IMPORT] Icon in {path}")

    # 5. INITIAL_ constants or helper functions
    helpers = [
        'formatDateDisplay', 'getTodayYYYYMMDD', 'formatExamMonthYear',
        'isActivityApplicableForCycle', 'computeActivityStatus', 'computeUserActionableItems',
        'hashPassword', 'verifyPassword', 'normalizeExamCycles', 'getContextKey'
    ]
    for h in helpers:
        if re.search(r'\b' + h + r'\s*\(', content) and f'function {h}' not in content:
            if h not in content[:500]:
                print(f"[MISSING IMPORT] {h} in {path}")

print("Scan complete.")
