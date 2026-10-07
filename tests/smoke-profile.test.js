const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp, fakeHandle } = require('./helpers/app');
const { createDb, install } = require('./helpers/firebase-mock');

const html = buildHtml('prod');
const EMAIL = 'cadu@exemplo.com', SENHA = 'segredo123';
const abrir = (db, extra = {}) => openApp({ html, setup: w => { install(w, db); if (extra.setup) extra.setup(w); }, storage: extra.storage });
const nbsp = s => s.replace(/ /g, ' ');

async function criarConta(app, email = EMAIL) {
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  app.click('[data-lm="up"]'); app.type('#lem', email); app.type('#lpw', SENHA); app.type('#lpw2', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === email && app.ev('S') && app.$('[data-newcat]'), 4000, 'tela carregada');
}
async function entrar(app, email = EMAIL, senha = SENHA) {
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  app.type('#lem', email); app.type('#lpw', senha); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === email && app.ev('S') && app.$('[data-newcat]'), 4000, 'entrou');
}
const lancar = (app, valorDigitos = '5000', desc = 'x') => {
  app.click('[data-tab="mes"]');
  const y = app.ev('selY'), m = app.ev('selM'), c = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.click(`[data-open="${c}|${y}|${m}"]`); app.type('#nv', valorDigitos); app.type('#nd', desc); app.click('[data-add]'); app.click('[data-close]');
  return { y, m, c };
};

test('cadastro: aviso para completar, validações e salvar; o aviso some quando tudo está feito', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  assert.match(app.$('#notice').textContent, /Complete seu cadastro/);
  assert.match(app.$('#notice').textContent, /escolher onde guardar/);
  app.click('.userchip');                                         // o e-mail/foto no topo abre o cadastro
  assert.equal(app.ev('tab'), 'perfil');
  assert.equal(app.$('#pfe').value, EMAIL); assert.equal(app.$('#pfe').readOnly, true);
  app.type('#pfn', 'Carlos Eduardo Silva'); app.type('#pfb', '2999-01-01'); app.type('#pfp', 'Analista');
  app.click('[data-pf="salvar"]'); await app.sleep(30);
  assert.match(app.$('#pferr').textContent, /futuro/);
  app.type('#pfb', '1985-03-20'); app.click('[data-pf="salvar"]');
  await app.waitFor(() => /Cadastro salvo/.test(app.$('#pfok').textContent), 3000, 'salvou');
  assert.deepEqual([db.docs['profiles/uid1'].nome, db.docs['profiles/uid1'].nascimento, db.docs['profiles/uid1'].profissao], ['Carlos Eduardo Silva', '1985-03-20', 'Analista']);
  assert.equal(db.docs['profiles/uid1'].email, EMAIL);
  assert.match(app.$('.userchip').textContent, /Carlos/, 'o topo mostra o primeiro nome');
  assert.match(app.$('#notice').textContent, /escolher onde guardar/, 'ainda falta escolher o armazenamento');
  // escolher "nuvem" explicitamente encerra a pendência
  app.click('input[name=stg][value=cloud]'); app.$('input[name=stg][value=cloud]').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'janela de escolha'); app.choose('enviar');
  await app.waitFor(() => db.docs['profiles/uid1'].storage === 'cloud', 3000, 'escolha salva');
  assert.equal(app.$('#notice').textContent.trim(), '', 'aviso sumiu');
  app.close();
});

test('lembrete do cadastro: aparece nos 3 primeiros acessos e depois para de insistir', async () => {
  const db = createDb(); let app = abrir(db); await criarConta(app);
  assert.match(app.$('#notice').textContent, /Complete seu cadastro/);                       // acesso 1
  assert.equal(db.docs['profiles/uid1'].lembretes, 1);
  for (const n of [2, 3]) {
    app.click('[data-logout]'); await app.waitFor(() => app.$('#lf') && app.ev('user') === null, 3000, 'saiu');
    await entrar(app); assert.match(app.$('#notice').textContent, /Complete seu cadastro/, `acesso ${n}`);
  }
  app.click('[data-logout]'); await app.waitFor(() => app.$('#lf') && app.ev('user') === null, 3000, 'saiu');
  await entrar(app);                                                                          // acesso 4
  assert.equal(app.$('#notice').textContent.trim(), '', 'não insiste mais');
  app.close();
});

test('foto de perfil: aparece no topo e é salva no cadastro; dá para remover', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  app.click('.userchip');
  assert.ok(app.$('.userchip span.avatar'), 'sem foto: mostra a inicial');
  app.ev("Photo.fromFile=async()=>'data:image/jpeg;base64,/9j/AAAA'");
  app.chooseFile('#pff', '', 'eu.jpg');
  await app.waitFor(() => app.$('.userchip img.avatar'), 3000, 'foto no topo');
  assert.equal(db.docs['profiles/uid1'].foto, 'data:image/jpeg;base64,/9j/AAAA');
  assert.ok(app.$('[data-pf="foto-remover"]'));
  app.click('[data-pf="foto-remover"]');
  await app.waitFor(() => app.$('.userchip span.avatar'), 3000, 'foto removida');
  assert.equal(db.docs['profiles/uid1'].foto, '');
  app.close();
});

test('trocar senha: validações, erro da senha atual e sucesso (a nova passa a valer)', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  app.click('.userchip');
  const tentar = async (a, n, c) => { app.type('#pwa', a); app.type('#pwn', n); app.type('#pwc', c); app.click('[data-pw="trocar"]'); await app.sleep(40); return app.$('#pwerr').textContent + '|' + app.$('#pwok').textContent; };
  assert.match(await tentar('', 'novasenha', 'novasenha'), /senha atual/);
  assert.match(await tentar(SENHA, '123', '123'), /ao menos 6/);
  assert.match(await tentar(SENHA, 'novasenha', 'outra'), /não confere/);
  assert.match(await tentar(SENHA, SENHA, SENHA), /diferente/);
  assert.match(await tentar('errada1', 'novasenha', 'novasenha'), /senha atual está incorreta/);
  assert.match(await tentar(SENHA, 'novasenha', 'novasenha'), /Senha alterada/);
  assert.equal(db.users[EMAIL].pw, 'novasenha');
  assert.equal(app.$('#pwa').value, '', 'campos limpos');
  app.close();
});

test('PRIVACIDADE — escolher "só neste aparelho": cria a cópia, apaga a nuvem se pedido e NUNCA mais grava lançamentos no banco', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  lancar(app, '12345', 'antes');
  await app.ev('backend.flush()');
  assert.ok(db.docs['users/uid1/meta/main'] && Object.keys(db.docs).some(k => k.includes('/years/')), 'antes: dados na nuvem');
  app.click('.userchip');
  app.click('input[name=stg][value=local]'); app.$('input[name=stg][value=local]').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'janela de escolha');
  assert.match(app.$('#dlg4').textContent, /deixam de ser enviados para a nuvem/);
  app.choose('apagar');
  await app.waitFor(() => db.docs['profiles/uid1'].storage === 'local', 3000, 'escolha salva');
  await app.waitFor(() => !Object.keys(db.docs).some(k => k.startsWith('users/')), 3000, 'dados da nuvem apagados');
  const copia = app.w.localStorage.getItem('orc-device-uid1');
  assert.ok(copia, 'cópia no aparelho criada');
  assert.ok(JSON.parse(copia).csv.includes('antes'), 'a cópia tem os lançamentos');
  // a partir daqui: lançar e salvar não pode tocar em nada de users/ no banco
  const antes = db.dataWrites.length;
  lancar(app, '99900', 'depois do aparelho'); await app.ev('backend.flush()'); await app.sleep(50);
  assert.equal(db.dataWrites.length, antes, 'NENHUM lançamento foi para o banco');
  assert.ok(!Object.keys(db.docs).some(k => k.startsWith('users/')), 'nada em users/ no banco');
  assert.ok(JSON.parse(app.w.localStorage.getItem('orc-device-uid1')).csv.includes('depois do aparelho'), 'mas ficou salvo no aparelho');
  assert.ok(!JSON.stringify(db.docs).includes('depois do aparelho'), 'o texto lançado não aparece em lugar nenhum do banco');
  assert.match(app.$('.userchip').title, /cadastro/i);
  app.close();
});

test('PRIVACIDADE — entrar em OUTRO aparelho nunca puxa dados da nuvem; mostra o aviso com o passo a passo', async () => {
  const db = createDb(); const a = abrir(db); await criarConta(a);
  lancar(a, '7700', 'segredo'); await a.ev('backend.flush()');
  a.click('.userchip'); a.click('input[name=stg][value=local]'); a.$('input[name=stg][value=local]').dispatchEvent(new a.w.Event('change', { bubbles: true }));
  await a.waitFor(() => a.$('#dlg4').hasAttribute('open'), 2000, 'janela'); a.choose('manter');   // mantém a cópia antiga na nuvem
  await a.waitFor(() => db.docs['profiles/uid1'].storage === 'local', 3000, 'escolha salva');
  assert.ok(db.docs['users/uid1/meta/main'], 'a cópia antiga foi mantida na nuvem (por escolha)');
  const storageA = a.snapshotStorage(); a.close();
  // outro aparelho: armazenamento do navegador vazio e sem sessão aberta
  db.current = null;
  const b = abrir(db); await entrar(b);
  assert.equal(b.ev('Object.keys(S.data).length'), 0, 'NÃO carregou nada da nuvem, mesmo existindo uma cópia antiga lá');
  assert.match(b.$('#notice').textContent, /Não encontramos seus dados neste aparelho/);
  assert.match(b.$('#notice').textContent, /Ajustes/); assert.match(b.$('#notice').textContent, /Carregar arquivo \(\.csv\)/);
  assert.ok(!JSON.stringify(b.ev('S.data')).includes('segredo'));
  // mesmo aparelho de antes: carrega a cópia local sozinho
  db.current = null;
  const c = abrir(db, { storage: storageA }); await entrar(c);
  assert.doesNotMatch(c.$('#notice').textContent, /Não encontramos/, 'sem o aviso de arquivo não encontrado');
  assert.ok(JSON.stringify(c.ev('S.data')).includes('segredo'), 'carregou a cópia deste aparelho');
  // o botão do aviso leva a Ajustes, onde se carrega o arquivo
  b.click('[data-na="ajustes"]'); assert.equal(b.ev('tab'), 'aj');
  const csv = c.ev('csvFileText(S)');
  b.chooseFile('#csvin', csv, 'meu-orcamento.csv');
  await b.waitFor(() => b.$('#dlg4').hasAttribute('open'), 2000, 'janela do arquivo'); b.choose('substituir');
  await b.waitFor(() => JSON.stringify(b.ev('S.data')).includes('segredo'), 3000, 'arquivo carregado');
  await b.ev('backend.flush()');
  assert.ok(JSON.parse(b.w.localStorage.getItem('orc-device-uid1')).csv.includes('segredo'), 'e passou a ficar salvo neste aparelho');
  b.close(); c.close();
});

test('voltar para a nuvem: envia os dados, avisa e atualiza o cadastro', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  app.click('.userchip'); app.click('input[name=stg][value=local]'); app.$('input[name=stg][value=local]').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'janela'); app.choose('apagar');
  await app.waitFor(() => db.docs['profiles/uid1'].storage === 'local', 3000, 'local');
  lancar(app, '1000', 'volta'); await app.ev('backend.flush()');
  assert.ok(!Object.keys(db.docs).some(k => k.startsWith('users/')));
  app.click('.userchip'); app.click('input[name=stg][value=cloud]'); app.$('input[name=stg][value=cloud]').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'janela'); assert.match(app.$('#dlg4').textContent, /administrador/); app.choose('enviar');
  await app.waitFor(() => db.docs['profiles/uid1'].storage === 'cloud' && Object.keys(db.docs).some(k => k.includes('/years/')), 3000, 'enviado');
  assert.ok(JSON.stringify(db.docs).includes('volta'), 'os lançamentos chegaram à nuvem');
  app.close();
});

test('arquivo no computador: grava a cada mudança e NÃO sobrescreve o arquivo antes de lê-lo', async () => {
  const db = createDb(), h = fakeHandle();
  const a = openApp({ html, setup: w => { install(w, db); w.showSaveFilePicker = async () => h; } }); await criarConta(a);
  a.click('.userchip'); a.click('input[name=stg][value=local]'); a.$('input[name=stg][value=local]').dispatchEvent(new a.w.Event('change', { bubbles: true }));
  await a.waitFor(() => a.$('#dlg4').hasAttribute('open'), 2000, 'janela'); a.choose('apagar');
  await a.waitFor(() => h.writes > 0, 3000, 'arquivo gravado');
  assert.ok(h.content.startsWith('﻿Meu Orçamento;'), 'o arquivo é o CSV');
  lancar(a, '4200', 'no arquivo'); await a.ev('backend.flush()');
  assert.ok(h.content.includes('no arquivo'), 'cada mudança vai para o arquivo');
  assert.match(a.$('#toast').textContent, /Salvo no arquivo/);
  const storage = a.snapshotStorage(); a.close();

  // abriu de novo no mesmo computador: o navegador voltou a pedir permissão -> o app usa a cópia, mas NÃO escreve no arquivo ainda
  h.perm = 'prompt'; const antes = h.content, escritas = h.writes; db.current = null;
  const c = openApp({ html, storage, setup: w => { install(w, db); w.showSaveFilePicker = async () => h; w.__h = h; } });
  c.w.eval("DeviceStore.handles.set('uid1', window.__h)");
  await entrar(c);
  assert.match(c.$('#notice').textContent, /autorização/, 'pede permissão');
  lancar(c, '1', 'teste-aviso'); await c.ev('backend.flush()'); await c.sleep(20);
  assert.match(c.$('#notice').textContent, /autorização/, 'o aviso continua sendo o de permissão depois de uma gravação');
  assert.ok(JSON.stringify(c.ev('S.data')).includes('no arquivo'), 'enquanto isso usa a cópia deste aparelho');
  lancar(c, '100', 'sem permissao'); await c.ev('backend.flush()'); await c.sleep(30);
  assert.equal(h.writes, escritas, 'NÃO gravou no arquivo sem permissão');
  assert.equal(h.content, antes);
  // autorizar: lê o arquivo de verdade e só então libera a gravação
  c.click('[data-na="autorizar"]');
  await c.waitFor(() => h.content.includes('sem permissao'), 3000, 'arquivo atualizado');
  await c.waitFor(() => !/autorização/.test(c.$('#notice').textContent), 3000, 'aviso some');
  assert.ok(JSON.stringify(c.ev('S.data')).includes('no arquivo') && JSON.stringify(c.ev('S.data')).includes('sem permissao'), 'a cópia deste aparelho era mais nova: nada do que foi digitado se perdeu');
  assert.ok(h.content.includes('no arquivo') && h.content.includes('sem permissao'), 'e o arquivo foi atualizado com tudo, assim que a permissão veio');
  lancar(c, '300', 'depois de autorizar'); await c.ev('backend.flush()');
  assert.ok(h.content.includes('depois de autorizar') && h.content.includes('no arquivo'), 'agora grava no arquivo, sem perder o que já havia');
  c.close();
});

test('Ajustes: baixar CSV e carregar de volta (substituir ou juntar)', async () => {
  const db = createDb(); const app = abrir(db); await criarConta(app);
  const { c } = lancar(app, '2500', 'um');
  app.click('[data-tab="aj"]');
  assert.ok(app.$('#csv') && app.$('#csvin'), 'botões de baixar e carregar CSV');
  const csv = app.ev('csvFileText(S)');
  assert.ok(csv.includes('um') && csv.startsWith('﻿Meu Orçamento;'));
  lancar(app, '100', 'dois');                                         // muda depois do "arquivo"
  app.click('[data-tab="aj"]');
  app.chooseFile('#csvin', csv);
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'janela'); app.choose('substituir');
  await app.waitFor(() => !JSON.stringify(app.ev('S.data')).includes('dois'), 3000, 'substituiu');
  assert.ok(JSON.stringify(app.ev('S.data')).includes('"um"'));
  app.click('[data-tab="aj"]');
  app.chooseFile('#csvin', 'isto não é um arquivo nosso');
  await app.sleep(50);                                               // alert() do teste não faz nada; o app não pode quebrar
  assert.ok(JSON.stringify(app.ev('S.data')).includes('"um"'), 'arquivo errado não mexe nos dados');
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});
