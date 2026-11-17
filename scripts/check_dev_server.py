import urllib.request
import re
import posixpath

visited = set()
errors = []

def check_url(path):
    # normalize path query params
    clean_path = path.split('?')[0]
    if clean_path in visited:
        return
    visited.add(clean_path)
    url = f'http://localhost:3000{path}'
    try:
        req = urllib.request.urlopen(url)
        content = req.read().decode('utf-8')
        for line in content.splitlines():
            # Match ES module imports
            matches = re.findall(r'(?:import|from)\s+["\']([^"\']+)["\']', line)
            for target in matches:
                if target.startswith('.'):
                    d = posixpath.dirname(clean_path)
                    resolved = posixpath.normpath(posixpath.join(d, target))
                    check_url(resolved)
                elif target.startswith('/src'):
                    check_url(target)
    except Exception as e:
        errors.append((path, str(e)))

check_url('/src/main.jsx')
print(f'Checked {len(visited)} files.')
if errors:
    print('ERRORS FOUND:')
    for p, err in errors:
        print(f'{p}: {err}')
else:
    print('ALL MODULES RESOLVED AND COMPILED BY VITE WITH HTTP 200!')
