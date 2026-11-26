/* Regras do relato automático do CI (tools/ci/relatar.js): sem rede, com resultado.json inventado. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { lerCenarios, planejar, resumo, corpoBug, tituloBug } = require('../tools/ci/relatar');

const resultado = { suites: [{ title: '10-celular.feature.spec.js', suites: [{ title: 'Uso no celular', specs: [
  { title: 'A tela mês cabe', ok: true, tests: [{ status: 'expected', results: [{ status: 'passed' }] }] },
  { title: 'A tela ano cabe', ok: false, tests: [{ status: 'unexpected', results: [{ status: 'failed', error: { message: '\u001b[31mExpected: 1\u001b[39m\nReceived: 9' } }] }] },
] }] }] };

test('lê cenários e separa os que reprovaram, sem códigos de cor no erro', () => {
  const c = lerCenarios(resultado);
  assert.equal(c.length, 2);
  assert.deepEqual(c.map(x => x.ok), [true, false]);
  assert.equal(c[1].funcionalidade, 'Uso no celular');
  assert.equal(c[1].erro, 'Expected: 1\nReceived: 9');
});

const falha = { chave: 'A tela ano cabe', funcionalidade: 'Uso no celular', nome: 'A tela ano cabe', erro: 'x' };

test('cenário reprovado sem issue aberta: cria; com issue aberta: não duplica', () => {
  assert.equal(planejar({ branch: 'dev', falhas: [falha], abertas: [], podeFechar: () => true }).criar.length, 1);
  const abertas = [{ number: 7, title: tituloBug('dev', 'A tela ano cabe') }];
  const p = planejar({ branch: 'dev', falhas: [falha], abertas, podeFechar: () => true });
  assert.deepEqual([p.criar.length, p.fechar.length], [0, 0]);
});

test('issue aberta de cenário que voltou a passar fecha; de outra branch nunca é mexida', () => {
  const abertas = [{ number: 7, title: tituloBug('dev', 'A tela ano cabe') }, { number: 8, title: tituloBug('main', 'Outro') }];
  assert.deepEqual(planejar({ branch: 'dev', falhas: [], abertas, podeFechar: () => true }).fechar, [7]);
});

test('não fecha issue quando não dá para saber (execução não gerou resultado)', () => {
  const abertas = [{ number: 7, title: tituloBug('dev', 'A tela ano cabe') }];
  assert.deepEqual(planejar({ branch: 'dev', falhas: [], abertas, podeFechar: () => false }).fechar, []);
});

test('resumo diz a verdade: reprovado não aparece como passou, e menciona o dono e os links', () => {
  const cenarios = lerCenarios(resultado);
  const r = resumo({ branch: 'dev', jobs: { testes: 'success', e2e: 'failure', publicar: 'skipped' }, cenarios, falhas: [falha], runUrl: 'https://x/run', artefatoUrl: 'https://x/zip', paginaUrl: 'https://x/rel', sha: 'abcdef123' });
  assert.match(r, /^❌ Algo reprovou/);
  assert.match(r, /1 de 2 cenários passaram/);
  assert.match(r, /A tela ano cabe/);
  assert.match(r, /@CaduCondo/);
  assert.match(r, /x\/zip/);
  assert.doesNotMatch(r, /x\/rel/, 'sem publicação não há página de relatório');
  const ok = resumo({ branch: 'dev', jobs: { testes: 'success', e2e: 'success', publicar: 'success' }, cenarios: [cenarios[0]], falhas: [], runUrl: 'u', paginaUrl: 'https://x/rel', sha: 'a' });
  assert.match(ok, /^✅ Tudo passou/);
  assert.match(ok, /x\/rel/);
});

test('o corpo do bug traz cenário, erro, evidência e como reproduzir', () => {
  const b = corpoBug({ falha, branch: 'dev', sha: 'abcdef123', runUrl: 'https://x/run', artefatoUrl: 'https://x/zip' });
  for (const t of ['A tela ano cabe', 'Uso no celular', 'https://x/run', 'https://x/zip', 'npx playwright test -g "A tela ano cabe"']) assert.ok(b.includes(t), t);
});

test('testes passaram mas a publicação falhou: o aviso NÃO diz que tudo passou', () => {
  const r = resumo({ branch: 'dev', jobs: { testes: 'success', e2e: 'success', publicar: 'failure' }, cenarios: [], falhas: [], runUrl: 'u', sha: 'a' });
  assert.match(r, /^⚠️ Os testes passaram, mas a publicação do site falhou/);
  assert.doesNotMatch(r, /Tudo passou/);
});
