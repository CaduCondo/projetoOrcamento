"""TESTE do Meu Pluggy: confere se a API gratuita devolve os SEUS extratos de verdade.

Você roda no seu computador; ele pergunta as credenciais e NÃO guarda nada (nem em arquivo, nem no histórico).
Mostra só um resumo na tela: contas encontradas, quantos lançamentos por mês e o sinal dos valores
(é isso que eu preciso saber para ligar o app). Nada é enviado para outro lugar além da própria Pluggy.

    python tools/teste_pluggy.py
    python tools/teste_pluggy.py --salvar C:\\Users\\SEU_USUARIO\\Downloads\\pluggy-teste.json   (opcional: guarda os lançamentos FORA do projeto)
"""
import getpass, json, sys, urllib.request, urllib.error, datetime, collections

API = 'https://api.pluggy.ai'

def chamar(metodo, caminho, chave=None, corpo=None):
    req = urllib.request.Request(API + caminho, method=metodo,
                                 data=json.dumps(corpo).encode() if corpo is not None else None,
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json', **({'X-API-KEY': chave} if chave else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        corpo = e.read().decode(errors='replace')[:300]
        raise SystemExit(f'\n❌ A Pluggy respondeu {e.code} em {caminho}: {corpo}\n')

def mascara(txt):
    t = str(txt or '')
    return ('…' + t[-4:]) if len(t) > 4 else t

def main():
    salvar = sys.argv[sys.argv.index('--salvar') + 1] if '--salvar' in sys.argv else None
    print('\n=== Teste do Meu Pluggy ===')
    print('As credenciais ficam em dashboard.pluggy.ai → sua aplicação (demo) → Client ID / Client Secret.')
    print('O Item ID aparece no Dashboard quando você conecta o "Meu Pluggy" na aplicação.\n')
    client_id = input('Client ID: ').strip()
    limpa = lambda t: t.strip().strip('"\'').replace(' ', '')
    if input('Mostrar o Client Secret enquanto você cola? (s = sim, mais fácil de conferir; Enter = esconder): ').strip().lower().startswith('s'):
        secret = limpa(input('Client Secret: '))
    else:
        secret = limpa(getpass.getpass('Client Secret (não aparece ao colar; é normal): '))
    client_id = limpa(client_id)
    print(f'   (recebi {len(secret)} caracteres no Client Secret e {len(client_id)} no Client ID; o Client ID tem 36)')
    itens = [limpa(i) for i in input('Item ID (copie da barra de endereço depois de "itemId="; se tiver mais de um, separe por vírgula): ').split(',') if i.strip()]
    if not (client_id and secret and itens):
        raise SystemExit('Faltou alguma informação.')

    chave = chamar('POST', '/auth', corpo={'clientId': client_id, 'clientSecret': secret}).get('apiKey')
    secret = None
    if not chave:
        raise SystemExit('❌ Não recebi a chave da Pluggy (Client ID/Secret errados?).')
    print('✓ Autenticado na Pluggy.\n')

    hoje = datetime.date.today()
    de = (hoje - datetime.timedelta(days=90)).isoformat()
    guardar = []
    for item_id in itens:
        item = chamar('GET', f'/items/{item_id}', chave)
        conector = (item.get('connector') or {}).get('name', '?')
        print(f'■ Conexão {mascara(item_id)} · {conector} · situação: {item.get("status")} · atualizado em: {item.get("lastUpdatedAt")}')
        contas = chamar('GET', f'/accounts?itemId={item_id}', chave).get('results', [])
        if not contas:
            print('   (nenhuma conta nesta conexão)')
        for c in contas:
            print(f'   • Conta {c.get("type")}/{c.get("subtype")} · {c.get("name")} · número {mascara(c.get("number"))} · saldo {c.get("balance")}')
            pagina, todas = 1, []
            while True:
                r = chamar('GET', f'/transactions?accountId={c["id"]}&from={de}&to={hoje.isoformat()}&pageSize=500&page={pagina}', chave)
                todas += r.get('results', [])
                if pagina >= (r.get('totalPages') or 1):
                    break
                pagina += 1
            por_mes = collections.defaultdict(lambda: [0, 0.0])
            for t in todas:
                m = str(t.get('date', ''))[:7]
                por_mes[m][0] += 1
                por_mes[m][1] += float(t.get('amount') or 0)
            neg = sum(1 for t in todas if float(t.get('amount') or 0) < 0)
            tipos = collections.Counter(t.get('type') for t in todas)
            print(f'     {len(todas)} lançamentos nos últimos 90 dias · negativos: {neg} · positivos: {len(todas) - neg} · tipos: {dict(tipos)}')
            for m in sorted(por_mes):
                print(f'       {m}: {por_mes[m][0]} lançamentos, soma {por_mes[m][1]:.2f}')
            if c.get('type') == 'CREDIT':
                faturas = chamar('GET', f'/bills?accountId={c["id"]}', chave).get('results', [])
                print(f'     faturas encontradas: {len(faturas)}' + (f' · última: vence {faturas[0].get("dueDate")} valor {faturas[0].get("totalAmount")}' if faturas else ''))
            guardar.append({'conta': {k: c.get(k) for k in ('type', 'subtype', 'name')}, 'lancamentos': [
                {k: t.get(k) for k in ('date', 'description', 'amount', 'type', 'category', 'creditCardMetadata')} for t in todas]})
        print()

    if salvar:
        with open(salvar, 'w', encoding='utf-8') as f:
            json.dump(guardar, f, ensure_ascii=False, indent=1)
        print(f'Lançamentos guardados em {salvar} (arquivo seu; não coloque dentro da pasta do projeto).')
    print('Pronto. Copie e me mande só este resumo (sem o Client Secret, que nem aparece aqui).')

if __name__ == '__main__':
    main()
