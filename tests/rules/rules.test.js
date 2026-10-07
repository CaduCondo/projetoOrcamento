/* Testes das REGRAS DE SEGURANÇA do Firestore, rodando no emulador oficial (npm run test:rules).
   Provam as promessas de privacidade: cada pessoa só mexe no que é seu; o administrador só LÊ; ninguém vira administrador pelo site. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

let env;
const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
const ANA = { uid: 'ana', email: 'ana@exemplo.com' }, BIA = { uid: 'bia', email: 'bia@exemplo.com' }, ADM = { uid: 'adm', email: 'adm@exemplo.com' };
const dbOf = u => (u ? env.authenticatedContext(u.uid, { email: u.email }) : env.unauthenticatedContext()).firestore();
const perfil = (u, extra = {}) => ({ email: u.email, nome: 'Fulano', nascimento: '1990-01-01', profissao: 'Dev', foto: '', storage: 'cloud', lembretes: 0, criadoEm: '2026-01-01T00:00:00Z', ...extra });

test.before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-orcamento', firestore: { rules } });
});
test.after(async () => { await env.cleanup(); });
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await db.doc('admins/adm').set({ ativo: true });
    for (const u of [ANA, BIA, ADM]) await db.doc(`profiles/${u.uid}`).set(perfil(u));
    await db.doc('users/ana/meta/main').set({ json: '{"ana":1}' });
    await db.doc('users/ana/years/2026').set({ json: '{}' });
    await db.doc('users/bia/meta/main').set({ json: '{"bia":1}' });
  });
});

test('sem login: nada é lido nem gravado', async () => {
  const db = dbOf(null);
  await assertFails(db.doc('users/ana/meta/main').get());
  await assertFails(db.doc('profiles/ana').get());
  await assertFails(db.doc('users/ana/meta/main').set({ json: 'x' }));
  await assertFails(db.collection('profiles').get());
  await assertFails(db.doc('admins/adm').get());
});

test('cada pessoa lê e grava só os próprios lançamentos', async () => {
  const db = dbOf(ANA);
  await assertSucceeds(db.doc('users/ana/meta/main').get());
  await assertSucceeds(db.collection('users/ana/years').get());
  await assertSucceeds(db.doc('users/ana/years/2027').set({ json: '{"novo":1}' }));
  await assertSucceeds(db.doc('users/ana/years/2027').delete());
  await assertFails(db.doc('users/bia/meta/main').get(), 'não lê os dados de outra pessoa');
  await assertFails(db.collection('users/bia/years').get());
  await assertFails(db.doc('users/bia/meta/main').set({ json: 'invadido' }), 'não grava nos dados de outra pessoa');
  await assertFails(db.doc('users/bia/meta/main').delete(), 'não apaga os dados de outra pessoa');
  await assertFails(db.collection('users').get(), 'não lista todos os usuários');
});

test('documentos de lançamentos só aceitam o campo "json" (nada de lixo ou de dados soltos)', async () => {
  const db = dbOf(ANA);
  await assertFails(db.doc('users/ana/meta/main').set({ json: 'x', extra: 1 }));
  await assertFails(db.doc('users/ana/meta/outro').set({ qualquer: 'coisa' }));
  await assertSucceeds(db.doc('users/ana/meta/main').set({ json: 'ok' }));
});

test('cadastro: dono lê e grava; e-mail precisa ser o da conta; só campos conhecidos; foto limitada', async () => {
  const db = dbOf(ANA);
  await assertSucceeds(db.doc('profiles/ana').get());
  await assertSucceeds(db.doc('profiles/ana').set(perfil(ANA, { nome: 'Ana Maria', storage: 'local' })));
  await assertFails(db.doc('profiles/ana').set(perfil(ANA, { email: 'outro@exemplo.com' })), 'não finge ser outro e-mail');
  await assertFails(db.doc('profiles/ana').set({ ...perfil(ANA), poder: 'admin' }), 'campo desconhecido');
  await assertFails(db.doc('profiles/ana').set(perfil(ANA, { foto: 'x'.repeat(130001) })), 'foto grande demais');
  await assertSucceeds(db.doc('profiles/ana').set(perfil(ANA, { foto: 'x'.repeat(130000) })));
  await assertFails(db.doc('profiles/bia').get(), 'não lê o cadastro de outra pessoa');
  await assertFails(db.doc('profiles/bia').set(perfil(BIA, { nome: 'Invadida' })), 'não grava o cadastro de outra pessoa');
  await assertFails(db.collection('profiles').get(), 'não lista todos os cadastros');
});

test('ninguém vira administrador pelo site', async () => {
  const db = dbOf(ANA);
  await assertFails(db.doc('admins/ana').set({ ativo: true }), 'não se promove');
  await assertFails(db.doc('admins/adm').get(), 'não vê o documento de outro');
  await assertSucceeds(db.doc('admins/ana').get());                 // pode perguntar "sou admin?" sobre si mesma (não existe)
  const dbAdm = dbOf(ADM);
  await assertSucceeds(dbAdm.doc('admins/adm').get());
  await assertFails(dbAdm.doc('admins/adm').delete(), 'nem o administrador altera a lista pelo site');
  await assertFails(dbAdm.doc('admins/ana').set({ ativo: true }), 'nem o administrador promove outras pessoas pelo site');
});

test('o administrador só LÊ: vê cadastros e lançamentos de todos, mas não altera nada de ninguém', async () => {
  const db = dbOf(ADM);
  await assertSucceeds(db.collection('profiles').get(), 'lista os cadastros');
  await assertSucceeds(db.doc('profiles/ana').get());
  await assertSucceeds(db.doc('users/ana/meta/main').get(), 'lê os lançamentos');
  await assertSucceeds(db.collection('users/ana/years').get());
  await assertFails(db.doc('users/ana/meta/main').set({ json: 'alterado' }), 'não altera lançamentos');
  await assertFails(db.doc('users/ana/years/2026').delete(), 'não apaga lançamentos');
  await assertFails(db.doc('users/ana/years/2030').set({ json: '{}' }), 'não cria lançamentos para outra pessoa');
  await assertFails(db.doc('profiles/ana').set(perfil(ANA, { nome: 'Alterado pelo admin' })), 'não altera cadastro');
  await assertFails(db.doc('profiles/ana').delete(), 'não apaga cadastro');
  // e continua dono dos PRÓPRIOS dados
  await assertSucceeds(db.doc('users/adm/meta/main').set({ json: 'meu' }));
  await assertSucceeds(db.doc('profiles/adm').set(perfil(ADM, { nome: 'Dono' })));
});

test('quem escolheu "só no aparelho" não tem lançamentos no banco: nada a ler, e o administrador vê apenas o cadastro', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await ctx.firestore().doc('profiles/bia').set(perfil(BIA, { storage: 'local' })); await ctx.firestore().doc('users/bia/meta/main').delete(); });
  const db = dbOf(ADM);
  const p = await assertSucceeds(db.doc('profiles/bia').get());
  assert.equal(p.data().storage, 'local');
  const docs = await assertSucceeds(db.collection('users/bia/years').get());
  assert.equal(docs.size, 0);
  const meta = await assertSucceeds(db.doc('users/bia/meta/main').get());
  assert.equal(meta.exists, false);
});

test('todo o resto é bloqueado, até para o administrador', async () => {
  for (const u of [ANA, ADM]) {
    const db = dbOf(u);
    await assertFails(db.doc('qualquer/coisa').get());
    await assertFails(db.doc('qualquer/coisa').set({ a: 1 }));
    await assertFails(db.doc('config/segredo').set({ a: 1 }));
  }
});
