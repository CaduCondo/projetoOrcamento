"""Monta o index.html (arquivo único) a partir de src/.

  python build.py --env local   -> sem Firebase (contas só neste navegador)
  python build.py --env dev     -> Firebase de DESENVOLVIMENTO (faixa "AMBIENTE DE TESTE")
  python build.py --env prod    -> Firebase de PRODUÇÃO
  python build.py --env dev --out dist/dev/index.html

Padrão: --env local --out dist/index.html
"""
import argparse, glob, json, os

SDK_VERSION = '10.12.5'

def build(env, out):
    def read(path):
        with open(path, encoding='utf-8') as f:
            return f.read()
    html = read('src/index.html')
    js = '\n'.join(read(p) for p in sorted(glob.glob('src/js/*.js')))
    html = html.replace('/*CSS*/', read('src/css/styles.css'))
    html = html.replace('/*CHARTJS*/', read('src/vendor/chart.js').replace('</script>', '<\\/script>'))
    sdk = ''
    if env in ('dev', 'prod'):
        cfg = json.loads(read(f'src/config/firebase.{env}.json'))
        js = js.replace('/*FIREBASE*/null', json.dumps(cfg))
        sdk = ''.join(f'<script src="https://www.gstatic.com/firebasejs/{SDK_VERSION}/firebase-{n}-compat.js"></script>\n'
                      for n in ('app', 'auth', 'firestore'))
    js = js.replace("/*ENV*/'local'", json.dumps(env)).replace('/*SEED*/null', 'null')
    html = html.replace('<!--FBSDK-->', sdk).replace('/*APP*/', js.replace('</script>', '<\\/script>'))
    if env == 'dev':
        html = html.replace('<title>Meu Orçamento</title>', '<title>[TESTE] Meu Orçamento</title>')
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    return len(html)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--env', choices=['local', 'dev', 'prod'], default='local')
    ap.add_argument('--out', default='dist/index.html')
    a = ap.parse_args()
    print(f'{a.out} gerado ({a.env}, {build(a.env, a.out)} bytes)')
