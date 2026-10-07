const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp } = require('./helpers/app');
const { createDb, install } = require('./helpers/firebase-mock');

const htmlDev = buildHtml('dev');
const htmlProd = buildHtml('prod');
const EMAIL = 'familia@exemplo.com', SENHA = 'segredo123';
const abrir = (db, html = htmlProd) => openApp({ html, setup: w => install(w, db) });

async function criarConta(app, email = EMAIL) {
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  app.click('[data-lm="up"]');
  app.type('#lem', email); app.type('#lpw', SENHA); app.type('#lpw2', SENHA);
  app.submit('#lf');
  await app.waitFor(() => app.ev('user') === email && app.ev('S') && app.$('#qf'), 4000, 'conta criada e tela carregada');
}

test('nuvem: login sem "manter conectado" e com textos da nuvem', async () => {
  const app = abrir(createDb());
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  assert.match(app.text(), /acompanham você em qualquer aparelho/);
  assert.equal(app.$('#lrem'), null);
  app.click('[data-lm="reset"]');
  assert.match(app.$('.login .sub').textContent, /Redefinir senha/);
  assert.equal(app.$('#lpw'), null, 'redefinir pede só o e-mail');
  assert.match(app.$('.login button.btn').textContent, /Enviar link por e-mail/);
  app.close();
});

test('nuvem: criar conta grava meta; lançar grava só o ano alterado', async () => {
  const db = createDb(); const app = abrir(db);
  await criarConta(app);
  await app.waitFor(() => db.docs['users/uid1/meta/main'], 3000, 'meta criado na nuvem');
  assert.equal(Object.keys(db.docs).filter(k => k.includes('/years/')).length, 0, 'sem lançamentos ainda');
  const y = app.ev('selY'), m = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`Combobox.set('qc','${merc}')`); app.type('#qv', '2500'); app.submit('#qf');
  await app.waitFor(() => db.docs[`users/uid1/years/${y}`], 3000, 'ano gravado');
  assert.deepEqual(db.lastOps, [`set:users/uid1/years/${y}`], 'só o documento do ano mudou (meta ficou igual)');
  assert.ok(db.docs[`users/uid1/years/${y}`].json.includes('"v":25'));
  const antes = db.commits;
  await app.ev('backend.flush()');
  assert.equal(db.commits, antes, 'sem mudanças: não grava de novo');
  assert.match(app.$('#toast').textContent, /Salvo/);
  app.close();
});

test('nuvem: entrar de novo (outro aparelho) traz os dados; cada usuário só vê os seus', async () => {
  const db = createDb();
  const a = abrir(db); await criarConta(a);
  const y = a.ev('selY'), m = a.ev('selM');
  const merc = a.ev("S.cats.find(c=>c.nome==='Mercado').id");
  a.ev(`ens('${merc}',${y},${m}).items.push({v:77,d:'sincronizar',ok:true})`); a.ev('save()');
  await a.waitFor(() => db.docs[`users/uid1/years/${y}`], 3000, 'gravou');
  a.close();
  // "outro aparelho": nova janela, mesma nuvem; a sessão do Firebase continua
  const b = abrir(db);
  await b.waitFor(() => b.ev('user') === EMAIL && b.$('#qf'), 4000, 'abriu já logado');
  assert.equal(b.ev(`V('${merc}',${y},${m},'real')`), 77, 'dados chegaram do outro aparelho');
  // sair e entrar com outra conta: não vê nada da primeira
  b.click('[data-logout]');
  await b.waitFor(() => b.$('#lf') && b.ev('user') === null, 3000, 'saiu');
  assert.equal(b.$('[data-lm="in"]'), null, 'tela de login volta no modo Entrar (não Criar conta)');
  await criarConta(b, 'outra@exemplo.com');
  assert.equal(b.ev('Object.keys(S.data).length'), 0, 'conta nova começa vazia');
  assert.ok(db.docs['users/uid2/meta/main'] && !Object.keys(db.docs).some(k => k.startsWith('users/uid2/years/')));
  b.close();
});

test('nuvem: erros de login e e-mail de redefinição', async () => {
  const db = createDb(); const a = abrir(db); await criarConta(a); a.click('[data-logout]');
  await a.waitFor(() => a.$('#lf') && a.ev('user') === null, 3000, 'saiu');
  a.type('#lem', EMAIL); a.type('#lpw', 'errada1'); a.submit('#lf');
  await a.waitFor(() => /E-mail ou senha incorretos/.test(a.$('#lerr').textContent), 3000, 'senha errada');
  a.click('[data-lm="up"]');
  a.type('#lem', EMAIL); a.type('#lpw', SENHA); a.type('#lpw2', SENHA); a.submit('#lf');
  await a.waitFor(() => /já tem conta/.test(a.$('#lerr').textContent), 3000, 'e-mail repetido');
  a.click('[data-lm="in"]');                                   // volta para "Entrar" e abre "Esqueci minha senha"
  a.click('[data-lm="reset"]');
  a.type('#lem', EMAIL); a.submit('#lf');
  await a.waitFor(() => /enviamos um link/.test(a.$('#lerr').textContent), 3000, 'mensagem de redefinição');
  assert.deepEqual(db.resetEmails, [EMAIL]);
  a.close();
});

test('nuvem: falha de rede mostra aviso e recupera sozinha', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  await app.waitFor(() => db.docs['users/uid1/meta/main'], 3000, 'meta');
  const y = app.ev('selY'), m = app.ev('selM');
  const c = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  db.fail = true;
  app.ev(`ens('${c}',${y},${m}).items.push({v:5,d:'x',ok:true})`); app.ev('save()');
  await app.waitFor(() => /Erro ao salvar/.test(app.$('#toast').textContent), 3000, 'aviso de erro');
  assert.equal(db.docs[`users/uid1/years/${y}`], undefined, 'nada foi gravado durante a falha');
  db.fail = false;
  await app.ev('backend.flush()');
  assert.ok(db.docs[`users/uid1/years/${y}`], 'gravou ao voltar a conexão');
  assert.match(app.$('#toast').textContent, /Salvo/);
  app.close();
});

test('nuvem: importar anos grava um documento por ano; excluir ano de dados remove o documento', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  const arquivo = { anos: [2023, 2024], saldoIni: { 2023: 100 }, cats: [{ id: 'i1', tipo: 'pagar', nome: 'Condomínio', dia: 5 }],
    data: { 'i1|2023|0': { items: [{ v: 300, d: '', ok: true }] }, 'i1|2024|1': { items: [{ v: 310, d: '', ok: true }] } } };
  app.ev(`mergeImport(${JSON.stringify(arquivo)})`);
  await app.waitFor(() => db.docs['users/uid1/years/2023'] && db.docs['users/uid1/years/2024'], 3000, 'anos importados');
  const meta = JSON.parse(db.docs['users/uid1/meta/main'].json);
  assert.ok(meta.anos.includes(2023) && meta.saldoIni['2023'] === 100);
  assert.ok(!db.docs['users/uid1/meta/main'].json.includes('"data"'), 'lançamentos não vão no meta');
  const cond = app.ev("S.cats.find(c=>c.nome==='Condomínio').id");
  app.ev(`deleteCat('${cond}');save()`);
  await app.waitFor(() => !db.docs['users/uid1/years/2023'] && !db.docs['users/uid1/years/2024'], 3000, 'documentos dos anos removidos');
  app.close();
});

test('ambientes: DEV mostra a faixa de teste e título [TESTE]; PROD não', async () => {
  const dev = abrir(createDb(), htmlDev);
  await dev.waitFor(() => dev.$('#lf'), 3000, 'login dev');
  assert.equal(dev.$('#envbar').hidden, false);
  assert.match(dev.$('#envbar').textContent, /AMBIENTE DE TESTE/);
  assert.match(dev.d.title, /\[TESTE\]/);
  assert.equal(dev.ev('ENV'), 'dev');
  assert.equal(dev.ev('FBCFG.projectId'), 'gerenciarorcamento-dev');
  dev.close();
  const prod = abrir(createDb(), htmlProd);
  await prod.waitFor(() => prod.$('#lf'), 3000, 'login prod');
  assert.equal(prod.$('#envbar').hidden, true);
  assert.doesNotMatch(prod.d.title, /TESTE/);
  assert.equal(prod.ev('ENV'), 'prod');
  assert.equal(prod.ev('FBCFG.projectId'), 'gerenciarorcamento');
  prod.close();
});
