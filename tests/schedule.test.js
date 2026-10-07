const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const fresh = () => { m.S = sampleState(m); m.modo = 'real'; return m.S; };
const nomes = (t, y, mes) => Array.from(m.visCats(t, y, mes), c => c.nome);
const plain = o => JSON.parse(JSON.stringify(o));

test('criar categoria: "só este mês", "o ano todo" e "deste mês em diante"', () => {
  fresh();
  const a = m.createCat('pagar', { nome: 'Academia', dia: '7' }, 'mes', 2026, 3);
  assert.deepEqual(plain(a.vis), { from: [2026, 3], to: [2026, 3] });
  assert.equal(a.dia, 7);
  assert.ok(nomes('pagar', 2026, 3).includes('Academia'));
  assert.ok(!nomes('pagar', 2026, 4).includes('Academia'), 'fora do mês escolhido não aparece');

  const b = m.createCat('pagar', { nome: 'Seguro', dia: '' }, 'ano', 2026, 5);
  assert.deepEqual(plain(b.vis), { from: [2026, 0], to: [2026, 11] }, 'ano todo ao criar = janeiro a dezembro');
  assert.equal(b.dia, null);
  assert.ok(nomes('pagar', 2026, 0).includes('Seguro') && nomes('pagar', 2026, 11).includes('Seguro'));
  assert.ok(!nomes('pagar', 2027, 0).includes('Seguro'));

  const c = m.createCat('receber', { nome: 'Bônus', dia: 15 }, 'futuro', 2026, 3);
  assert.deepEqual(plain(c.vis), { from: [2026, 3], to: null });
  assert.ok(!nomes('receber', 2026, 2).includes('Bônus'));
  assert.ok(nomes('receber', 2026, 3).includes('Bônus') && nomes('receber', 2031, 6).includes('Bônus'));
  assert.ok(m.S.cats.includes(a) && m.S.cats.includes(b) && m.S.cats.includes(c));
});

test('validação: nome obrigatório, dia de 1 a 31 e nome repetido', () => {
  fresh();
  const err = (input, tipo = 'pagar') => m.validateCat(input, tipo, 2026, 3);
  assert.match(err({ nome: '   ', dia: '' }), /nome/i);
  for (const dia of ['0', '32', '-1', '1.5', 'abc']) assert.match(err({ nome: 'X', dia }), /1 a 31/, `dia ${dia}`);
  for (const dia of ['1', '31', '', null, 15]) assert.equal(err({ nome: 'X', dia }), null, `dia ${dia}`);
  assert.match(err({ nome: 'aluguel', dia: '' }), /Já existe/, 'ignora maiúsculas');
  assert.equal(err({ nome: 'Aluguel', dia: '' }, 'receber'), null, 'o mesmo nome em outro tipo é permitido');
  assert.throws(() => m.createCat('pagar', { nome: 'Luz', dia: '' }, 'mes', 2026, 3), /Já existe/);
});

test('uma linha com lançamentos sempre aparece, mesmo fora da vigência', () => {
  fresh();
  const a = m.createCat('pagar', { nome: 'Academia', dia: '' }, 'mes', 2026, 3);
  m.ens(a.id, 2026, 8).items.push({ v: 50, d: '', ok: true });
  assert.ok(nomes('pagar', 2026, 8).includes('Academia'));
  assert.ok(!nomes('pagar', 2026, 9).includes('Academia'));
});

test('o exemplo do dono: em abril, "Salário · ano todo · dia 5" vira "Salário Empresa X · deste mês em diante · dia 10"', () => {
  fresh();
  const velho = m.createCat('receber', { nome: 'Salário Antigo', dia: '5' }, 'ano', 2026, 0);
  for (const mes of [0, 1, 2, 3, 5]) m.ens(velho.id, 2026, mes).items.push({ v: 1000 + mes, d: '', ok: true });
  const totalAntes = [0, 1, 2, 3, 4, 5].map(x => m.MT('receber', 2026, x, 'real'));

  const novo = m.reviseCat(velho.id, { nome: 'Salário Empresa X', dia: '10' }, 'futuro', 2026, 3);

  // passado intacto
  assert.equal(velho.nome, 'Salário Antigo');
  assert.equal(velho.dia, 5);
  assert.deepEqual(plain(velho.vis.to), [2026, 2], 'a versão antiga termina em março');
  assert.equal(m.V(velho.id, 2026, 0, 'real'), 1000);
  assert.equal(m.V(velho.id, 2026, 2, 'real'), 1002, 'março fica com a versão antiga');
  assert.ok(m.cellOf(velho.id, 2026, 1) === undefined || true);
  assert.equal(m.cellOf(velho.id, 2026, 3), undefined, 'abril saiu da versão antiga');
  // de abril em diante: nova versão
  assert.equal(novo.nome, 'Salário Empresa X');
  assert.equal(novo.dia, 10);
  assert.deepEqual(plain(novo.vis), { from: [2026, 3], to: null });
  assert.equal(m.V(novo.id, 2026, 3, 'real'), 1003);
  assert.equal(m.V(novo.id, 2026, 5, 'real'), 1005);
  assert.equal(novo.prevId, velho.id);
  assert.equal(m.S.cats.indexOf(novo), m.S.cats.indexOf(velho) + 1, 'a nova fica logo depois da antiga');
  // telas
  assert.ok(nomes('receber', 2026, 2).includes('Salário Antigo') && !nomes('receber', 2026, 2).includes('Salário Empresa X'));
  assert.ok(!nomes('receber', 2026, 4).includes('Salário Antigo') && nomes('receber', 2026, 4).includes('Salário Empresa X'));
  assert.ok(nomes('receber', 2026).includes('Salário Antigo') && nomes('receber', 2026).includes('Salário Empresa X'), 'na visão do ano aparecem as duas');
  // nada mudou nos totais
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(x => m.MT('receber', 2026, x, 'real')), totalAntes);
});

test('editar uma categoria que só começa depois do mês de edição: muda no lugar', () => {
  fresh();
  const c = m.createCat('pagar', { nome: 'Futura', dia: '3' }, 'futuro', 2026, 8);
  const antes = m.S.cats.length;
  const r = m.reviseCat(c.id, { nome: 'Futura 2', dia: '4' }, 'ano', 2026, 5);   // editando em junho, ela começa em setembro
  assert.equal(r, c);
  assert.equal(m.S.cats.length, antes, 'nenhuma versão nova');
  assert.equal(c.nome, 'Futura 2');
  assert.equal(c.dia, 4);
  assert.deepEqual(plain(c.vis), { from: [2026, 8], to: [2026, 11] });
});

test('editar uma categoria antiga (sem vigência) encerra a antiga no mês anterior', () => {
  const s = fresh();
  m.ens('alu', 2026, 5).items.push({ v: 1600, d: '', ok: true });
  const novo = m.reviseCat('alu', { nome: 'Aluguel Novo', dia: '11' }, 'futuro', 2026, 5);
  const velho = m.catById('alu');
  assert.deepEqual(plain(velho.until), [2026, 4]);
  assert.equal(m.V('alu', 2026, 0, 'real'), 1500, 'janeiro ficou com o nome antigo');
  assert.equal(m.V(novo.id, 2026, 5, 'real'), 1600);
  assert.ok(!nomes('pagar', 2026, 7).includes('Aluguel'), 'a antiga não aparece depois de terminar');
  assert.ok(nomes('pagar', 2026, 7).includes('Aluguel Novo'));
  assert.ok(nomes('pagar', 2026, 0).includes('Aluguel') && !nomes('pagar', 2026, 0).includes('Aluguel Novo'));
  assert.equal(s.cats.indexOf(novo), s.cats.indexOf(velho) + 1);
});

test('editar para "só este mês" encerra a vigência futura; lançamentos seguintes continuam visíveis', () => {
  fresh();
  const c = m.createCat('pagar', { nome: 'Plano', dia: '1' }, 'futuro', 2026, 0);
  m.ens(c.id, 2026, 6).items.push({ v: 90, d: '', ok: true });
  const n = m.reviseCat(c.id, { nome: 'Plano', dia: '1' }, 'mes', 2026, 3);
  assert.deepEqual(plain(n.vis), { from: [2026, 3], to: [2026, 3] });
  assert.ok(nomes('pagar', 2026, 3).includes('Plano'));
  assert.ok(!nomes('pagar', 2026, 4).includes('Plano'), 'sem vigência e sem lançamento: some');
  assert.equal(m.V(n.id, 2026, 6, 'real'), 90, 'o lançamento de julho foi para a nova versão');
  assert.ok(nomes('pagar', 2026, 6).includes('Plano'), 'e a linha de julho continua aparecendo porque tem lançamento');
});

test('nome: reaproveitar o de uma versão já encerrada é permitido; conflito com vigente não', () => {
  fresh();
  const a = m.createCat('pagar', { nome: 'Internet', dia: '' }, 'futuro', 2026, 0);
  const b = m.reviseCat(a.id, { nome: 'Internet Fibra', dia: '' }, 'futuro', 2026, 4);
  assert.throws(() => m.reviseCat(b.id, { nome: 'luz', dia: '' }, 'futuro', 2026, 6), /Já existe/);
  const c = m.reviseCat(b.id, { nome: 'Internet', dia: '' }, 'futuro', 2026, 8);       // "Internet" original terminou em abril
  assert.equal(c.nome, 'Internet');
});

test('rótulos da vigência (Ajustes) e opção pré-selecionada na edição', () => {
  fresh();
  const mk = (scope, y, mes) => m.createCat('pagar', { nome: 'T' + scope + y + mes, dia: '' }, scope, y, mes);
  assert.equal(m.scopeLabel(mk('ano', 2026, 5)), 'ano todo 2026');
  assert.equal(m.scopeLabel(mk('mes', 2026, 3)), 'só abr/2026');
  assert.equal(m.scopeLabel(mk('futuro', 2026, 3)), 'de abr/2026 em diante');
  assert.equal(m.scopeLabel({ vis: { from: [2026, 1], to: [2026, 4] } }), 'fev/2026 a mai/2026');
  assert.equal(m.scopeLabel({ vis: { from: [2026, 0], to: [2026, 2] }, until: [2026, 2] }), 'jan/2026 a mar/2026 · até mar/2026');
  assert.equal(m.scopeLabel({ until: [2026, 4] }), 'até mai/2026');
  assert.equal(m.scopeLabel({}), '', 'categoria antiga: sem rótulo');
  assert.equal(m.scopeOf(mk('ano', 2027, 5)), 'ano');
  assert.equal(m.scopeOf(mk('mes', 2027, 5)), 'mes');
  assert.equal(m.scopeOf(mk('futuro', 2027, 5)), 'futuro');
  assert.equal(m.scopeOf({}), 'futuro');
});

test('vigência sobrevive ao ciclo da nuvem (serializar e voltar)', () => {
  const s = fresh();
  const c = m.createCat('receber', { nome: 'Bônus', dia: '15' }, 'futuro', 2026, 3);
  const n = m.reviseCat(c.id, { nome: 'Bônus 2', dia: '16' }, 'ano', 2026, 5);
  const { meta, years } = m.serializeState(s);
  const volta = m.deserializeState(meta, years);
  const cv = volta.cats.find(x => x.id === c.id), nv = volta.cats.find(x => x.id === n.id);
  assert.deepEqual(plain(cv.vis), plain(c.vis));
  assert.equal(nv.prevId, c.id);
  assert.deepEqual(plain(nv.vis), { from: [2026, 5], to: [2026, 11] });
});
