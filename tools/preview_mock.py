"""Gera dist/ui-preview.html: o app (ambiente dev) com o Firebase SIMULADO embutido, para olhar as telas de nuvem
(perfil, administrador...) no navegador sem tocar em nenhum banco de verdade. Só para desenvolvimento.

    python tools/preview_mock.py      ->  abra dist/ui-preview.html por um servidor local (npm run serve)
"""
import re, subprocess, sys, os
root = os.path.join(os.path.dirname(__file__), '..')
os.chdir(root)
subprocess.run([sys.executable, 'build.py', '--env', 'dev', '--out', 'dist/ui-preview.html'], check=True, stdout=subprocess.DEVNULL)
with open('dist/ui-preview.html', encoding='utf-8') as f:
    html = f.read()
with open('tests/helpers/firebase-mock.js', encoding='utf-8') as f:
    mock = f.read()
shim = '<script>(function(){const module={exports:{}};' + mock + ';window.__mockDb=module.exports.createDb();module.exports.install(window,window.__mockDb)})()</script>\n'
# troca os 3 scripts do SDK do Firebase pelo simulado
html, n = re.subn(r'(<script src="https://www\.gstatic\.com/firebasejs/[^"]+"></script>\s*)+', lambda m: shim, html, count=1)
assert n == 1, 'não achei os scripts do Firebase'
with open('dist/ui-preview.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('dist/ui-preview.html gerado (Firebase simulado)')
