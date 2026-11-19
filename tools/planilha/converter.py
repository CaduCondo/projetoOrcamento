"""Converte a planilha de orçamento (abas 2015-2026) num arquivo que o Meu Orçamento carrega em
Ajustes → Carregar backup → "Juntar" (os anos do arquivo substituem os mesmos anos do app).

Regras (do dono):
 • O valor da célula = soma dos valores das linhas da nota que estão ATÉ a primeira linha em branco (confirmados).
 • Linhas DEPOIS de uma linha em branco são PREVISTAS (ainda não confirmadas; não somam no valor da célula).
 • Célula com "OK" ao lado = confirmada. Sem "OK" (nos anos que usam a marca) = tudo previsto.
 • Se a nota não fecha com o valor da célula, o total da planilha manda: entra a linha "(sem detalhe / diferença)" com ⚠.
 • Texto depois de uma linha de traços (-----) é comentário e não vira lançamento.
Uso:  python tools/planilha/converter.py "Orçamento.xlsx" [pasta_de_saida]
Os arquivos gerados têm dados pessoais: ficam FORA do repositório (padrão: pasta Downloads)."""
import sys, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from leitura import carregar, norm, linhas_da_nota, colunas_meses, achar_blocos_A, MESES

ANO_CORRENTE = 2026                                   # só neste ano "sem OK" significa previsto
AJUSTE = '(sem detalhe / diferença)'                  # texto que o app já reconhece: mostra ⚠ para revisar e os gráficos ignoram

def desc_curta(nota, nome):
    for ln in nota.split('\n'):
        t = ln.strip()
        if t and re.search(r'[A-Za-zÀ-ú]{3}', t) and not re.match(r'^(R\$\s*-|#)', t):
            return re.sub(r'\s+', ' ', t)[:80]
    return nome

def montar_celula(x, ano_corrente):
    """-> (lista de itens {v,d,ok[,info]}, status)"""
    nome, v = x['nome'], x['valor']
    confirmada = (x['marca'] or x['ano'] < ano_corrente) if x['tem_marcas'] else True
    it, _ = linhas_da_nota(x['nota'])
    it = [(a, d or nome, c, i) for a, d, c, i in it if 0.004 < abs(a) < 1e7]
    if x['info'] or x['fora']:                           # valor com # (já está no cartão) ou linha que o TOTAL da planilha não soma: só informação
        st = 'informativo' if x['info'] else 'fora_da_soma'
        if it: return [dict(v=a, d=d, ok=True, info=True) for a, d, _, _ in it], st
        return ([dict(v=v, d=desc_curta(x['nota'], nome), ok=True, info=True)] if abs(v) > 0.004 else []), st
    inf = [(a, d, True, True) for a, d, _, i in it if i]
    it = [i for i in it if not i[3]]
    conf = [i for i in it if i[2]]; prev = [i for i in it if not i[2]]
    extra_info = [dict(v=a, d=d, ok=True, info=True) for a, d, _, _ in inf]
    if not it:
        if abs(v) < 0.005: return extra_info, ('informativo' if extra_info else 'vazio')
        return [dict(v=v, d=desc_curta(x['nota'], nome), ok=confirmada)] + extra_info, 'sem_detalhe'
    if abs(v) < 0.005:                                   # a célula não conta nada: a nota toda é previsão
        return [dict(v=a, d=d, ok=False) for a, d, _, _ in it] + extra_info, 'so_previsto'
    out, status = [], 'exato'
    if conf:
        soma = round(sum(a for a, _, _, _ in conf), 2); dif = round(v - soma, 2)
        out += [(a, d, confirmada) for a, d, _, _ in conf]
        if abs(dif) >= 0.01: out.append((dif, AJUSTE, confirmada)); status = 'ajuste'
    else:
        out.append((v, desc_curta(x['nota'], nome), confirmada)); status = 'sem_detalhe'
    out += [(a, d, False) for a, d, _, _ in prev]
    return [dict(v=a, d=d, ok=c) for a, d, c in out] + extra_info, status

def acumulado_janeiro(ws):
    """Valor digitado em 'TOTAL ACUMULADO' (ou 'Saldo Acumulado') na coluna de janeiro."""
    blocos = achar_blocos_A(ws)
    h = blocos[0][1] if blocos else next(r for r in range(1, 12) if norm(str(ws.cell(r, 3).value or '')) == 'janeiro')
    jan = colunas_meses(ws, h).get(0)
    for r in range(1, ws.max_row + 1):
        for k in (1, 2, 3):
            t = ws.cell(r, k).value
            if isinstance(t, str) and norm(t) in ('total acumulado', 'saldo acumulado'):
                v = ws.cell(r, jan).value
                if isinstance(v, (int, float)): return float(v)
    return None

def total_da_planilha(ws, y, m):
    """Totais que a própria planilha mostra (linhas TOTAL), para conferência independente."""
    blocos = achar_blocos_A(ws); res = {}
    if not blocos:                                        # 2015-2016: a linha de cada seção (coluna A) já traz a soma dela
        h = next(r for r in range(1, 12) if norm(str(ws.cell(r, 3).value or '')) == 'janeiro')
        k = colunas_meses(ws, h)[m]; rec = pag = None
        for r in range(h + 1, ws.max_row + 1):
            if norm(str(ws.cell(r, 2).value or '')) == 'totais': break
            a = ws.cell(r, 1).value
            if isinstance(a, str) and a.strip():
                v = ws.cell(r, k).value; v = float(v) if isinstance(v, (int, float)) else 0.0
                if norm(a) == 'minha renda': rec = v
                else: pag = (pag or 0) + v
        return {'receber': rec, 'pagar': pag}
    if blocos:
        for tipo, h in blocos:
            cols = colunas_meses(ws, h)
            for r in range(h + 1, h + 70):
                if norm(str(ws.cell(r, 3).value or '')) == 'total':
                    v = ws.cell(r, cols[m]).value; res[tipo] = float(v) if isinstance(v, (int, float)) else None; break
    return res

def converter(caminho, saida):
    anos, wb = carregar(caminho)
    cats, ids, data, saldoIni, rel = [], {}, {}, {}, collections.defaultdict(list)
    esperado, stats = {}, collections.Counter()
    for y in sorted(anos):
        for x in anos[y]:
            k = (x['tipo'], norm(x['nome']))
            if k not in ids:
                ids[k] = 'pl%03d' % (len(ids) + 1); cats.append(dict(id=ids[k], tipo=x['tipo'], nome=x['nome'], dia=None))
            c = next(c for c in cats if c['id'] == ids[k])
            if x['dia']: c['dia'] = x['dia']
            x['ano'] = y; itens, status = montar_celula(x, ANO_CORRENTE); stats[status] += 1
            if not itens: continue
            data[f"{ids[k]}|{y}|{x['mes']}"] = {'items': itens}
            if status in ('ajuste', 'so_previsto', 'fora_da_soma') or any(i['d'] == AJUSTE for i in itens):
                rel[status].append((y, x['coord'], x['nome'], x['valor'], itens))
        ws = wb[str(y)]; ac = acumulado_janeiro(ws)
        res_jan = sum(x['valor'] * (1 if x['tipo'] == 'receber' else -1) for x in anos[y] if x['mes'] == 0 and not x['info'] and not x['fora'])
        if ac is not None: saldoIni[str(y)] = round(ac - res_jan, 2)
        for m in range(12):
            t = total_da_planilha(ws, y, m)
            if t:
                for tipo in ('receber', 'pagar'):      # parte que a planilha soma mas o app ainda não conta como realizado (célula sem OK em 2026)
                    t['sem_ok_' + tipo] = round(sum(x['valor'] for x in anos[y] if x['mes'] == m and x['tipo'] == tipo and not x['info'] and not x['fora']
                                                     and x['tem_marcas'] and not x['marca'] and y >= ANO_CORRENTE and x['valor'] > 0), 2)
                esperado[f'{y}|{m}'] = t
    estado = dict(anos=sorted(anos), saldoIni=saldoIni, cats=cats, data=data)
    os.makedirs(saida, exist_ok=True)
    with open(os.path.join(saida, 'orcamento-planilha.json'), 'w', encoding='utf-8') as f: json.dump(estado, f, ensure_ascii=False)
    with open(os.path.join(saida, 'conferencia-planilha.json'), 'w', encoding='utf-8') as f: json.dump(esperado, f)
    with open(os.path.join(saida, 'relatorio-planilha.txt'), 'w', encoding='utf-8') as f:
        n_it = sum(len(v['items']) for v in data.values())
        f.write(f"Anos: {estado['anos']}\nCategorias: {len(cats)}\nCélulas com lançamento: {len(data)}\nLançamentos: {n_it}\n")
        f.write('Células por tipo: ' + ', '.join(f'{k}={v}' for k, v in sorted(stats.items())) + '\n\n')
        f.write('=== Notas que não fecham com o valor da célula (entrou a linha "(sem detalhe / diferença)" com ⚠) ===\n')
        for y, co, nome, v, itens in rel['ajuste']:
            dif = next(i['v'] for i in itens if i['d'] == AJUSTE)
            f.write(f'{y} {co:6} {nome[:28]:28} célula {v:>10.2f}  diferença {dif:>+10.2f}\n')
        f.write('\n=== Células com valor 0 que têm nota: as linhas viraram PREVISTAS ===\n')
        for y, co, nome, v, itens in rel['so_previsto']:
            f.write(f'{y} {co:6} {nome[:28]:28} {len(itens)} linha(s), total {sum(i["v"] for i in itens):.2f}\n')
    return estado, stats

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.expanduser('~'), 'Downloads', 'orcamento-carga')
    estado, stats = converter(sys.argv[1], saida)
    print('Pronto:', saida); print(dict(stats)); print('anos', estado['anos'], 'cats', len(estado['cats']), 'celulas', len(estado['data']))
