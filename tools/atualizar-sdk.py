"""Atualiza a versão do Firebase SDK usada pelo site e grava o SRI (hash de integridade) de cada arquivo.

Uso:  python tools/atualizar-sdk.py 12.19.0

Por quê: o site carrega o SDK de um endereço do Google (gstatic.com). Com o hash (atributo `integrity`), o navegador RECUSA o arquivo se
o conteúdo for diferente do que conferimos aqui, mesmo que o endereço seja comprometido. O build.py lê src/config/firebase-sdk.json.
Depois de atualizar: rodar os testes, conferir no /dev/ (login, nuvem, foto, buscar do banco) e só então ir para a produção."""
import base64, hashlib, json, sys, urllib.request

NOMES = ('app', 'auth', 'firestore', 'app-check')

def sri(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        dados = r.read()
    return 'sha384-' + base64.b64encode(hashlib.sha384(dados).digest()).decode(), len(dados)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    versao = sys.argv[1]
    hashes = {}
    for n in NOMES:
        h, tam = sri(f'https://www.gstatic.com/firebasejs/{versao}/firebase-{n}-compat.js')
        hashes[n] = h
        print(f'{n:10} {tam:>8} bytes  {h}')
    with open('src/config/firebase-sdk.json', 'w', encoding='utf-8') as f:
        json.dump({'version': versao, 'sri': hashes}, f, indent=2); f.write('\n')
    print('gravado em src/config/firebase-sdk.json')
