"""Gera o index.html (arquivo único, sem dados pessoais) a partir de src/.

  python build.py            -> modo local (sem Firebase)
  python build.py --cloud    -> usa src/firebase-config.json (login e dados na nuvem)
"""
import json, os, sys
t = open('src/template.html', encoding='utf-8').read()
t = t.replace('/*CHARTJS*/', open('src/chart.js', encoding='utf-8').read().replace('</script>', '<\/script>'))
t = t.replace('/*SEED*/null', 'null')
sdk = ''
if '--cloud' in sys.argv:
    cfg = json.load(open('src/firebase-config.json', encoding='utf-8'))
    t = t.replace('/*FIREBASE*/null', json.dumps(cfg))
    v = '10.12.5'
    sdk = ''.join(f'<script src="https://www.gstatic.com/firebasejs/{v}/firebase-{n}-compat.js"></script>\n' for n in ('app', 'auth', 'firestore'))
t = t.replace('<!--FBSDK-->', sdk)
open('index.html', 'w', encoding='utf-8').write(t)
print('index.html gerado', len(t), 'bytes', '(nuvem)' if sdk else '(local)')
