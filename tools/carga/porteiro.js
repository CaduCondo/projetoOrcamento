/* Teste de CARGA e ESTRESSE do "porteiro" (tools/pluggy-worker/worker.js), o único servidor que é nosso.

   O que roda: o código REAL do porteiro dentro de um servidor HTTP local, com o Google e a Pluggy SIMULADOS (nenhuma chave, nenhuma rede,
   nenhuma conta real; nunca fale com a Pluggy de verdade num teste de carga). Vários clientes disparam pedidos ao mesmo tempo e o script confere:
     - uso normal do dono: tudo atendido (200), rápido;
     - abuso (inundação com login falso e com login verdadeiro): o porteiro responde 429 DEPOIS do limite, sem 5xx, sem chamar a Pluggy além do permitido;
     - estresse (muitos clientes, muitas contas, rampa de concorrência): sem erro 5xx, latência dentro do combinado, e o limite continua valendo.
   Se qualquer combinado for quebrado, o script termina com erro (o CI reprova).
   O que NÃO é testado aqui (de propósito): Firestore, Firebase Auth e GitHub Pages. São serviços do Google e do GitHub; os termos deles proíbem teste de carga.

   Uso:  npm run carga:porteiro        (leva cerca de 20 segundos) */
const http = require('node:http');
const { webcrypto } = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WORKER = pathToFileURL(path.join(__dirname, '..', 'pluggy-worker', 'worker.js')).href;
const subtle = webcrypto.subtle;
const b64u = b => Buffer.from(b).toString('base64url');
const ORIGEM = 'https://caducondo.github.io';
const PERIODO = { de: '2026-07-01', ate: '2026-10-27' };

/* ---- combinados (podem ser ajustados aqui, em um só lugar) ---- */
const COMBINADO = { p95NormalMs: 1000, p95AbusoMs: 1000, p95EstresseMs: 2000 };

let par, jwk, Worker;
async function preparar() {
  par = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...(await subtle.exportKey('jwk', par.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  Worker = await import(WORKER);
}
async function token(uid, email, chave = null) {
  const agora = Math.floor(Date.now() / 1000);
  const pl = { iss: 'https://securetoken.google.com/gerenciarorcamento', aud: 'gerenciarorcamento', sub: uid, email, iat: agora - 10, exp: agora + 3600 };
  const cab = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })), corpo = b64u(JSON.stringify(pl));
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', chave || par.privateKey, new TextEncoder().encode(cab + '.' + corpo));
  return `${cab}.${corpo}.${b64u(sig)}`;
}

/* Google e Pluggy falsos, com um pouco de atraso (como numa rede de verdade); contam as chamadas */
function servicosFalsos(contador) {
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const res = obj => ({ ok: true, status: 200, json: async () => obj });
  return async url => {
    const u = String(url);
    if (u.includes('googleapis.com')) { contador.google++; return res({ keys: [jwk] }); }
    contador.pluggy++; await espera(3);
    if (u.endsWith('/auth')) { contador.buscas++; return res({ apiKey: 'chave-falsa' }); }
    if (u.includes('/accounts?itemId=')) return res({ results: [{ id: 'cc1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'conta', number: '1234', balance: 1 }] });
    if (u.includes('/v2/transactions')) return res({ results: [{ id: 't1', date: '2026-10-05', description: 'PIX', amount: -10, type: 'DEBIT' }], next: null });
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

/* servidor HTTP local que entrega cada pedido ao porteiro de verdade */
async function subirServidor(env, contador) {
  const fetchFalso = servicosFalsos(contador);
  const srv = http.createServer(async (req, res) => {
    const partes = []; for await (const p of req) partes.push(p);
    const corpo = Buffer.concat(partes);
    const r = await Worker.default.fetch(new Request('http://porteiro.local' + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? corpo : undefined }), env, {}, fetchFalso)
      .catch(e => new Response(JSON.stringify({ ok: false, erro: 'queda: ' + e.message }), { status: 500 }));
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text());
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${srv.address().port}`, fechar: () => new Promise(ok => { srv.closeAllConnections?.(); srv.close(ok); }) };
}

const percentil = (ordenado, p) => ordenado.length ? ordenado[Math.min(ordenado.length - 1, Math.floor(ordenado.length * p))] : 0;

/* dispara pedidos com `concorrencia` clientes ao mesmo tempo, até `duracaoMs`. `monta(i)` devolve { headers } de cada pedido. */
async function carga({ url, duracaoMs, concorrencia, monta, maxPedidos = Infinity }) {
  const lat = [], status = {}; let feitos = 0; const t0 = Date.now(), fim = t0 + duracaoMs;
  async function cliente() {
    while (Date.now() < fim && feitos < maxPedidos) {
      const i = feitos++, ini = performance.now();
      let st;
      try { const r = await fetch(url, { method: 'POST', headers: { Origin: ORIGEM, 'Content-Type': 'application/json', ...monta(i) }, body: JSON.stringify(PERIODO) }); await r.text(); st = r.status; }
      catch { st = 'rede'; }
      lat.push(performance.now() - ini); status[st] = (status[st] || 0) + 1;
    }
  }
  await Promise.all(Array.from({ length: concorrencia }, cliente));
  lat.sort((a, b) => a - b);
  const seg = (Date.now() - t0) / 1000;
  return { total: lat.length, status, rps: Math.round(lat.length / seg), p50: percentil(lat, .5), p95: percentil(lat, .95), p99: percentil(lat, .99), max: lat[lat.length - 1] || 0 };
}
const cincoXX = r => Object.entries(r.status).filter(([k]) => /^5/.test(k) || k === 'rede').reduce((s, [, v]) => s + v, 0);
const fmt = r => `${r.total} pedidos · ${r.rps}/s · p50 ${r.p50.toFixed(0)}ms · p95 ${r.p95.toFixed(0)}ms · p99 ${r.p99.toFixed(0)}ms · status ${JSON.stringify(r.status)}`;

const falhas = [];
const confere = (ok, msg) => { console.log(`   ${ok ? '✔' : '✘'} ${msg}`); if (!ok) falhas.push(msg); };

async function cenario(titulo, env, fn) {
  console.log(`\n▶ ${titulo}`);
  Worker.zerarLimites();
  const contador = { google: 0, pluggy: 0, buscas: 0 }, s = await subirServidor({ PLUGGY_CLIENT_ID: 'id', PLUGGY_CLIENT_SECRET: 'segredo', PLUGGY_ITEM_IDS: 'item1', PROJECT_IDS: 'gerenciarorcamento', ...env }, contador);
  try { await fn(s.url, contador); } finally { await s.fechar(); }
}

(async () => {
  await preparar();
  const dono = await token('uid-dono', 'dono@exemplo.com');
  const comum = { ALLOWED_EMAILS: 'dono@exemplo.com' };

  await cenario('1) Uso normal do dono: 6 buscas, uma de cada vez (limite: 10 por conta)', { ...comum, LIMITE_BUSCAS: '10' }, async (url, c) => {
    const r = await carga({ url, duracaoMs: 15_000, concorrencia: 1, maxPedidos: 6, monta: () => ({ Authorization: 'Bearer ' + dono, 'CF-Connecting-IP': '203.0.113.5' }) });
    console.log('  ', fmt(r));
    confere(r.status[200] === 6 && Object.keys(r.status).length === 1, 'todas as 6 buscas foram atendidas (200)');
    confere(r.p95 < COMBINADO.p95NormalMs, `p95 abaixo de ${COMBINADO.p95NormalMs} ms (deu ${r.p95.toFixed(0)} ms)`);
    confere(c.buscas === 6, `a Pluggy (falsa) foi acionada 6 vezes, uma por busca (foram ${c.buscas})`);
  });

  await cenario('2) Abuso com login VERDADEIRO: 40 clientes martelando a busca por 5 s (limite: 8 por conta)', { ...comum, LIMITE_BUSCAS: '8', LIMITE_IP_POR_MIN: '100000' }, async (url, c) => {
    const r = await carga({ url, duracaoMs: 5_000, concorrencia: 40, monta: () => ({ Authorization: 'Bearer ' + dono, 'CF-Connecting-IP': '203.0.113.6' }) });
    console.log('  ', fmt(r));
    confere(r.status[200] === 8, `exatamente 8 buscas passaram (passaram ${r.status[200] || 0})`);
    confere((r.status[429] || 0) === r.total - 8, 'todo o resto levou 429 (muitos pedidos)');
    confere(cincoXX(r) === 0, 'nenhum erro 5xx nem queda de conexão');
    confere(c.buscas === 8, `a Pluggy (falsa) NÃO foi acionada além do limite (acionada ${c.buscas} vezes)`);
    confere(r.p95 < COMBINADO.p95AbusoMs, `p95 abaixo de ${COMBINADO.p95AbusoMs} ms mesmo sob abuso (deu ${r.p95.toFixed(0)} ms)`);
  });

  await cenario('3) Inundação com login FALSO (lixo e assinatura inválida) do mesmo endereço, 50 clientes por 5 s (limite: 60 por minuto por IP)', { ...comum }, async (url, c) => {
    const falso = await token('uid-x', 'dono@exemplo.com', (await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])).privateKey);
    const r = await carga({ url, duracaoMs: 5_000, concorrencia: 50, monta: i => ({ Authorization: 'Bearer ' + (i % 2 ? falso : 'lixo.lixo.lixo'), 'CF-Connecting-IP': '198.51.100.9' }) });
    console.log('  ', fmt(r));
    confere(r.status[401] === 60, `só os 60 primeiros chegaram a conferir o login (conferiram ${r.status[401] || 0})`);
    confere((r.status[429] || 0) === r.total - 60, 'todo o resto levou 429 antes de gastar CPU conferindo o login');
    confere(c.pluggy === 0 && c.buscas === 0, 'a Pluggy não foi acionada nenhuma vez');
    confere(cincoXX(r) === 0, 'nenhum erro 5xx nem queda de conexão');
    confere(r.p95 < COMBINADO.p95AbusoMs, `p95 abaixo de ${COMBINADO.p95AbusoMs} ms (deu ${r.p95.toFixed(0)} ms)`);
  });

  await cenario('4) Estresse: 120 clientes de 120 endereços e 120 contas diferentes, rampa até 150 simultâneos por 8 s (limite por conta: 3)', { ALLOWED_EMAILS: Array.from({ length: 120 }, (_, i) => `u${i}@exemplo.com`).join(','), LIMITE_BUSCAS: '3', LIMITE_IP_POR_MIN: '100000' }, async (url, c) => {
    const tokens = await Promise.all(Array.from({ length: 120 }, (_, i) => token('uid' + i, `u${i}@exemplo.com`)));
    const rampa = [30, 90, 150];
    const rs = [];
    for (const conc of rampa) rs.push(await carga({ url, duracaoMs: 2_600, concorrencia: conc, monta: i => ({ Authorization: 'Bearer ' + tokens[i % 120], 'CF-Connecting-IP': `10.0.${(i % 120) >> 8}.${i % 120}` }) }));
    rs.forEach((r, i) => console.log(`   rampa ${rampa[i]} simultâneos: `, fmt(r)));
    const todos = { total: 0, status: {} }; rs.forEach(r => { todos.total += r.total; for (const [k, v] of Object.entries(r.status)) todos.status[k] = (todos.status[k] || 0) + v; });
    confere(cincoXX(todos) === 0, 'nenhum erro 5xx nem queda de conexão em toda a rampa');
    confere(c.buscas <= 120 * 3, `nenhuma conta passou do limite de 3 buscas (a Pluggy falsa foi acionada ${c.buscas} vezes, máximo permitido ${120 * 3})`);
    confere(c.google <= 2, `a lista de chaves do Google foi buscada só ${c.google} vez(es) (fica em cache por 1 hora)`);
    confere(Math.max(...rs.map(r => r.p95)) < COMBINADO.p95EstresseMs, `p95 abaixo de ${COMBINADO.p95EstresseMs} ms em todos os degraus (maior: ${Math.max(...rs.map(r => r.p95)).toFixed(0)} ms)`);
    confere((todos.status[200] || 0) > 0 && (todos.status[429] || 0) > 0, 'houve pedidos atendidos e pedidos barrados (os dois comportamentos aparecem)');
  });

  console.log(falhas.length ? `\n✘ ${falhas.length} combinado(s) quebrado(s):\n - ${falhas.join('\n - ')}` : '\n✔ Carga e estresse do porteiro: todos os combinados foram cumpridos.');
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error('Falha ao rodar a carga:', e); process.exit(1); });
