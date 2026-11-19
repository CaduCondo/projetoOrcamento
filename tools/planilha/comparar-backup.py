"""Compara os TOTAIS de dois backups do app (ex.: o arquivo da carga original x o backup baixado do dev depois de mesclar categorias).
Mesclar / "Virar lançamento" só trocam lançamentos de categoria: os totais de cada mês (receber e pagar) não podem mudar.
Uso:  python tools/planilha/comparar-backup.py <backup-original.json> <backup-atual.json>
Lê só os dois arquivos; não grava nada."""
import json, sys

def carregar(caminho):
    with open(caminho, encoding='utf-8') as f: d = json.load(f)
    return d.get('S', d)                                      # o backup pode vir direto ou dentro de "S"

def totais(S):
    tipo = {c['id']: c['tipo'] for c in S.get('cats', [])}
    t, n = {}, 0
    for k, cel in S.get('data', {}).items():
        cid, ano, mes = k.split('|')
        tp = tipo.get(cid)
        if tp is None: continue
        for it in cel.get('items', []):
            n += 1
            if it.get('info'): continue                        # 💳 informativo nunca soma
            v = float(it.get('v') or 0)
            x = t.setdefault((int(ano), int(mes), tp), [0.0, 0.0])
            x[1] += v                                          # previsto = tudo que não é informativo
            if it.get('ok'): x[0] += v                         # realizado = só o confirmado
    return t, n

def main():
    if len(sys.argv) != 3: sys.exit(__doc__)
    A, B = carregar(sys.argv[1]), carregar(sys.argv[2])
    ta, na = totais(A); tb, nb = totais(B)
    print(f'Original: {len(A.get("cats", []))} categorias, {na} lançamentos')
    print(f'Atual:    {len(B.get("cats", []))} categorias, {nb} lançamentos')
    dif = []
    for k in sorted(set(ta) | set(tb)):
        a, b = ta.get(k, [0, 0]), tb.get(k, [0, 0])
        if abs(a[0] - b[0]) > 0.005 or abs(a[1] - b[1]) > 0.005: dif.append((k, a, b))
    print(f'Meses/tipos comparados: {len(set(ta) | set(tb))} · com diferença: {len(dif)}')
    for (ano, mes, tp), a, b in dif[:60]:
        print(f'  {mes + 1:02d}/{ano} {tp:8s} realizado {a[0]:>10.2f} -> {b[0]:>10.2f} | previsto {a[1]:>10.2f} -> {b[1]:>10.2f}')
    si_a, si_b = A.get('saldoIni', {}), B.get('saldoIni', {})
    sd = [(y, si_a.get(y), si_b.get(y)) for y in sorted(set(si_a) | set(si_b)) if si_a.get(y) != si_b.get(y)]
    print('Saldos iniciais iguais.' if not sd else f'Saldos iniciais diferentes: {sd}')
    print('RESULTADO: totais idênticos.' if not dif and not sd else 'RESULTADO: há diferenças (podem ser lançamentos que você incluiu/mudou de propósito).')

main()
