/* Lançamentos e Automações (modelo, sem tela). Textos inventados. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const fresh = () => { m.S = sampleState(m); m.modo = 'real'; return m.S; };
const Y = 2026, M = 9;
const EXT = [
  'extrato conta / lançamentos', 'período de visualização: 01/10/2026 até 14/10/2026',
  '13/10/2026 PIX TRANSF FULANO -50,00', '10/10/2026 CONTA VIVO 03/10 -99,90', '05/10/2026 REMUNERACAO/SALARIO 5.000,00',
];
const FAT = ['Lançamentos: compras e saques', '21/09 PADARIA DO ZE 12,00', '22/09 LOJA DOIS 50,00', 'Total dos lançamentos atuais 62,00'];
const plain = o => JSON.parse(JSON.stringify(o));

test('texto de comparação: sem acento, data, parcela e símbolos', () => {
  assert.equal(m.autoTxt('10/10 CONTA VIVO 03/10 *Á'), 'conta vivo a');
  assert.equal(m.autoTxt('PIX  Padaria-do-Zé'), 'pix padaria do ze');
});

test('automação: precisa de texto com 3+ letras e categoria; repetir troca o destino', () => {
  fresh();
  assert.throws(() => m.addAuto('ab', 'pagar', 'Internet'), /3 letras/);
  assert.throws(() => m.addAuto('conta vivo', 'pagar', ''), /categoria/);
  m.addAuto('Conta Vivo', 'pagar', 'Internet'); m.addAuto('conta vivo', 'pagar', 'Telefone');
  assert.equal(m.autos().length, 1);
  assert.equal(m.autos()[0].nome, 'Telefone');
});

test('a automação mais específica ganha e respeita entrada/saída', () => {
  fresh();
  m.addAuto('vivo', 'pagar', 'Telefone'); m.addAuto('conta vivo', 'pagar', 'Internet'); m.addAuto('vivo', 'receber', 'Outras receitas');
  assert.equal(m.autoFor('CONTA VIVO 03/10', 'pagar').nome, 'Internet');
  assert.equal(m.autoFor('VIVO', 'receber').nome, 'Outras receitas');
  assert.equal(m.autoFor('mercado', 'pagar'), null);
});

test('extrato com automação: já cai na categoria certa, realizado, e não importa de novo; o resto fica "sem categoria"', () => {
  fresh(); m.addAuto('conta vivo', 'pagar', 'Internet');
  const its = m.extratoParaImportar(m.parseExtrato(EXT).itens, Y, M);
  const r = m.importStatement('conta', its, Y, M);
  assert.equal(r.auto, 1);
  const lan = m.lancamentos(Y, M);
  const vivo = lan.find(x => /CONTA VIVO/.test(x.it.d));
  assert.equal(vivo.c.nome, 'Internet'); assert.equal(vivo.sem, false); assert.equal(vivo.it.ok, true); assert.equal(vivo.it.v, 99.9);
  assert.equal(lan.filter(x => x.sem).length, 2, 'PIX e salário seguem na Movimentação, sem categoria');
  const r2 = m.importStatement('conta', its, Y, M);
  assert.equal(r2.novos, 0); assert.equal(r2.repetidos, 3);
});

test('fatura com automação: o item fica no cartão e ganha cópia informativa (💳, não soma) na categoria', () => {
  fresh(); m.addAuto('padaria', 'pagar', 'Luz');
  const r = m.importStatement('cartao', m.parseFatura(FAT).itens, Y, M);
  assert.equal(r.auto, 1);
  const merc = m.cats('pagar').find(c => c.nome === 'Luz');
  const copia = m.cellOf(merc.id, Y, M).items.find(i => i.info);
  assert.ok(copia && copia.lock && copia.v === 12);
  assert.equal(m.V(r.cat.id, Y, M, 'prev'), 62, 'o cartão continua somando tudo');
  const lan = m.lancamentos(Y, M), pad = lan.find(x => /PADARIA/.test(x.it.d));
  assert.equal(pad.cat.nome, 'Luz'); assert.equal(pad.sem, false);
  assert.equal(lan.filter(x => /PADARIA/.test(x.it.d)).length, 1, 'a cópia informativa não aparece em dobro');
  assert.equal(lan.find(x => /LOJA DOIS/.test(x.it.d)).sem, true);
});

test('mudar a categoria de um lançamento: do extrato, do cartão e digitado à mão', () => {
  fresh();
  const rc = m.importStatement('cartao', m.parseFatura(FAT).itens, Y, M), re = m.importStatement('conta', m.extratoParaImportar(m.parseExtrato(EXT).itens, Y, M), Y, M);
  const merc = m.cats('pagar').find(c => c.nome === 'Luz'), lazer = m.cats('pagar').find(c => c.nome === 'Celular');
  let l = m.lancamentos(Y, M).find(x => /LOJA DOIS/.test(x.it.d));
  m.moveLancamento(l.cid, Y, M, l.idx, merc.id);
  assert.equal(m.lancamentos(Y, M).find(x => /LOJA DOIS/.test(x.it.d)).cat.nome, 'Luz');
  l = m.lancamentos(Y, M).find(x => /LOJA DOIS/.test(x.it.d));
  m.moveLancamento(l.cid, Y, M, l.idx, lazer.id);                       // trocar de novo: desfaz a cópia anterior
  assert.equal(m.cellOf(merc.id, Y, M)?.items.filter(i => /LOJA DOIS/.test(i.d)).length || 0, 0);
  assert.equal(m.lancamentos(Y, M).find(x => /LOJA DOIS/.test(x.it.d)).cat.nome, 'Celular');
  const antesPix = m.MT('pagar', Y, M, 'real');
  const pix = m.lancamentos(Y, M).find(x => /PIX/.test(x.it.d));
  m.moveLancamento(pix.cid, Y, M, pix.idx, merc.id);
  assert.equal(m.lancamentos(Y, M).find(x => /PIX/.test(x.it.d)).cat.nome, 'Luz');
  assert.equal(m.MT('pagar', Y, M, 'real'), antesPix, 'o gasto continua o mesmo, só mudou de categoria');
  m.ens(merc.id, Y, M).items.push({ v: 7, d: 'Pão', ok: true });         // à mão
  const pao = m.lancamentos(Y, M).find(x => x.it.d === 'Pão');
  m.moveLancamento(pao.cid, Y, M, pao.idx, lazer.id);
  assert.equal(m.lancamentos(Y, M).find(x => x.it.d === 'Pão').cat.nome, 'Celular');
});

test('"aplicar" organiza os que já estavam sem categoria quando surge uma automação nova', () => {
  fresh();
  m.importStatement('conta', m.extratoParaImportar(m.parseExtrato(EXT).itens, Y, M), Y, M);
  assert.equal(m.lancamentos(Y, M).filter(x => x.sem).length, 3);
  m.addAuto('conta vivo', 'pagar', 'Internet'); m.addAuto('pix transf', 'pagar', 'Celular');
  assert.equal(m.aplicarAutomacoes(), 2);
  assert.equal(m.lancamentos(Y, M).filter(x => x.sem).length, 1);
  assert.equal(m.aplicarAutomacoes(), 0);
});

test('lançamentos: ordenados por dia, entrada positiva e saída negativa', () => {
  fresh();
  m.importStatement('conta', m.extratoParaImportar(m.parseExtrato(EXT).itens, Y, M), Y, M);
  const l = m.lancamentos(Y, M);
  assert.deepEqual(plain(l.map(x => x.dia)), [5, 10, 13]);
  assert.deepEqual(plain(l.map(x => x.v)), [5000, -99.9, -50]);
});

test('ícone: sugerido pelo nome quando não escolhido; renomear leva ícone e cor junto', () => {
  fresh();
  assert.equal(m.catIco({ nome: 'Mercado' }), '🛒');
  assert.equal(m.catIco({ nome: 'Mercado', ico: '🐶' }), '🐶');
  assert.equal(m.catIco({ nome: 'Xyz' }), '');
  const c = m.cats('pagar').find(x => x.nome === 'Celular'); c.ico = '🎮'; c.cor = '#60a5fa';
  m.ens(c.id, 2026, 7).items.push({ v: 1, d: 'x', ok: true });
  const n = m.reviseCat(c.id, { nome: 'Diversão', dia: '' }, 'manter', Y, M);
  assert.notEqual(n.id, c.id); assert.equal(n.ico, '🎮'); assert.equal(n.cor, '#60a5fa');
});

test('as automações viajam com os dados (meta) e voltam', () => {
  fresh(); m.addAuto('conta vivo', 'pagar', 'Internet');
  const ser = m.serializeState(m.S), back = m.deserializeState(ser.meta, ser.years);
  assert.equal(back.autos.length, 1); assert.equal(back.autos[0].txt, 'conta vivo');
  assert.deepEqual(plain(m.mig({ anos: [2026], cats: [], data: {}, saldoIni: {} }).autos), []);
});

test('mudar só o dia da categoria edita no lugar (sem criar versão nova) e a lista mostra uma linha só', () => {
  fresh();
  const c = m.cats('pagar').find(x => x.nome === 'Celular');
  m.ens(c.id, 2026, 7).items.push({ v: 1, d: 'x', ok: true });
  const n = m.reviseCat(c.id, { nome: 'Celular', dia: '10' }, 'manter', Y, M);
  assert.equal(n.id, c.id); assert.equal(n.dia, 10);
  assert.equal(m.S.cats.filter(x => x.nome === 'Celular').length, 1);
  const r = m.reviseCat(c.id, { nome: 'Celular Novo', dia: '10' }, 'manter', Y, M);   // trocar o nome continua criando versão
  assert.notEqual(r.id, c.id);
  const atuais = m.catsAtuais();
  assert.ok(atuais.includes(r) && !atuais.includes(m.catById(c.id)), 'a versão antiga some da lista');
  assert.equal(m.statsComHistorico()[r.id].n, 2, 'a atual soma o uso das anteriores');
});

test('parcelas futuras: lê "LOJA 03/08" da fatura e projeta as que faltam, sem duplicar a compra', () => {
  fresh();
  assert.equal(m.parcelaDe('LOJA 03/08').n, 3); assert.equal(m.parcelaDe('LOJA 03/08').base, 'LOJA');
  assert.equal(m.parcelaDe('MERCADO'), null); assert.equal(m.parcelaDe('X 31/12'), null);
  const FAT2 = ['Lançamentos: compras e saques', '21/09 LOJA TRES 03/05 100,00', '22/09 PADARIA 12,00', 'Total dos lançamentos atuais 112,00'];
  m.importStatement('cartao', m.parseFatura(FAT2).itens, Y, 8);                  // fatura de setembro
  const FAT3 = ['Lançamentos: compras e saques', '21/10 LOJA TRES 04/05 100,00', 'Total dos lançamentos atuais 100,00'];
  m.importStatement('cartao', m.parseFatura(FAT3).itens, Y, 9);                  // a de outubro traz a parcela seguinte
  const c = m.comprasParceladas(Y, 9);
  assert.equal(c.length, 1); assert.equal(c[0].n, 4); assert.equal(c[0].faltam, 1, 'usa a parcela mais recente, não conta em dobro');
  const pm = m.parcelasPorMes(Y, 9);
  assert.equal(pm.length, 1); assert.equal(pm[0].m, 10); assert.equal(pm[0].total, 100); assert.equal(pm[0].itens[0].n, 5);
  assert.equal(m.parcelasPorMes(Y, 10).length, 0, 'depois da última parcela nada sobra');
});

test('carteira: saldo de dinheiro em papel com histórico; cria o saldo na primeira vez', () => {
  fresh();
  assert.equal(m.carteiraItem(), null); assert.equal(m.carteiraSaldo(), 0);
  m.carteiraMov(200, 'Saque'); m.carteiraMov(-35.5, 'Feira');
  assert.equal(m.carteiraSaldo(), 164.5);
  assert.equal(m.S.saldos.filter(i => i.carteira).length, 1, 'um item só, dentro dos saldos do Patrimônio');
  assert.equal(m.carteiraItem().hist.length, 2); assert.equal(m.carteiraItem().hist[0].d, 'Feira');
  assert.throws(() => m.carteiraMov(0), /valor/);
});

test('recorrentes: despesa que repete em 3+ meses com valor parecido; ignora parcelas e valores que variam muito', () => {
  fresh();
  const mk = (mes, desc, v) => m.importStatement('cartao', m.parseFatura(['Lançamentos: compras e saques', `10/${String(mes + 1).padStart(2, '0')} ${desc} ${v}`, `Total dos lançamentos atuais ${v}`]).itens, Y, mes);
  mk(6, 'NETFLIX', '39,90'); mk(7, 'NETFLIX', '39,90'); mk(8, 'NETFLIX', '39,90'); mk(9, 'NETFLIX', '39,90');
  mk(6, 'LOJA UM 01/10', '50,00'); mk(7, 'LOJA UM 02/10', '50,00'); mk(8, 'LOJA UM 03/10', '50,00');
  mk(6, 'MERCADO X', '20,00'); mk(7, 'MERCADO X', '180,00'); mk(8, 'MERCADO X', '60,00');
  const r = m.recorrentes(Y, 9);
  assert.deepEqual(plain(r.map(x => x.txt)), ['netflix']);
  assert.equal(r[0].v, 39.9); assert.equal(r[0].noMes, true); assert.ok(r[0].n >= 4);
});

/* ---- Virar lançamento: a categoria vira lançamentos de outra, no mesmo mês ---- */
function docs() {
  fresh();
  const dst = m.addCat('pagar', 'Documentos carro'), ipva = m.addCat('pagar', 'IPVA'), lic = m.addCat('pagar', 'Licenciamento');
  m.ens(ipva.id, 2017, 3).items.push({ v: 200, d: '', ok: true });
  m.ens(ipva.id, 2018, 3).items.push({ v: 200, d: 'parcela 1', ok: true }, { v: 50, d: 'IPVA multa', ok: false });
  m.ens(lic.id, 2017, 9).items.push({ v: 150, d: 'Licenciamento', ok: true });
  m.ens(dst.id, 2018, 3).items.push({ v: 100, d: 'Seguro', ok: true });
  return { dst, ipva, lic };
}

test('virar lançamento: cada valor vai para o MESMO mês da outra categoria e a antiga some', () => {
  const { dst, ipva } = docs();
  const n = m.virarLancamento(ipva.id, dst.id);
  assert.equal(n, 3);
  assert.equal(m.catById(ipva.id), undefined, 'a categoria antiga deixa de existir');
  assert.deepEqual(plain(m.cellOf(dst.id, 2017, 3).items), [{ v: 200, d: 'IPVA', ok: true }]);          // sem descrição: vira o nome da categoria
  assert.deepEqual(plain(m.cellOf(dst.id, 2018, 3).items).map(i => [i.v, i.d, i.ok]),
    [[100, 'Seguro', true], [200, 'IPVA - parcela 1', true], [50, 'IPVA multa', false]]);               // mantém o que já estava e o "previsto"
  assert.equal(Object.keys(m.S.data).some(k => k.startsWith(ipva.id + '|')), false, 'nada fica para trás');
});

test('virar lançamento: o total do mês da categoria escolhida soma o que veio, e o dos outros meses não muda', () => {
  const { dst, ipva, lic } = docs();
  const antes = m.MT('pagar', 2017, 9, 'prev'), total2018 = m.MT('pagar', 2018, 3, 'prev');
  m.virarLancamento(ipva.id, dst.id);
  assert.equal(m.V(dst.id, 2017, 3, 'real'), 200);
  assert.equal(m.MT('pagar', 2018, 3, 'prev'), total2018, 'o total geral do mês não muda: só trocou de categoria');
  assert.equal(m.MT('pagar', 2017, 9, 'prev'), antes, 'outro mês e outra categoria: intactos');
  assert.ok(m.catById(lic.id));
});

test('virar lançamento: exemplos mostrados antes de confirmar, em ordem de data', () => {
  const { ipva } = docs();
  const l = plain(m.lancamentosParaVirar(ipva.id));
  assert.deepEqual(l.map(i => [i.y, i.m, i.v, i.d]), [[2017, 3, 200, 'IPVA'], [2018, 3, 200, 'IPVA - parcela 1'], [2018, 3, 50, 'IPVA multa']]);
  assert.ok(m.catById(ipva.id), 'só mostrar não muda nada');
});

test('virar lançamento: recusa tipo diferente, a mesma categoria e a própria versão antiga', () => {
  const { dst, ipva } = docs();
  const rec = m.addCat('receber', 'Salário X');
  assert.throws(() => m.virarLancamento(ipva.id, rec.id), /mesmo tipo/);
  assert.throws(() => m.virarLancamento(ipva.id, ipva.id), /outra categoria/);
  const v2 = m.addCat('pagar', 'IPVA novo'); v2.prevId = ipva.id;
  assert.throws(() => m.virarLancamento(v2.id, ipva.id), /outra categoria/, 'a versão antiga faz parte da mesma categoria');
  assert.ok(m.catById(ipva.id) && m.catById(dst.id));
});

test('virar lançamento: leva junto o histórico de nomes antigos, cada mês com o nome que tinha', () => {
  const { dst } = docs();
  const velha = m.addCat('pagar', 'DPVAT'); m.ens(velha.id, 2017, 3).items.push({ v: 400, d: '', ok: true });
  const atual = m.addCat('pagar', 'Seguro obrigatório'); atual.prevId = velha.id; m.ens(atual.id, 2019, 3).items.push({ v: 420, d: '', ok: true });
  m.virarLancamento(atual.id, dst.id);
  assert.deepEqual(plain(m.cellOf(dst.id, 2017, 3).items).map(i => i.d), ['DPVAT']);
  assert.deepEqual(plain(m.cellOf(dst.id, 2019, 3).items).map(i => i.d), ['Seguro obrigatório']);
  assert.equal(m.catById(velha.id), undefined); assert.equal(m.catById(atual.id), undefined);
});

test('virar lançamento: regras de importação que levavam para a categoria antiga passam a levar para a nova', () => {
  const { dst, ipva } = docs();
  m.addAuto('detran ipva', 'pagar', 'IPVA');
  m.virarLancamento(ipva.id, dst.id);
  assert.equal(m.autoFor('DETRAN IPVA 03/10', 'pagar').nome, 'Documentos carro');
});

/* ---- renomear a categoria pela janela dos lançamentos ---- */
test('renomear em todos os meses: corrige o nome (inclusive nas versões antigas) e os valores não mudam', () => {
  fresh();
  const a = m.addCat('pagar', 'Debitos carro');
  m.ens(a.id, 2018, 3).items.push({ v: 150, d: 'Licenciamento', ok: true });
  m.ens(a.id, 2019, 5).items.push({ v: 90, d: 'x', ok: false });
  const nova = m.reviseCat(a.id, { nome: 'Carro', dia: '' }, 'manter', 2019, 0);          // cria uma versão nova a partir de 2019
  assert.notEqual(nova.id, a.id);
  const total = m.MT('pagar', 2018, 3, 'prev') + m.MT('pagar', 2019, 5, 'prev');
  const r = m.renomearCategoria(nova.id, 'Documentos carro', 'todos', 2019, 5);
  assert.equal(r.id, nova.id, 'o id não muda quando vale para todos');
  assert.equal(m.catById(a.id).nome, 'Documentos carro', 'a versão antiga também ganha o nome novo');
  assert.equal(m.catById(nova.id).nome, 'Documentos carro');
  assert.equal(m.MT('pagar', 2018, 3, 'prev') + m.MT('pagar', 2019, 5, 'prev'), total);
});

test('renomear daqui em diante: o passado guarda o nome antigo e os lançamentos acompanham a versão nova', () => {
  fresh();
  const a = m.addCat('pagar', 'Debitos carro');
  m.ens(a.id, 2018, 3).items.push({ v: 150, d: 'Licenciamento', ok: true });
  m.ens(a.id, 2019, 5).items.push({ v: 90, d: 'x', ok: true });
  const n = m.renomearCategoria(a.id, 'Carro', 'adiante', 2019, 0);
  assert.notEqual(n.id, a.id); assert.equal(n.nome, 'Carro'); assert.equal(m.catById(a.id).nome, 'Debitos carro');
  assert.equal(m.V(a.id, 2018, 3, 'real'), 150); assert.equal(m.V(n.id, 2019, 5, 'real'), 90);
  assert.equal(m.V(a.id, 2019, 5, 'real'), 0);
});

test('renomear: recusa nome vazio ou já usado por outra categoria do mesmo tipo (mas aceita só mudar maiúsculas)', () => {
  fresh();
  const a = m.addCat('pagar', 'Aluguel'), b = m.addCat('pagar', 'Condomínio'), r = m.addCat('receber', 'Extra');
  assert.throws(() => m.renomearCategoria(a.id, '   ', 'todos', 2026, 9), /nome/i);
  assert.throws(() => m.renomearCategoria(a.id, 'condominio', 'todos', 2026, 9), /Já existe/);
  assert.equal(m.renomearCategoria(a.id, 'Extra', 'todos', 2026, 9).nome, 'Extra', 'o mesmo nome em outro tipo (receita) é permitido');
  assert.equal(m.renomearCategoria(a.id, 'EXTRA', 'todos', 2026, 9).nome, 'EXTRA');
  assert.equal(b.nome, 'Condomínio'); assert.ok(r);
});
