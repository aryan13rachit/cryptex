"""Copy the Cryptex web app (the repo root) into assets/web and refresh the asset list in pubspec.yaml.
usage: python tool/sync_web.py   (then: flutter build apk --release)"""
import os, shutil
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, dst = os.path.join(here, '..'), os.path.join(here, 'assets', 'web')   # the web app lives at the repo root
shutil.rmtree(dst, ignore_errors=True)
os.makedirs(dst)
for p in ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets']:
    s = os.path.join(src, p)
    (shutil.copytree if os.path.isdir(s) else shutil.copy2)(s, os.path.join(dst, p))
spec = os.path.join(here, 'pubspec.yaml')
y = open(spec, encoding='utf8').read()
i = y.index('  assets:\n', y.index('flutter:\n  uses-material-design'))
dirs = sorted(os.path.relpath(r, here).replace(os.sep, '/') + '/' for r, _, f in os.walk(dst) if f)
open(spec, 'w', encoding='utf8', newline='\n').write(y[:i] + '  assets:\n' + ''.join(f'    - {d}\n' for d in dirs))
print('synced', len(dirs), 'folders')
