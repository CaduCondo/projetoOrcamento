const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const plain = o => JSON.parse(JSON.stringify(o));
const rico = () => {
  const s = sampleState(m); m.S = s;
  s.saldoIni = { 2026: 90000, 2025: -700.5 };
  s.saldos = [{ nome: 'Itaú', valor: 1234.56 }]; s.dividas = [{ nome: 'Banco; "casa"', valor: -300000 }]; s.bens = [{ nome: 'Apê', valor: 550000 }];
  const c = m.createCat('receber', { nome: 'Bônus', dia: '15' }, 'futuro', 2026, 3);
  m.ens(c.id, 2026, 4).items.push({ v: 800, d: 'PLR', ok: false });
  m.reviseCat(c.id, { nome: 'Bônus 2', dia: '16' }, 'ano', 2026, 6);
  s.anos = [2025, 2026, 2030];
  return s;
};

test('CSV: gerar e ler de volta devolve exatamente os mesmos dados', () => {
  const s = rico();
  const { state, atualizadoEm } = m.csvToState(m.csvFileText(s, '2026-10-08T12:00:00.000Z'));
  assert.equal(atualizadoEm, '2026-10-08T12:00:00.000Z');
  assert.deepEqual(plain(state), plain(m.mig(plain(s))));
  assert.deepEqual(Array.from(state.anos), [2025, 2026, 2030], 'ano sem lançamentos também volta');
  assert.equal(state.cats.find(c => c.nome === 'Bônus 2').prevId, state.cats.find(c => c.nome === 'Bônus').id);
});

test('CSV: textos difíceis (; aspas, quebra de linha, acentos, emoji, fórmula do Excel)', () => {
  const s = sampleState(m); m.S = s;
  const descs = ['a;b', 'com "aspas"', 'duas\nlinhas', '=SOMA(A1)', '-5 de troco', '+55 11', '@fulano', '  espaço nas pontas  ', 'cartão 💳 ação', "'=já tem apóstrofo"];
  descs.forEach((d, i) => m.ens('luz', 2026, 1).items.push({ v: i + 0.25, d, ok: true }));
  m.S.cats.find(c => c.id === 'cel').nome = '=Celular;"teste"';
  const { state } = m.csvToState(m.csvFileText(s));
  assert.deepEqual(Array.from(state.data['luz|2026|1'].items, i => i.d), descs);
  assert.equal(state.cats.find(c => c.id === 'cel').nome, '=Celular;"teste"');
});

test('CSV: o texto de fórmula não chega ao Excel como fórmula', () => {
  const s = sampleState(m); m.S = s;
  m.ens('luz', 2026, 1).items.push({ v: 1, d: '=1+1', ok: true });
  const txt = m.stateToCsv(s);
  assert.ok(txt.includes(";'=1+1;"), 'apóstrofo na frente');
  assert.ok(!/;=1\+1;/.test(txt));
});

test('CSV: formato do arquivo (BOM, CRLF, ponto e vírgula, vírgula decimal) e resumo no desenho da tela Ano', () => {
  const s = rico();
  const txt = m.csvFileText(s, '2026-10-08T12:00:00.000Z');
  assert.equal(txt.charCodeAt(0), 0xfeff, 'BOM para o Excel reconhecer UTF-8');
  assert.ok(txt.includes('\r\n') && !/[^\r]\n/.test(txt), 'linhas CRLF');
  const linhas = txt.replace(/^﻿/, '').split('\r\n');
  assert.equal(linhas[0], 'Meu Orçamento;versão;1;atualizado em;2026-10-08T12:00:00.000Z');
  const i = linhas.findIndex(l => l.startsWith('RESUMO;2026'));
  assert.ok(i > 0);
  assert.equal(linhas[i + 1], 'Categoria;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez;Total');
  assert.equal(linhas[i + 2], 'A RECEBER');
  assert.ok(linhas.includes('Salário;5000,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;5000,00'), 'receber positivo, só o realizado');
  assert.ok(linhas.some(l => l.startsWith('Aluguel;-1500,00;')), 'a pagar em negativo, como na tela Ano');
  assert.ok(linhas.some(l => l.startsWith('Total a pagar;-')));
  assert.ok(linhas.some(l => l.startsWith('Saldo do mês;')) && linhas.some(l => l.startsWith('Acumulado;')));
  assert.ok(linhas.includes('CATEGORIAS') && linhas.includes('DETALHE') && linhas.includes('SALDOS INICIAIS') && linhas.includes('PATRIMONIO'));
  assert.ok(linhas.includes('2026;1;luz;pagar;Luz;no cartão;80,00;cartao'), 'item de cartão marcado como cartao');
  assert.ok(linhas.includes('2026;1;sal;receber;Salário;extra;1000,00;previsto'), 'previsto');
  assert.ok(!txt.includes('1500.00'), 'nunca ponto decimal');
});

test('CSV: o resumo é só para ler; o que vale ao carregar é o detalhe', () => {
  const s = sampleState(m); m.S = s;
  const original = plain(m.csvToState(m.csvFileText(s)).state);
  const adulterado = m.csvFileText(s).replace(/^Salário;5000,00/m, 'Salário;999999,00');
  assert.notEqual(adulterado, m.csvFileText(s));
  assert.deepEqual(plain(m.csvToState(adulterado).state), original);
});

test('CSV: aceita o arquivo depois de passar pelo Excel (LF, milhar com ponto, linhas em branco extras, sem BOM)', () => {
  const s = sampleState(m); m.S = s; m.ens('alu', 2026, 2).items.push({ v: 1234.56, d: 'reajuste', ok: true });
  let txt = m.stateToCsv(s).replace(/\r\n/g, '\n').replace('1234,56', '1.234,56').replace('DETALHE\n', '\nDETALHE\n');
  txt += '\n\n\n';
  const { state } = m.csvToState(txt);
  assert.equal(state.data['alu|2026|2'].items[0].v, 1234.56);
  assert.deepEqual(plain(state.cats), plain(m.mig(plain(s)).cats));
});

test('CSV: arquivo separado por vírgula (outro idioma do Excel) também é lido', () => {
  const s = sampleState(m); m.S = s;
  const txt = m.stateToCsv(s).split('\r\n').map(l => l.includes('"') ? l : l.replace(/;/g, ',').replace(/(\d),(\d\d)(?=,|$)/g, '$1.$2')).join('\r\n');
  const { state } = m.csvToState(txt);
  assert.equal(state.data['alu|2026|0'].items[0].v, 1500);
  assert.equal(state.cats.length, 4);
});

test('CSV: erros claros para arquivo errado ou vazio', () => {
  assert.throws(() => m.csvToState('a;b;c\n1;2;3'), /não parece ser do Meu Orçamento/);
  assert.throws(() => m.csvToState(''), /não parece ser do Meu Orçamento/);
  assert.throws(() => m.csvToState('Meu Orçamento;versão;1;atualizado em;x\r\n'), /Não encontrei categorias/);
});

test('CSV: lançamento de categoria que não existe no arquivo é descartado (não fica invisível)', () => {
  const s = sampleState(m); m.S = s;
  const txt = m.stateToCsv(s).replace('DETALHE\r\nAno;Mes;Id;Tipo;Categoria;Descricao;Valor;Situacao\r\n', 'DETALHE\r\nAno;Mes;Id;Tipo;Categoria;Descricao;Valor;Situacao\r\n2026;1;fantasma;pagar;X;y;10,00;realizado\r\n');
  const { state } = m.csvToState(txt);
  assert.equal(Object.keys(state.data).some(k => k.startsWith('fantasma')), false);
});

test('CSV: não altera o estado que está em uso e dá o mesmo total depois de recarregar', () => {
  const s = rico();
  const antes = JSON.stringify(s), totalAntes = m.MT('pagar', 2026, 0, 'real');
  const { state } = m.csvToState(m.stateToCsv(s));
  assert.equal(JSON.stringify(m.S), antes);
  m.S = state;
  assert.equal(m.MT('pagar', 2026, 0, 'real'), totalAntes);
});
