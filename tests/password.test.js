const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel } = require('./helpers/model');
const m = loadModel();
const verdes = (p, c) => Array.from(m.passwordChecks(p, c)).filter(r => r.ok).map(r => r.id);

test('as 6 regras, na ordem e com o texto pedido', () => {
  assert.deepEqual(Array.from(m.PASSWORD_RULES, r => r.texto), [
    'No mínimo 6 caracteres', 'Deve ter no mínimo uma letra maiúscula', 'Deve ter no mínimo 1 letra minúscula',
    'Deve ter no mínimo 2 números', 'Deve ter no mínimo 1 caractere especial', 'As senhas devem ser idênticas']);
});
test('cada regra acende só quando atendida', () => {
  assert.deepEqual(verdes('', ''), []);
  assert.deepEqual(verdes('B', ''), ['upper']);
  assert.deepEqual(verdes('b', ''), ['lower']);
  assert.deepEqual(verdes('12', ''), ['digits']);
  assert.deepEqual(verdes('1', ''), []);
  assert.deepEqual(verdes('!', ''), ['special']);
  assert.deepEqual(verdes('abcdef', ''), ['len', 'lower']);
  assert.deepEqual(verdes('a', 'a'), ['lower', 'same']);
  assert.deepEqual(verdes('', ''), [], 'duas senhas vazias não contam como idênticas');
  assert.ok(verdes('Áá', '').includes('upper') && verdes('Áá', '').includes('lower'), 'acentos contam como letras');
});
test('senha completa vale; faltando qualquer coisa não vale', () => {
  assert.equal(m.passwordOk('Segredo#12', 'Segredo#12'), true);
  assert.equal(m.passwordOk('Segredo#12', 'Segredo#13'), false);
  for (const fraca of ['Se#12', 'segredo#12', 'SEGREDO#12', 'Segredo#1', 'Segredo112', 'Seg1#']) {
    assert.equal(m.passwordOk(fraca, fraca), false, fraca);
  }
  assert.equal(m.passwordProblem('Segredo#12', 'Segredo#12'), null);
  assert.match(m.passwordProblem('segredo#12', 'segredo#12'), /maiúscula/);
  assert.match(m.passwordProblem('Segredo#12', 'x'), /não conferem/);
});
