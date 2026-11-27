"""Baixa o Firebase SDK (os mesmos arquivos do site) para e2e/.sdk/<versão>/ e CONFERE o hash (SRI) de src/config/firebase-sdk.json.
Usado pelos testes E2E da nuvem: o navegador de teste recebe estes arquivos no lugar do endereço de fora, e o `integrity` do site
continua valendo (se o conteúdo não bater, o navegador recusa). Se já estiver baixado e certo, não faz nada."""
import base64, hashlib, json, os, sys, urllib.request

def main():
    sdk = json.load(open('src/config/firebase-sdk.json', encoding='utf-8'))
    pasta = os.path.join('e2e', '.sdk', sdk['version'])
    os.makedirs(pasta, exist_ok=True)
    for nome, esperado in sdk['sri'].items():
        arq = os.path.join(pasta, f'firebase-{nome}-compat.js')
        def confere(b): return 'sha384-' + base64.b64encode(hashlib.sha384(b).digest()).decode() == esperado
        if os.path.exists(arq) and confere(open(arq, 'rb').read()):
            continue
        with urllib.request.urlopen(f'https://www.gstatic.com/firebasejs/{sdk["version"]}/firebase-{nome}-compat.js', timeout=60) as r:
            dados = r.read()
        if not confere(dados):
            sys.exit(f'O arquivo baixado de {nome} NÃO confere com o hash de firebase-sdk.json. Não vou usar.')
        open(arq, 'wb').write(dados)
    print('SDK', sdk['version'], 'pronto em', pasta)

if __name__ == '__main__':
    main()
