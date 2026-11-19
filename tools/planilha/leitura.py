"""Leitura da planilha de orçamento (abas 2015-2026) para uma lista simples de células.
Não grava nada: só devolve, para cada categoria e mês, o valor, a marca OK e a nota."""
import re, openpyxl

MESES = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

def norm(s):
    import unicodedata
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', s).strip()

def eh_mes(v):
    return isinstance(v, str) and norm(v) in MESES

def dinheiro(t):
    """'4.033' -> 4033 · '441.00' -> 441 · '4.239,02' -> 4239.02 · 'R$4,994,71' -> 4994.71 · '#  149,91' -> 149.91"""
    if t is None: return None
    if isinstance(t, (int, float)): return round(float(t), 2)
    s = re.sub(r'R\$|#|\s', '', str(t))
    neg = s.startswith('-'); s = s.lstrip('-+')
    if not s or not re.fullmatch(r'[\d.,]+', s): return None
    if ',' in s and '.' in s:
        dec = ',' if s.rfind(',') > s.rfind('.') else '.'
        mil = '.' if dec == ',' else ','
        s = s.replace(mil, '').replace(dec, '.')
    elif ',' in s:
        p = s.split(',')
        s = ''.join(p[:-1]) + '.' + p[-1] if len(p) > 1 else s
    elif '.' in s:
        p = s.split('.')
        if len(p) > 2 or len(p[-1]) == 3: s = ''.join(p)       # 4.033 / 1.234.567 = milhar
    try: v = round(float(s), 2)
    except ValueError: return None
    return -v if neg else v

def texto_nota(c):
    t = c.comment.text if c.comment else ''
    if t.startswith('[Threaded comment]'):               # comentário "moderno" do Excel: pega o texto principal
        t = t.split('Comment:', 1)[-1]
        t = re.split(r'\n\s*Reply:', t)[0]
        t = re.sub(r'^\s*\n?', '', t.replace('\t', ''))
    return t.replace('\r', '')

LINHA = re.compile(r'^\s*(#)?\s*(?:R\$)?\s*(-?\d[\d.,]*)\s*(?:[-–—:]\s*(.*))?$')
TRACOS = re.compile(r'^\s*[-=_*]{3,}\s*$')

def linhas_da_nota(nota):
    """Devolve [(valor, descricao, confirmado, informativo)] e a sobra (texto depois da linha de traços). Linha que começa com # = informativa (já está no cartão).
    Regra do dono: linhas até a 1ª linha em branco = confirmadas; depois de uma linha em branco = previstas."""
    itens, seg, extra = [], 0, []
    ls = nota.split('\n')
    for i, ln in enumerate(ls):
        if TRACOS.match(ln):
            extra = [x for x in ls[i + 1:] if x.strip()]; break
        if not ln.strip():
            seg = 1; continue
        m = LINHA.match(ln)
        if not m: continue
        v = dinheiro(m.group(2))
        if v is None: continue
        itens.append((v, (m.group(3) or '').strip(), seg == 0, bool(m.group(1))))
    return itens, extra

def achar_blocos_A(ws):
    """Layouts com 'Dia | Receber/PAGAR | Janeiro ...': devolve [(tipo, linha_cabecalho)]"""
    out = []
    for r in range(1, ws.max_row + 1):
        c = ws.cell(r, 3).value
        if isinstance(c, str) and norm(c) in ('receber', 'pagar') and any(eh_mes(ws.cell(r, k).value) for k in range(4, 8)):
            out.append(('receber' if norm(c) == 'receber' else 'pagar', r))
    return out

def colunas_meses(ws, linha):
    cols = {}
    for k in range(1, ws.max_column + 1):
        v = ws.cell(linha, k).value
        if eh_mes(v):
            m = MESES.index(norm(v))
            if m not in cols: cols[m] = k
    return cols

def faixa_soma(wsf, linha_total, col):
    """Linhas que a fórmula do TOTAL realmente soma naquele mês, ex.: =SUM(D22:D26) -> (22, 26). Sem fórmula -> None."""
    f = wsf.cell(linha_total, col).value
    m = re.fullmatch(r'=SUM\(\$?[A-Z]+\$?(\d+):\$?[A-Z]+\$?(\d+)\)', str(f or '').replace(' ', ''))
    return (int(m.group(1)), int(m.group(2))) if m else None

def ler_ano(ws, wsf=None):
    """Devolve lista de dicts: {tipo, nome, dia, mes(0-11), valor, ok_marca, nota, coord}; e o acumulado do ano."""
    cels, avisos = [], []
    blocos = achar_blocos_A(ws)
    if blocos:                                                    # layouts A (2017-2020, 2022-2026) e B (2021)
        for tipo, h in blocos:
            cols = colunas_meses(ws, h)
            contiguo = len(cols) >= 2 and sorted(cols.values())[1] - sorted(cols.values())[0] == 1
            lt = next((r for r in range(h + 1, h + 70) if norm(str(ws.cell(r, 3).value or '')) == 'total'), None)
            faixas = {m: faixa_soma(wsf, lt, k) for m, k in cols.items()} if (wsf is not None and lt) else {}
            r = h + 1
            while r <= ws.max_row:
                nome = ws.cell(r, 3).value
                if nome is None and all(ws.cell(r, k).value is None for k in cols.values()):
                    r += 1
                    if r > h + 60: break
                    continue
                if isinstance(nome, str) and norm(nome) in ('total', 'total mes', 'total acumulado'): break
                if nome is None: r += 1; continue
                dia = ws.cell(r, 2).value
                dia = int(dia) if isinstance(dia, (int, float)) and 1 <= dia <= 31 else None
                for m, k in cols.items():
                    c = ws.cell(r, k); v = dinheiro(c.value); info = isinstance(c.value, str) and v is not None          # texto (ex.: '#  571,99', 'R$1.100#', '11,58'): o Excel não soma
                    marca = (not contiguo) and str(ws.cell(r, k + 1).value or '').strip().upper() == 'OK'
                    nota = texto_nota(c)
                    if v is None and not nota.strip(): continue
                    fx = faixas.get(m); fora = bool(fx) and not (fx[0] <= r <= fx[1])
                    cels.append(dict(tipo=tipo, nome=str(nome).strip(), dia=dia, fora=fora, mes=m, valor=v or 0.0,
                                     marca=marca, info=info, tem_marcas=not contiguo, nota=nota, coord=c.coordinate, linha=r))
                r += 1
    else:                                                          # layout C (2015-2016): seções em A, categorias em B
        h = next(r for r in range(1, 12) if eh_mes(ws.cell(r, 3).value))
        cols = colunas_meses(ws, h); tipo = None; faixas = {}
        for r in range(h + 1, ws.max_row + 1):
            a, b = ws.cell(r, 1).value, ws.cell(r, 2).value
            if isinstance(b, str) and norm(b) == 'totais': break
            if isinstance(a, str) and a.strip():
                tipo = 'receber' if norm(a) in ('minha renda',) else 'pagar'
                faixas = {m: faixa_soma(wsf, r, k) for m, k in cols.items()} if wsf is not None else {}; continue
            if not (isinstance(b, str) and b.strip()) or tipo is None: continue
            for m, k in cols.items():
                c = ws.cell(r, k); v = dinheiro(c.value); nota = texto_nota(c)
                if v is None and not nota.strip(): continue
                fx = faixas.get(m); fora = bool(fx) and not (fx[0] <= r <= fx[1])
                cels.append(dict(tipo=tipo, nome=b.strip(), dia=None, fora=fora, mes=m, valor=v or 0.0, marca=False,
                                 info=isinstance(c.value, str) and v is not None,
                                 tem_marcas=False, nota=nota, coord=c.coordinate, linha=r))
    return cels

def carregar(caminho):
    wb = openpyxl.load_workbook(caminho, data_only=True)           # valores
    wf = openpyxl.load_workbook(caminho)                           # fórmulas (para saber o que o TOTAL soma)
    return {int(ws.title): ler_ano(ws, wf[ws.title]) for ws in wb if re.fullmatch(r'20(1[5-9]|2\d)', ws.title)}, wb
