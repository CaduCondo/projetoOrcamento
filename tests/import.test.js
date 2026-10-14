/* Importação de fatura do cartão e extrato da conta (Itaú). Os textos abaixo são INVENTADOS (nada de dados reais),
   mas seguem a mesma estrutura das linhas que o leitor de PDF entrega. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const plain = o => JSON.parse(JSON.stringify(o));
const fresh = () => { m.S = sampleState(m); m.modo = 'real'; return m.S; };
const Y = 2026, M = 9;                                       // "hoje" nos testes de modelo = out/2026

const FATURA = [
  'Resumo da fatura em R$', 'Total desta fatura 212,00',
  'Pagamentos efetuados', 'DATA VALOR EM R$', '09/09 PAGAMENTO DEB AUTOMATIC -100,00', 'Total dos pagamentos -100,00',
  'Lançamentos: compras e saques', 'FULANO DE TESTE', 'DATA ESTABELECIMENTO VALOR EM R$',
  '21/09 LOJA UM 01/03 100,00', 'casa SAO PAULO', '22/09 LOJA DOIS 50,50', 'outros OSASCO', '23/09 ESTORNO LOJA -20,00', 'outros SAO PAULO',
  'Lançamentos: compras e saques', 'DATA ESTABELECIMENTO VALOR EM R$', '24/09 LOJA TRES 19,50', 'saúde SAO PAULO',
  'Lançamentos no cartão 150,00',
  'Lançamentos internacionais', 'DATA ESTABELECIMENTO US$ R$', '07/09 SERVICO EXTERIOR 60,00', '10,00 USD 10,00', 'Dólar de Conversão R$ 5,00',
  'Total transações inter. em R$ 60,00', 'Repasse de IOF em R$ 2,00', 'Total lançamentos inter. em R$ 62,00',
  'Total dos lançamentos atuais 212,00',
  'Compras parceladas - próximas faturas', 'DATA ESTABELECIMENTO VALOR EM R$', '21/11 LOJA ANTIGA 12/12 13,90', 'Próxima fatura 13,90',
  'Previsão para o próximo fechamento: 02/11/2026.',
];
const EXTRATO = [
  'extrato conta / lançamentos', 'período de visualização: 15/09/2026 até 14/10/2026', 'data lançamentos valor (R$) saldo (R$)',
  '14/10/2026 SALDO DO DIA 1.000,00', '13/10/2026 PIX TRANSF FULANO -50,00', '09/10/2026 FATURA ITAU UNICLASS VS IN -212,00',
  '05/10/2026 REMUNERACAO/SALARIO 5.000,00', '01/10/2026 REND PAGO APLIC AUT MAIS 0,05', '30/09/2026 PIX QRS LOJA -10,00',
  '30/09/2026 SALDO DO DIA 900,00', 'Aviso! Os saldos acima...',
];
const liquido = () => Math.round((m.MT('receber', Y, M, 'real') - m.MT('pagar', Y, M, 'real')) * 100) / 100;

test('reconhece o tipo de arquivo', () => {
  assert.equal(m.detectStatement(FATURA), 'cartao');
  assert.equal(m.detectStatement(EXTRATO), 'conta');
  assert.equal(m.detectStatement(['qualquer coisa', 'outro texto']), null);
});

test('fatura: só compras/saques e internacionais (+IOF); fora pagamentos e parcelas futuras; soma confere com o total', () => {
  const f = m.parseFatura(FATURA);
  assert.deepEqual(Array.from(f.itens, i => [i.dia, i.mes, i.desc, i.valor]), [
    [21, 9, 'LOJA UM 01/03', 100], [22, 9, 'LOJA DOIS', 50.5], [23, 9, 'ESTORNO LOJA', -20], [24, 9, 'LOJA TRES', 19.5],
    [7, 9, 'SERVICO EXTERIOR', 60], [null, null, 'Repasse de IOF (compras internacionais)', 2]]);
  assert.equal(f.total, 212); assert.equal(f.soma, 212); assert.equal(f.confere, true);
  const quebrada = m.parseFatura(FATURA.filter(l => !l.startsWith('24/09')));
  assert.equal(quebrada.confere, false, 'se faltar algo, avisa que não bate');
});

test('extrato: movimentações com sinal, sem "saldo do dia", e só do mês escolhido', () => {
  const e = m.parseExtrato(EXTRATO);
  assert.equal(e.itens.length, 5);
  assert.deepEqual(Array.from(m.extratoMeses(e.itens)), [2026 * 12 + 8, 2026 * 12 + 9]);
  const out = m.extratoDoMes(e.itens, 2026, 9);
  assert.deepEqual(Array.from(out, i => i.valor), [-50, -212, 5000, 0.05]);
  assert.equal(m.pareceFatura('FATURA ITAU UNICLASS VS IN'), true);
  assert.equal(m.pareceFatura('PIX TRANSF FULANO'), false);
});

test('importar a fatura: cria "CC Itaú" no mês (ou reaproveita a que já existe), itens como previstos, sem importar duas vezes', () => {
  fresh();
  const itens = m.parseFatura(FATURA).itens;
  const r = m.importStatement('cartao', itens, Y, M);
  assert.equal(r.novos, 6); assert.equal(r.criada, true);
  assert.equal(r.cat.nome, 'CC Itaú');
  const cell = m.cellOf(r.cat.id, Y, M);
  assert.equal(cell.items.length, 6); assert.ok(cell.items.every(i => i.ok === false && i.imp));
  assert.equal(m.V(r.cat.id, Y, M, 'prev'), 212, 'o total do cartão é o total da fatura');
  assert.equal(cell.items[0].d, '21/09 LOJA UM 01/03');
  const de_novo = m.importStatement('cartao', itens, Y, M);
  assert.equal(de_novo.novos, 0); assert.equal(de_novo.repetidos, 6, 'mesmo arquivo de novo não duplica');
  assert.equal(m.V(r.cat.id, Y, M, 'prev'), 212);
  fresh();
  const mine = m.addCat('pagar', 'CC Itau', 5);                     // a categoria da pessoa (sem acento) é reaproveitada
  assert.equal(m.importStatement('cartao', itens, Y, M).cat.id, mine.id);
});

test('itens iguais no mesmo dia não se perdem (contador na chave)', () => {
  fresh();
  const dois = [{ dia: 1, mes: 10, desc: 'CONTA VIVO', valor: 30 }, { dia: 1, mes: 10, desc: 'CONTA VIVO', valor: 30 }];
  const r = m.importStatement('cartao', dois, Y, M);
  assert.equal(r.novos, 2);
  assert.equal(m.importStatement('cartao', dois, Y, M).novos, 0);
});

test('cartão → virar CATEGORIA: aparece no mês com 💳, não soma, o item continua no cartão e não dá para levar duas vezes', () => {
  fresh();
  const itens = m.parseFatura(FATURA).itens, cc = m.importStatement('cartao', itens, Y, M).cat;
  const total = () => m.MT('pagar', Y, M, 'prev');
  const antes = total();
  const c = m.cardItemToCategory(cc.id, Y, M, 4, 'Serviço exterior');
  assert.equal(c.tipo, 'pagar'); assert.ok(m.visCats('pagar', Y, M).some(x => x.id === c.id), 'a categoria aparece nas despesas do mês');
  const copia = m.cellOf(c.id, Y, M).items[0];
  assert.deepEqual(plain({ v: copia.v, info: copia.info, lock: copia.lock }), { v: 60, info: true, lock: true });
  assert.equal(total(), antes, 'não soma de novo');
  assert.equal(m.V(c.id, Y, M, 'prev'), 0);
  assert.equal(m.cellOf(cc.id, Y, M).items.length, 6, 'o item continua no cartão');
  assert.equal(m.cardLinks(m.cellOf(cc.id, Y, M).items[4]).length, 1);
  assert.throws(() => m.cardItemToCategory(cc.id, Y, M, 4, 'Outra'), /já foi levado/);
  assert.throws(() => m.cardItemToExisting(cc.id, Y, M, 4, 'luz'), /já foi levado/);
  m.unlinkCardItem(m.cellOf(cc.id, Y, M).items[4]);
  assert.equal(m.cardLinks(m.cellOf(cc.id, Y, M).items[4]).length, 0, 'desfazer apaga a cópia');
  assert.equal(total(), antes);
});

test('cartão → virar LANÇAMENTO de uma categoria que já existe: chega com 💳, não soma, e o cartão não é aceito como destino', () => {
  fresh();
  const cc = m.importStatement('cartao', m.parseFatura(FATURA).itens, Y, M).cat, antes = m.MT('pagar', Y, M, 'prev');
  m.cardItemToExisting(cc.id, Y, M, 0, 'luz');
  const l = m.cellOf('luz', Y, M).items.at(-1);
  assert.deepEqual(plain({ v: l.v, d: l.d, info: l.info, lock: l.lock, ok: l.ok }), { v: 100, d: '21/09 LOJA UM 01/03', info: true, lock: true, ok: true });
  assert.equal(m.MT('pagar', Y, M, 'prev'), antes);
  assert.throws(() => m.cardItemToExisting(cc.id, Y, M, 1, cc.id), /outra categoria/);
  assert.throws(() => m.cardItemToExisting(cc.id, Y, M, 1, 'nao-existe'), /Escolha/);
});

test('extrato → "Movimentação CC Itaú": só o mês escolhido, realizado; entrada reduz a despesa; fatura vem à parte', () => {
  fresh();
  const out = m.extratoDoMes(m.parseExtrato(EXTRATO).itens, Y, M), antes = liquido();
  const r = m.importStatement('conta', out, Y, M);
  assert.equal(r.cat.nome, 'Movimentação CC Itaú');
  const its = m.cellOf(r.cat.id, Y, M).items;
  assert.deepEqual(Array.from(its, i => [i.v, i.ok]), [[50, true], [212, true], [-5000, true], [-0.05, true]]);
  assert.equal(Math.round((liquido() - antes) * 100) / 100, Math.round((-50 - 212 + 5000 + 0.05) * 100) / 100, 'o saldo do mês reflete a movimentação');
});

test('extrato: levar um item para fora da Movimentação TIRA de lá e SOMA no destino (saldo do mês não muda)', () => {
  fresh();
  const out = m.extratoDoMes(m.parseExtrato(EXTRATO).itens, Y, M), mov = m.importStatement('conta', out, Y, M).cat, base = liquido();
  // saída (−50) → lançamento de uma despesa existente
  m.contaItemMove(mov.id, Y, M, 0, 'luz');
  assert.equal(m.cellOf(mov.id, Y, M).items.length, 3, 'saiu da Movimentação');
  assert.equal(m.cellOf('luz', Y, M).items.at(-1).v, 50); assert.equal(m.cellOf('luz', Y, M).items.at(-1).ok, true);
  assert.equal(liquido(), base, 'só mudou de lugar');
  // entrada (+5000, guardada como −5000) → lançamento de uma RECEITA existente: sinal ajustado ao tipo
  const idx = m.cellOf(mov.id, Y, M).items.findIndex(i => i.v === -5000);
  m.contaItemMove(mov.id, Y, M, idx, 'sal');
  assert.equal(m.cellOf('sal', Y, M).items.at(-1).v, 5000);
  assert.equal(liquido(), base);
  // virar categoria nova: entrada → receita; saída → despesa
  const i2 = m.cellOf(mov.id, Y, M).items.findIndex(i => i.v === -0.05);
  const rend = m.contaItemMove(mov.id, Y, M, i2, { nome: 'Rendimentos' });
  assert.equal(rend.tipo, 'receber'); assert.equal(m.V(rend.id, Y, M, 'real'), 0.05);
  const i3 = m.cellOf(mov.id, Y, M).items.findIndex(i => i.v === 212);
  const faturaCat = m.contaItemMove(mov.id, Y, M, i3, { nome: 'Pagto fatura' });
  assert.equal(faturaCat.tipo, 'pagar'); assert.equal(m.V(faturaCat.id, Y, M, 'real'), 212);
  assert.equal(liquido(), base);
  assert.equal(m.cellOf(mov.id, Y, M).items.length, 0);
  // importar o mesmo extrato de novo não traz de volta o que já foi levado
  assert.equal(m.importStatement('conta', out, Y, M).novos, 0);
  assert.throws(() => m.contaItemMove(mov.id, Y, M, 0, 'luz'), /importação/);
});
