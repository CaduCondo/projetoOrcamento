/* "Porteiro" do Meu Orçamento no Cloudflare Workers (plano grátis).
   O que faz: recebe o pedido do app, CONFERE que quem pede é o dono (login do Firebase), pergunta à Pluggy e devolve só o necessário.
   Por que existe: a chave secreta da Pluggy NUNCA pode ficar dentro do site (qualquer um a veria). Ela fica só aqui, nos "Segredos" do Cloudflare.

   Configuração (Cloudflare → Worker → Settings → Variables and Secrets):
     PLUGGY_CLIENT_ID      (Secret)  Client ID da aplicação na Pluggy
     PLUGGY_CLIENT_SECRET  (Secret)  Client Secret da aplicação
     PLUGGY_ITEM_IDS       (Secret)  Item ID(s) do Meu Pluggy, separados por vírgula
     ALLOWED_EMAILS        (Text)    e-mail(s) do dono do app que podem usar (separados por vírgula)
     PROJECT_IDS           (Text)    projetos Firebase aceitos: gerenciarorcamento,gerenciarorcamento-dev
   Opcional: ALLOWED_ORIGINS (Text) para liberar outros endereços do site (separados por vírgula). */

const PLUGGY = 'https://api.pluggy.ai';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ORIGENS_PADRAO = ['https://caducondo.github.io', 'http://localhost:8000', 'http://localhost:8765'];
const MAX_DIAS = 400, MAX_PAGINAS = 40;

let jwksCache = { at: 0, keys: null };

const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
const lista = t => String(t || '').split(',').map(x => x.trim()).filter(Boolean);
const json = (obj, status, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

async function chavesGoogle(fetchFn) {
  if (jwksCache.keys && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const r = await fetchFn(JWKS_URL);
  if (!r.ok) throw new Error('jwks');
  jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  return jwksCache.keys;
}

/* confere o "crachá" (token) do Firebase: assinatura do Google, validade, projeto e e-mail do dono */
export async function verificaFirebase(token, env, fetchFn = fetch) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) throw new Error('token');
  const cab = JSON.parse(new TextDecoder().decode(b64u(partes[0]))), pl = JSON.parse(new TextDecoder().decode(b64u(partes[1])));
  if (cab.alg !== 'RS256' || !cab.kid) throw new Error('alg');
  const jwk = (await chavesGoogle(fetchFn)).find(k => k.kid === cab.kid);
  if (!jwk) throw new Error('kid');
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, b64u(partes[2]), new TextEncoder().encode(partes[0] + '.' + partes[1]));
  if (!ok) throw new Error('assinatura');
  const agora = Math.floor(Date.now() / 1000), projetos = lista(env.PROJECT_IDS);
  if (!(pl.exp > agora) || pl.iat > agora + 300) throw new Error('validade');
  if (!projetos.includes(pl.aud) || pl.iss !== 'https://securetoken.google.com/' + pl.aud || !pl.sub) throw new Error('projeto');
  const email = String(pl.email || '').toLowerCase();
  if (!email || !lista(env.ALLOWED_EMAILS).map(e => e.toLowerCase()).includes(email)) throw new Error('email');
  return { uid: pl.sub, email };
}

async function pluggy(caminho, chave, fetchFn, corpo) {
  const r = await fetchFn(PLUGGY + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(chave ? { 'X-API-KEY': chave } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) { const e = new Error('pluggy'); e.status = r.status; throw e; }
  return r.json();
}

/* só os campos que o app usa (o resto do que a Pluggy devolve fica aqui) */
const enxuta = t => ({
  id: t.id, date: t.date, description: t.description || t.descriptionRaw || '', amount: t.amount, type: t.type,
  billId: (t.creditCardMetadata || {}).billId || null,
  installment: (t.creditCardMetadata || {}).installmentNumber || null, totalInstallments: (t.creditCardMetadata || {}).totalInstallments || null,
});

async function transacoes(conta, de, ate, chave, fetchFn) {
  const todas = [];
  let url = `/v2/transactions?accountId=${encodeURIComponent(conta)}&dateFrom=${de}&dateTo=${ate}`;
  for (let i = 0; url && i < MAX_PAGINAS; i++) {
    const r = await pluggy(url, chave, fetchFn);
    todas.push(...(r.results || []));
    let prox = r.next;
    if (!prox) break;
    if (String(prox).startsWith('http')) prox = new URL(prox).pathname + new URL(prox).search;
    url = String(prox).startsWith('/') ? prox : `/v2/transactions?accountId=${encodeURIComponent(conta)}&dateFrom=${de}&dateTo=${ate}&after=${encodeURIComponent(prox)}`;
  }
  return todas.map(enxuta);
}

export async function buscaBanco(de, ate, env, fetchFn = fetch) {
  const auth = await pluggy('/auth', null, fetchFn, { clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET });
  const chave = auth.apiKey, contas = [], lanc = {}, faturas = {};
  for (const item of lista(env.PLUGGY_ITEM_IDS)) {
    for (const c of (await pluggy(`/accounts?itemId=${encodeURIComponent(item)}`, chave, fetchFn)).results || []) {
      contas.push({ id: c.id, type: c.type, subtype: c.subtype, name: c.name, number: String(c.number || '').slice(-4), balance: c.balance });
      lanc[c.id] = await transacoes(c.id, de, ate, chave, fetchFn);
      if (c.type === 'CREDIT') {
        const b = (await pluggy(`/bills?accountId=${encodeURIComponent(c.id)}`, chave, fetchFn)).results || [];
        faturas[c.id] = b.map(x => ({ id: x.id, dueDate: x.dueDate, totalAmount: x.totalAmount, closingDate: x.billClosingDate || null }));
      }
    }
  }
  return { contas, lancamentos: lanc, faturas };
}

export default {
  async fetch(req, env, ctx, fetchFn = fetch) {
    const origem = req.headers.get('Origin') || '', liberadas = [...ORIGENS_PADRAO, ...lista(env.ALLOWED_ORIGINS)];
    const cors = liberadas.includes(origem) ? { 'Access-Control-Allow-Origin': origem, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {};
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, erro: 'Use POST.' }, 405, cors);
    if (!liberadas.includes(origem)) return json({ ok: false, erro: 'Origem não permitida.' }, 403, cors);
    try { await verificaFirebase((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''), env, fetchFn); }
    catch { return json({ ok: false, erro: 'Não autorizado. Entre no app com a conta do dono.' }, 401, cors); }
    let corpo = {};
    try { corpo = await req.json(); } catch { /* corpo vazio */ }
    const de = String(corpo.de || ''), ate = String(corpo.ate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) return json({ ok: false, erro: 'Período inválido.' }, 400, cors);
    const dias = (Date.parse(ate) - Date.parse(de)) / 864e5;
    if (!(dias >= 0 && dias <= MAX_DIAS)) return json({ ok: false, erro: `Período deve ter no máximo ${MAX_DIAS} dias.` }, 400, cors);
    if (!env.PLUGGY_CLIENT_ID || !env.PLUGGY_CLIENT_SECRET || !env.PLUGGY_ITEM_IDS) return json({ ok: false, erro: 'O porteiro ainda não foi configurado (faltam os segredos da Pluggy).' }, 500, cors);
    try { return json({ ok: true, ...(await buscaBanco(de, ate, env, fetchFn)) }, 200, cors); }
    catch (e) { return json({ ok: false, erro: e.message === 'pluggy' ? `A Pluggy recusou o pedido (código ${e.status}).` : 'Falha ao falar com a Pluggy.' }, 502, cors); }
  },
};
