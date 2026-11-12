/* O "porteiro" do Cloudflare (tools/pluggy-worker/worker.js): confere o login do dono, limita origem e período,
   e devolve só os campos necessários. Tudo com a Pluggy e o Google SIMULADOS (nenhuma chave real). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WORKER = pathToFileURL(path.join(__dirname, '..', 'tools', 'pluggy-worker', 'worker.js')).href;
const subtle = webcrypto.subtle;
const b64u = b => Buffer.from(b).toString('base64url');
const ENV = { PLUGGY_CLIENT_ID: 'id', PLUGGY_CLIENT_SECRET: 'segredo', PLUGGY_ITEM_IDS: 'item1', ALLOWED_EMAILS: 'dono@exemplo.com', PROJECT_IDS: 'gerenciarorcamento,gerenciarorcamento-dev' };
const ORIGEM = 'https://caducondo.github.io';

let par, jwk;
test.before(async () => {
  par = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...(await subtle.exportKey('jwk', par.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
});
async function token(extra = {}, chave = null) {
  const agora = Math.floor(Date.now() / 1000);
  const pl = { iss: 'https://securetoken.google.com/gerenciarorcamento', aud: 'gerenciarorcamento', sub: 'uid1', email: 'dono@exemplo.com', iat: agora - 10, exp: agora + 3600, ...extra };
  const cab = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })), corpo = b64u(JSON.stringify(pl));
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', chave || par.privateKey, new TextEncoder().encode(cab + '.' + corpo));
  return `${cab}.${corpo}.${b64u(sig)}`;
}
/* Google e Pluggy falsos; guarda as chamadas para conferir */
function fakeFetch(chamadas = []) {
  return async (url, init = {}) => {
    chamadas.push(String(url));
    const u = String(url), res = (obj, ok = true, status = 200) => ({ ok, status, json: async () => obj });
    if (u.includes('googleapis.com')) return res({ keys: [jwk] });
    if (u.endsWith('/auth')) return res({ apiKey: 'chave-da-pluggy' });
    if (u.includes('/accounts?itemId=')) return res({ results: [
      { id: 'cc1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'itau', number: '00011226-8', balance: 100, campoExtra: 'x' },
      { id: 'cartao1', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Visa', number: '0498', balance: 50 }] });
    if (u.includes('/v2/transactions') && u.includes('accountId=cc1') && !u.includes('after='))
      return res({ results: [{ id: 't1', date: '2026-10-05', description: 'PIX', amount: -10, type: 'DEBIT', accountId: 'cc1', balance: 999, merchant: { nome: 'segredo' } }], next: 'https://api.pluggy.ai/v2/transactions?accountId=cc1&after=abc' });
    if (u.includes('/v2/transactions') && u.includes('after=abc')) return res({ results: [{ id: 't2', date: '2026-10-06', description: 'SALARIO', amount: 500, type: 'CREDIT' }], next: null });
    if (u.includes('/v2/transactions') && u.includes('accountId=cartao1'))
      return res({ results: [{ id: 't3', date: '2026-09-21', description: 'LOJA', amount: 100, type: 'DEBIT', creditCardMetadata: { billId: 'b1', installmentNumber: 1, totalInstallments: 3, cardNumber: '1234' } }], next: null });
    if (u.includes('/bills?accountId=cartao1')) return res({ results: [{ id: 'b1', dueDate: '2026-10-09', totalAmount: 100, billClosingDate: '2026-10-02', payments: [1, 2] }] });
    return res({}, false, 404);
  };
}
async function chama({ metodo = 'POST', origem = ORIGEM, tk, corpo = { de: '2026-07-01', ate: '2026-10-27' }, env = ENV, chamadas } = {}) {
  const mod = await import(WORKER);
  const h = { Origin: origem, 'Content-Type': 'application/json' };
  if (tk !== null) h.Authorization = 'Bearer ' + (tk ?? await token());
  const r = await mod.default.fetch(new Request('https://porteiro.exemplo.workers.dev', { method: metodo, headers: h, body: metodo === 'POST' ? JSON.stringify(corpo) : undefined }), env, {}, fakeFetch(chamadas));
  return { status: r.status, headers: r.headers, body: r.status === 204 ? null : await r.json() };
}

test('sem login, login de outra pessoa, token vencido ou de outro projeto: nada sai e a Pluggy nem é chamada', async () => {
  const calls = [];
  assert.equal((await chama({ tk: null, chamadas: calls })).status, 401);
  assert.equal((await chama({ tk: 'lixo', chamadas: calls })).status, 401);
  assert.equal((await chama({ tk: await token({ email: 'outro@exemplo.com' }), chamadas: calls })).status, 401, 'e-mail que não é do dono');
  assert.equal((await chama({ tk: await token({ exp: Math.floor(Date.now() / 1000) - 5 }), chamadas: calls })).status, 401, 'vencido');
  assert.equal((await chama({ tk: await token({ aud: 'outro-projeto', iss: 'https://securetoken.google.com/outro-projeto' }), chamadas: calls })).status, 401, 'outro projeto');
  const outra = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal((await chama({ tk: await token({}, outra.privateKey), chamadas: calls })).status, 401, 'assinatura falsa');
  assert.equal(calls.filter(u => u.includes('pluggy.ai')).length, 0, 'a Pluggy nunca foi chamada');
});

test('origem não permitida, método errado e período inválido são recusados', async () => {
  assert.equal((await chama({ origem: 'https://site-malicioso.com' })).status, 403);
  assert.equal((await chama({ metodo: 'GET' })).status, 405);
  assert.equal((await chama({ corpo: { de: 'ontem', ate: 'hoje' } })).status, 400);
  assert.equal((await chama({ corpo: { de: '2024-01-01', ate: '2026-10-27' } })).status, 400, 'mais de 400 dias');
  assert.equal((await chama({ env: { ...ENV, PLUGGY_CLIENT_SECRET: '' } })).status, 500, 'sem configurar');
  const pre = await chama({ metodo: 'OPTIONS' });
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGEM);
  assert.equal((await chama({ metodo: 'OPTIONS', origem: 'https://x.com' })).headers.get('Access-Control-Allow-Origin'), null);
});

test('dono logado: devolve contas, lançamentos (seguindo a paginação) e faturas só com os campos necessários', async () => {
  const calls = [];
  const r = await chama({ chamadas: calls });
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEM);
  assert.deepEqual(r.body.contas.map(c => [c.id, c.type, c.number]), [['cc1', 'BANK', '26-8'], ['cartao1', 'CREDIT', '0498']], 'só os 4 últimos caracteres do número');
  assert.ok(!('campoExtra' in r.body.contas[0]), 'campos extras da conta ficam no porteiro');
  assert.deepEqual(r.body.lancamentos.cc1.map(t => t.id), ['t1', 't2'], 'seguiu a página seguinte');
  assert.deepEqual(Object.keys(r.body.lancamentos.cc1[0]).sort(), ['amount', 'billId', 'date', 'description', 'id', 'installment', 'totalInstallments', 'type']);
  assert.ok(!JSON.stringify(r.body).includes('segredo') && !JSON.stringify(r.body).includes('chave-da-pluggy') && !JSON.stringify(r.body).includes('1234'), 'nada de chaves, merchant ou número do cartão');
  assert.deepEqual(r.body.lancamentos.cartao1[0], { id: 't3', date: '2026-09-21', description: 'LOJA', amount: 100, type: 'DEBIT', billId: 'b1', installment: 1, totalInstallments: 3 });
  assert.deepEqual(r.body.faturas.cartao1, [{ id: 'b1', dueDate: '2026-10-09', totalAmount: 100, closingDate: '2026-10-02' }]);
  assert.ok(calls.some(u => u.includes('dateFrom=2026-07-01') && u.includes('dateTo=2026-10-27')), 'usa os nomes de filtro da Pluggy');
});
