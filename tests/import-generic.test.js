/* Importação de outros bancos: OFX, CSV de banco e PDF genérico. Arquivos INVENTADOS, nos formatos comuns do mercado. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const plain = o => JSON.parse(JSON.stringify(o));
const Y = 2026, M = 9;

test('valores e datas nos formatos que os bancos usam', () => {
  const v = s => m.parseValor(s);
  assert.equal(v('R$ -1.234,56'), -1234.56); assert.equal(v('1.234,56'), 1234.56); assert.equal(v('-1234.56'), -1234.56);
  assert.equal(v('1,234.56'), 1234.56); assert.equal(v('(123,45)'), -123.45); assert.equal(v('123,45 D'), -123.45);
  assert.equal(v('123,45-'), -123.45); assert.equal(v('99'), 99); assert.equal(v(''), null); assert.equal(v('abc'), null);
  const d = s => plain(m.parseData(s, 2026));
  assert.deepEqual(d('05/10/2026'), { dia: 5, mes: 10, ano: 2026 }); assert.deepEqual(d('2026-10-05'), { dia: 5, mes: 10, ano: 2026 });
  assert.deepEqual(d('20261005120000[-3:BRT]'), { dia: 5, mes: 10, ano: 2026 }); assert.deepEqual(d('5/10/26'), { dia: 5, mes: 10, ano: 2026 });
  assert.deepEqual(d('05/10'), { dia: 5, mes: 10, ano: 2026 }, 'sem ano: usa o ano escolhido');
});

test('reconhece o banco pelo texto (só o nome, para mensagens e registro)', () => {
  assert.equal(m.detectBank('Extrato Banco Bradesco S.A.'), 'Bradesco');
  assert.equal(m.detectBank('Nu Pagamentos S.A. fatura'), 'Nubank');
  assert.equal(m.detectBank('qualquer coisa'), null);
});

const OFX_CONTA = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>Banco Bradesco<FID>237</FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><DTSTART>20260901
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003120000[-3:BRT]<TRNAMT>-150.00<FITID>1<MEMO>PIX ENVIADO FULANO
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>5000.00<FITID>2<MEMO>SALARIO EMPRESA
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260928<TRNAMT>-20,50<FITID>3<NAME>TARIFA
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const OFX_CARTAO = `<?xml version="1.0"?><OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260921</DTPOSTED><TRNAMT>-89.90</TRNAMT><MEMO>LOJA ONLINE</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20260922</DTPOSTED><TRNAMT>15.00</TRNAMT><MEMO>ESTORNO LOJA</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20260910</DTPOSTED><TRNAMT>500.00</TRNAMT><MEMO>PAGAMENTO RECEBIDO</MEMO></STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

test('OFX da conta (formato antigo, SGML): movimentações com sinal e banco reconhecido', () => {
  const r = m.parseOFX(OFX_CONTA);
  assert.equal(r.kind, 'conta'); assert.equal(r.banco, 'Bradesco');
  assert.deepEqual(Array.from(r.itens, i => [i.dia, i.mes, i.ano, i.desc, i.valor]), [
    [3, 10, 2026, 'PIX ENVIADO FULANO', -150], [5, 10, 2026, 'SALARIO EMPRESA', 5000], [28, 9, 2026, 'TARIFA', -20.5]]);
  fresh(); const out = m.extratoParaImportar(r.itens, Y, M);
  assert.equal(out.length, 2, 'só outubro');
  const imp = m.importStatement('conta', out, Y, M);
  assert.equal(imp.cats.length, 2, 'Receitas e Despesas');
});

test('OFX do cartão (formato novo, XML): compra positiva, estorno negativo, pagamento da fatura fica de fora', () => {
  const r = m.parseOFX(OFX_CARTAO);
  assert.equal(r.kind, 'cartao');
  assert.deepEqual(Array.from(r.itens, i => [i.desc, i.valor]), [['LOJA ONLINE', 89.9], ['ESTORNO LOJA', -15]]);
});

test('CSV de banco: adivinha as colunas (Nubank-like e Bradesco-like) e lê os lançamentos', () => {
  const nu = m.parseCsv('date,title,amount\n2026-09-21,Padaria Pão Bom,23.50\n2026-09-22,Uber *Trip,18.90\n2026-09-23,Pagamento recebido,-500.00\n');
  const mapa = m.csvGuess(nu);
  assert.deepEqual(plain({ d: mapa.data, s: mapa.desc, v: mapa.valor }), { d: 0, s: 1, v: 2 });
  const itens = m.parseBankCsv(nu, mapa);
  assert.deepEqual(Array.from(itens, i => [i.dia, i.desc, i.valor]), [[21, 'Padaria Pão Bom', 23.5], [22, 'Uber *Trip', 18.9], [23, 'Pagamento recebido', -500]]);
  assert.equal(m.pagamentoDeFatura('Pagamento recebido'), true);
  const br = m.parseCsv('Extrato de conta corrente\nData;Histórico;Docto.;Crédito (R$);Débito (R$);Valor (R$)\n01/10/2026;SALDO ANTERIOR;;;;1.000,00\n02/10/2026;PIX RECEBIDO;123;200,00;;200,00\n03/10/2026;CONTA DE LUZ;;;98,70;-98,70\n');
  const mb = m.csvGuess(br);
  assert.equal(mb.header, 1, 'pula a linha de título antes do cabeçalho');
  assert.deepEqual(Array.from(m.parseBankCsv(br, mb), i => [i.desc, i.valor]), [['PIX RECEBIDO', 200], ['CONTA DE LUZ', -98.7]], 'saldo fica de fora');
  assert.deepEqual(Array.from(m.parseBankCsv(br, mb, { inverter: true }), i => i.valor), [-200, 98.7]);
  const semCab = m.parseCsv('05/10/2026;MERCADO X;-45,00\n06/10/2026;PIX;100,00\n');
  const ms = m.csvGuess(semCab);
  assert.ok(ms && ms.data === 0 && ms.valor === 2);
  assert.equal(m.csvGuess(m.parseCsv('nome;idade\nana;30\n')), null, 'sem data e valor: não é extrato');
});

test('PDF de outro banco (leitura genérica): data + descrição + valor, com D/C e sem as linhas de saldo/total', () => {
  const linhas = ['BANCO QUALQUER S.A. - EXTRATO', 'Período 01/10/2026 a 31/10/2026', '01/10 SALDO ANTERIOR 1.000,00',
    '02/10 PIX RECEBIDO JOAO 300,00 C', '03/10 COMPRA CARTAO DEBITO MERCADO 45,90 D', '04/10/2026 TARIFA PACOTE -19,90 1.235,20',
    'Total de débitos 65,80', 'texto qualquer sem valor'];
  const itens = m.parseGenerico(linhas);
  assert.deepEqual(Array.from(itens, i => [i.dia, i.mes, i.ano, i.desc, i.valor]), [
    [2, 10, 2026, 'PIX RECEBIDO JOAO', 300], [3, 10, 2026, 'COMPRA CARTAO DEBITO MERCADO', -45.9], [4, 10, 2026, 'TARIFA PACOTE', -19.9]]);
});

function fresh() { m.S = sampleState(m); m.modo = 'real'; return m.S; }

test('CSV com colunas separadas de Crédito e Débito (sem coluna "Valor")', () => {
  const rows = m.parseCsv('Data;Lançamento;Crédito;Débito\n02/10/2026;PIX RECEBIDO;200,00;\n03/10/2026;LUZ;;98,70\n');
  const mp = m.csvGuess(rows);
  assert.ok(mp.cred != null && mp.deb != null);
  assert.deepEqual(Array.from(m.parseBankCsv(rows, mp), i => [i.desc, i.valor]), [['PIX RECEBIDO', 200], ['LUZ', -98.7]]);
});

test('datas por extenso e faturas de cartão em PDF de outros bancos ("21 SET", "21 de setembro", com R$)', () => {
  const d = s => JSON.parse(JSON.stringify(m.parseData(s, 2026)));
  assert.deepEqual(d('21 SET'), { dia: 21, mes: 9, ano: 2026 });
  assert.deepEqual(d('21/set'), { dia: 21, mes: 9, ano: 2026 });
  assert.deepEqual(d('3 de outubro de 2026'), { dia: 3, mes: 10, ano: 2026 });
  assert.equal(m.parseData('21 XYZ', 2026), null);
  const linhas = ['Fatura do cartão - Banco Exemplo', 'Vencimento 10 OUT 2026', '21 SET Padaria Pão Bom R$ 23,50', '22 SET Uber *Trip 18,90',
    '23 SET Estorno Loja -15,00', 'Total da fatura R$ 27,40', '25 SET Pagamento recebido R$ 500,00'];
  const itens = m.parseGenerico(linhas, 2026);
  assert.deepEqual(Array.from(itens, i => [i.dia, i.mes, i.desc, i.valor]), [[21, 9, 'Padaria Pão Bom', 23.5], [22, 9, 'Uber *Trip', 18.9], [23, 9, 'Estorno Loja', -15], [25, 9, 'Pagamento recebido', 500]]);
  assert.equal(m.pagamentoDeFatura('Pagamento recebido'), true, 'o pagamento vem desmarcado na tela');
});
