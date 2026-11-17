import os
import re

hooks = ['useState', 'useEffect', 'useMemo', 'useRef', 'useCallback']

for root, dirs, filenames in os.walk('src'):
    for fname in filenames:
        if fname.endswith('.jsx') or fname.endswith('.js'):
            fpath = os.path.join(root, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract import statement lines
            lines = content.splitlines()
            import_lines = [l for l in lines if l.startswith('import ') or l.startswith('} from ')]
            import_text = " ".join(import_lines)

            # Check hooks
            missing_hooks = []
            for h in hooks:
                # check if hook is used as an identifier
                if re.search(r'\b' + h + r'\b', content):
                    # check if it's imported or defined
                    if h not in import_text and f'const {h}' not in content and f'function {h}' not in content:
                        missing_hooks.append(h)
            
            if missing_hooks:
                print(f"[MISSING HOOKS] {fpath}: {missing_hooks}")

