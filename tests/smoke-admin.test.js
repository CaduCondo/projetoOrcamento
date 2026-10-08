const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp } = require('./helpers/app');
const { createDb, install } = require('./helpers/firebase-mock');

const html = buildHtml('prod');
const SENHA = 'Segredo#123';
const abrir = db => openApp({ html, setup: w => install(w, db) });

async function criarConta(app, email) {
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  app.click('[data-lm="up"]'); app.type('#lem', email); app.type('#lpw', SENHA); app.type('#lpw2', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === email && app.ev('S') && app.$('[data-newcat]'), 4000, 'tela carregada');
}
const lancar = (app, digitos, desc) => {
  app.click('[data-tab="mes"]');
  const y = app.ev('selY'), m = app.ev('selM'), c = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.click(`[data-open="${c}|${y}|${m}"]`); app.type('#nv', digitos); app.type('#nd', desc); app.click('[data-add]'); app.click('[data-close]');
};

/* cenário: Ana (nuvem, com dados), Bia (só no aparelho, sem dados no banco) e o administrador (uid2, já registrado como admin) */
async function cenario() {
  const db = createDb();
  const ana = abrir(db); await criarConta(ana, 'ana@exemplo.com');
  ana.click('.userchip'); ana.type('#pfn', 'Ana Souza'); ana.type('#pfb', '1990-05-01'); ana.type('#pfp', 'Contadora'); ana.click('[data-pf="salvar"]');
  await ana.waitFor(() => db.docs['profiles/uid1'].nome === 'Ana Souza', 3000, 'perfil da Ana');
  lancar(ana, '12345', 'segredo-da-ana'); await ana.ev('backend.flush()');
  assert.ok(JSON.stringify(db.docs).includes('segredo-da-ana'));
  ana.close(); db.current = null;
  db.docs['profiles/uid9'] = { email: 'bia@exemplo.com', nome: 'Bia Lima', storage: 'local', lembretes: 0 };      // Bia: só no aparelho
  db.docs['admins/uid2'] = { ativo: true };                                                                         // o administrador (o próximo uid)
  const adm = abrir(db); await criarConta(adm, 'dono@exemplo.com');
  assert.equal(adm.ev('backend.uid'), 'uid2');
  return { db, adm };
}

test('administrador: vê o botão "Usuários"; um usuário comum não vê', async () => {
  const { db, adm } = await cenario();
  assert.ok(adm.$('[data-adm="abrir"]'), 'o administrador tem o botão');
  adm.close(); db.current = null;
  const ana = abrir(db); await ana.waitFor(() => ana.$('#lf'), 3000, 'login');
  ana.type('#lem', 'ana@exemplo.com'); ana.type('#lpw', SENHA); ana.submit('#lf');
  await ana.waitFor(() => ana.ev('user') === 'ana@exemplo.com' && ana.$('[data-newcat]'), 4000, 'Ana entrou');
  assert.equal(ana.$('[data-adm="abrir"]'), null, 'usuário comum não tem o botão');
  assert.equal(ana.ev('backend.isAdmin'), false);
  ana.close();
});

test('lista de usuários: nome (ou e-mail), olho aberto = nuvem, olho riscado = só no aparelho; busca', async () => {
  const { adm } = await cenario();
  adm.click('[data-adm="abrir"]');
  await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista carregada');
  const linhas = adm.$$('.urow');
  assert.deepEqual(linhas.map(r => r.querySelector('b').textContent), ['Ana Souza', 'Bia Lima'], 'mostra o nome, em ordem');
  assert.match(linhas[0].textContent, /ana@exemplo\.com/, 'e o e-mail embaixo');
  assert.ok(linhas[0].querySelector('.eye.on') && !linhas[0].querySelector('.eye.off'), 'Ana: olho aberto (nuvem)');
  assert.ok(linhas[1].querySelector('.eye.off') && !linhas[1].querySelector('.eye.on'), 'Bia: olho riscado (só no aparelho)');
  assert.ok(linhas[1].querySelector('.eye.off svg line'), 'o olho riscado tem o traço atravessado');
  assert.ok(!adm.$$('.urow').some(r => /dono@exemplo/.test(r.textContent)), 'o próprio administrador não aparece na lista');
  adm.type('#admq', 'bia'); assert.equal(adm.$$('.urow').length, 1);
  adm.type('#admq', 'xyz'); assert.equal(adm.$$('.urow').length, 0);
  adm.close();
});

test('usuário que guarda só no aparelho: não abre (não há dados no sistema) e explica', async () => {
  const { adm } = await cenario();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid9"]');
  await adm.waitFor(() => /só no aparelho/.test(adm.$('#admmsg')?.textContent || ''), 3000, 'mensagem');
  assert.equal(adm.ev('readOnly'), false, 'não entrou em modo leitura');
  adm.close();
});

test('SOMENTE LEITURA: vê todos os dados da pessoa, nada é alterável e NADA é gravado no banco', async () => {
  const { db, adm } = await cenario();
  const meusDocsAntes = Object.keys(db.docs).filter(k => k.startsWith('users/uid2')).sort().join();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]');
  await adm.waitFor(() => adm.ev('readOnly') === true && adm.$('.robar'), 3000, 'modo leitura');
  assert.match(adm.$('.robar').textContent, /somente leitura/i);
  assert.match(adm.$('.robar').textContent, /Ana Souza/);
  assert.ok(JSON.stringify(adm.ev('S.data')).includes('segredo-da-ana'), 'vê os lançamentos da Ana');
  // telas: Mês, Ano, Gráficos, Patrimônio, Ajustes e Perfil funcionam
  for (const t of ['ano', 'graf', 'pat', 'aj', 'perfil', 'mes']) { adm.click(`[data-tab="${t}"]`); assert.equal(adm.ev('tab'), t); }
  adm.click('[data-tab="perfil"]');
  assert.equal(adm.$('#pfn').value, 'Ana Souza'); assert.equal(adm.$('#pfe').value, 'ana@exemplo.com'); assert.equal(adm.$('#pfp').value, 'Contadora');
  assert.equal(adm.$('#pfn').disabled, true, 'cadastro dela bloqueado para edição');
  // tudo que altera está desabilitado
  adm.click('[data-tab="mes"]');
  assert.ok(adm.$$('[data-newcat]').every(b => b.disabled), 'botões de nova categoria bloqueados');
  assert.ok(adm.$$('tr[data-cat]').every(r => r.draggable === false), 'não dá para arrastar linhas');
  adm.click('[data-tab="aj"]');
  const mut = adm.$$('#app input:not([type=search]),#app select,#app button').filter(e => !e.matches('[data-tab],[data-m],[data-modo],#per,#ysel,[data-open],[data-close],[data-na],[data-adm],[data-logout]'));
  assert.ok(mut.length > 5 && mut.every(e => e.disabled), 'em Ajustes tudo está bloqueado: ' + mut.filter(e => !e.disabled).map(e => e.outerHTML.slice(0, 60)).join(' | '));
  // a janela de itens abre para olhar, mas sem poder alterar
  adm.click('[data-tab="mes"]');
  const y = adm.ev('selY'), m = adm.ev('selM'), c = adm.ev("S.cats.find(c=>c.nome==='Mercado').id");
  adm.click(`[data-open="${c}|${y}|${m}"]`);
  assert.ok(adm.$('#dlg').hasAttribute('open'));
  assert.ok(adm.$$('#dlg input,#dlg button:not([data-close])').every(e => e.disabled), 'janela de itens toda bloqueada');
  assert.ok(adm.$('#dlg [data-close]') && !adm.$('#dlg [data-close]').disabled, 'só dá para fechar');
  adm.click('[data-close]');
  // mesmo "à força" (código), nada é gravado
  const escritas = db.dataWrites.length, perfis = JSON.stringify(db.docs['profiles/uid1']);
  adm.ev(`ens('${c}',${y},${m}).items.push({v:999,d:'invasor',ok:true});save();backend.save()`);
  await adm.ev('backend.flush()'); await adm.sleep(900);
  assert.equal(db.dataWrites.length, escritas, 'nenhuma gravação em users/ durante a visualização');
  assert.ok(!JSON.stringify(db.docs).includes('invasor'));
  assert.equal(JSON.stringify(db.docs['profiles/uid1']), perfis, 'cadastro intacto');
  assert.equal(Object.keys(db.docs).filter(k => k.startsWith('users/uid2')).sort().join(), meusDocsAntes, 'e nada dela foi parar nos dados do administrador');
  adm.close();
});

test('voltar aos meus dados: o administrador reencontra os próprios dados, intactos e sem mistura', async () => {
  const { db, adm } = await cenario();
  lancar(adm, '5000', 'meu-lancamento'); await adm.ev('backend.flush()');
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]'); await adm.waitFor(() => adm.ev('readOnly') === true, 3000, 'leitura');
  assert.ok(!JSON.stringify(adm.ev('S.data')).includes('meu-lancamento'), 'em leitura vê só os dados da Ana');
  adm.click('[data-adm="sair"]');
  assert.equal(adm.ev('readOnly'), false);
  assert.equal(adm.$('.robar'), null);
  assert.ok(JSON.stringify(adm.ev('S.data')).includes('meu-lancamento'), 'voltou aos próprios dados');
  assert.ok(!JSON.stringify(adm.ev('S.data')).includes('segredo-da-ana'), 'sem nada da Ana misturado');
  lancar(adm, '100', 'depois-de-voltar'); await adm.ev('backend.flush()');
  assert.ok(JSON.stringify(db.docs).includes('depois-de-voltar'), 'volta a poder gravar normalmente');
  const meus = Object.entries(db.docs).filter(([k]) => k.startsWith('users/uid2')).map(([, v]) => v.json).join('');
  assert.ok(!meus.includes('segredo-da-ana'), 'os dados do administrador no banco não têm nada da Ana');
  adm.close();
});

test('o administrador pode sair da conta durante a visualização sem levar dados da pessoa', async () => {
  const { db, adm } = await cenario();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]'); await adm.waitFor(() => adm.ev('readOnly') === true, 3000, 'leitura');
  adm.click('[data-logout]');
  await adm.waitFor(() => adm.$('#lf') && adm.ev('user') === null, 3000, 'saiu');
  assert.equal(adm.ev('readOnly'), false);
  assert.equal(adm.ev('viewing'), null);
  assert.ok(!Object.entries(db.docs).filter(([k]) => k.startsWith('users/uid2')).some(([, v]) => v.json.includes('segredo-da-ana')));
  adm.close();
});
