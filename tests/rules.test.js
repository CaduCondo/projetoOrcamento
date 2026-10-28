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
