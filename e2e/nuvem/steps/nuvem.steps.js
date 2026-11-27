const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const ui = require('../../support/ui');
const banco = require('../support/banco');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const emailNovo = () => `pessoa${Date.now()}${Math.floor(Math.random() * 1e6)}@exemplo.com`;
const uidDe = page => page.evaluate(() => backend.uid);
/* tenta gravar/ler direto pelo SDK do Firebase (como um atacante com o login de uma conta faria) e devolve o código do erro do banco, ou "ok" */
const tentar = (page, codigo, arg) => page.evaluate(async ([cod, a]) => {
  try { await new Function('firebase', 'a', `return (async()=>{${cod}})()`)(firebase, a); return 'ok'; } catch (e) { return e.code || String(e.message); }
}, [codigo, arg]);

/* ---------- conta e lançamentos ---------- */
Given('que criei uma conta na nuvem', async ({ page, mem }) => {
  mem.email = emailNovo(); mem.pessoas = {};
  await ui.criarConta(page, mem.email);
  mem.uid = await uidDe(page);
});
Given('que criei uma conta na nuvem chamada {string}', async ({ page, mem }, apelido) => {
  const email = emailNovo(); mem.pessoas ??= {};
  await ui.criarConta(page, email);
  mem.pessoas[apelido] = { email, uid: await uidDe(page) };
  mem.email = email; mem.uid = mem.pessoas[apelido].uid;           // a conta "atual" é a última criada
});
When('lanço {string} de {string} na categoria {string}', async ({ page }, desc, valor, cat) => {
  await ui.novoLancamento(page, desc, valor, 15, cat);
  await page.evaluate(() => backend.flush());          // espera o que está pendente chegar ao banco
});
Then('o banco guarda o lançamento {string} desta conta', async ({ mem }, desc) => {
  const anos = await banco.listar(`users/${mem.uid}/years`);
  expect(anos.map(d => banco.campo(d, 'json')).join(' ')).toContain(desc);
});
Then('o lançamento {string} está na lista de lançamentos do mês', async ({ page }, desc) => {
  await ui.irPara(page, 'mês'); await ui.alternarVisao(page, 'lanc');
  await expect(page.locator('.lrow', { hasText: desc })).toHaveCount(1);
});
Then('vejo a tela principal do app', async ({ page }) => { await expect(page.locator('#nav [data-tab="mes"]')).toBeVisible(); });
When('recarrego a página', async ({ page }) => { await page.reload(); await expect(page.locator('#nav')).toBeVisible(); });
When('saio do app pelo menu', async ({ page }) => {
  await page.click('[data-umenu]'); await page.locator('.umenu-list').getByRole('menuitem', { name: /Sair/ }).click();
  await expect(page.locator('#lf')).toBeVisible();
});
When('entro de novo com a mesma conta', async ({ page, mem }) => {
  await page.fill('#lem', mem.email); await page.fill('#lpw', ui.SENHA); await page.click('#lf button');
  await expect(page.locator('#nav')).toBeVisible();
});
When('tento entrar com a senha errada', async ({ page, mem }) => {
  await page.fill('#lem', mem.email); await page.fill('#lpw', 'SenhaErrada#999'); await page.click('#lf button');
});
Then('vejo a mensagem de erro de login e continuo fora do app', async ({ page }) => {
  await expect(page.locator('#lf .err, #lf [role=alert]').first()).not.toBeEmpty();
  await expect(page.locator('#nav [data-tab="mes"]')).toHaveCount(0);
});
When('entro com a mesma conta num aparelho novo', async ({ novoAparelho, mem }) => {
  const outra = await novoAparelho();
  await ui.abrirApp(outra);
  await outra.fill('#lem', mem.email); await outra.fill('#lpw', ui.SENHA); await outra.click('#lf button');
  await expect(outra.locator('#nav')).toBeVisible();
  const agoraNao = outra.getByRole('button', { name: 'Agora não' }); if (await agoraNao.isVisible()) await agoraNao.click();
  mem.aparelho2 = outra;
});
Then('no aparelho novo o lançamento {string} aparece, porque veio do banco', async ({ mem }, desc) => {
  await ui.irPara(mem.aparelho2, 'mês'); await ui.alternarVisao(mem.aparelho2, 'lanc');
  await expect(mem.aparelho2.locator('.lrow', { hasText: desc })).toHaveCount(1);
});

/* ---------- cadastro e foto ---------- */
When('salvo o cadastro com nome {string} e uma foto', async ({ page }, nome) => {
  await page.click('[data-umenu]'); await page.locator('.umenu-list').getByRole('menuitem', { name: /Meu cadastro/ }).click();
  await page.fill('#pfn', nome); await page.fill('#pfb', '1990-05-01'); await page.fill('#pfp', 'Contadora');
  await page.setInputFiles('#pff', { name: 'foto.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('.userchip img.avatar')).toBeVisible();
  await page.click('[data-pf="salvar"]'); await expect(page.locator('#pfok')).toContainText('Cadastro salvo');
});
Then('o banco guarda a foto como imagem em base64', async ({ mem }) => {
  const doc = await banco.lerDoc(`profiles/${mem.uid}`);
  expect(banco.campo(doc, 'foto')).toMatch(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/);
  expect(banco.campo(doc, 'nome')).toBe('Ana Teste');
});
Then('a foto continua no topo depois de recarregar', async ({ page }) => {
  await page.reload(); await expect(page.locator('.userchip img.avatar')).toBeVisible();
});
When('tento gravar direto no banco um cadastro cuja foto é {string}', async ({ page, mem }, foto) => {
  mem.resultado = await tentar(page, `
    const uid=firebase.auth().currentUser.uid, email=firebase.auth().currentUser.email;
    await firebase.firestore().doc('profiles/'+uid).set({email:email,nome:'X',nascimento:'',profissao:'',foto:a,storage:'cloud',lembretes:0});`, foto);
});
Then('o banco recusa por falta de permissão', async ({ mem }) => { expect(mem.resultado).toBe('permission-denied'); });

/* ---------- isolamento entre pessoas e administrador ---------- */
When('entro na conta de {string}', async ({ page, mem }, apelido) => {
  const p = mem.pessoas[apelido]; mem.email = p.email; mem.uid = p.uid;
  await page.fill('#lem', p.email); await page.fill('#lpw', ui.SENHA); await page.click('#lf button');
  await expect(page.locator('#nav')).toBeVisible();
});
When('tento ler direto no banco os dados de {string}', async ({ page, mem }, apelido) => {
  mem.resultado = await tentar(page, `await firebase.firestore().doc('users/'+a+'/meta/main').get();`, mem.pessoas[apelido].uid);
});
When('tento ler direto no banco o cadastro de {string}', async ({ page, mem }, apelido) => {
  mem.resultado = await tentar(page, `await firebase.firestore().doc('profiles/'+a).get();`, mem.pessoas[apelido].uid);
});
When('tento gravar direto no banco um lançamento na conta de {string}', async ({ page, mem }, apelido) => {
  mem.resultado = await tentar(page, `await firebase.firestore().doc('users/'+a+'/years/2026').set({json:'{"invadido":true}'});`, mem.pessoas[apelido].uid);
});
When('tento me tornar administrador gravando direto no banco', async ({ page, mem }) => {
  mem.resultado = await tentar(page, `await firebase.firestore().doc('admins/'+firebase.auth().currentUser.uid).set({ativo:true});`);
});
Then('o banco não tem o lançamento invadido na conta de {string}', async ({ mem }, apelido) => {
  const anos = await banco.listar(`users/${mem.pessoas[apelido].uid}/years`);
  expect(anos.map(d => banco.campo(d, 'json')).join(' ')).not.toContain('invadido');
});
Given('que esta conta foi registrada como administradora no banco', async ({ page, mem }) => {
  await banco.virarAdministrador(mem.uid);
  await page.reload(); await expect(page.locator('#nav')).toBeVisible();      // o app descobre que é administrador ao entrar
});
When('abro a lista de usuários pelo menu', async ({ page }) => {
  await page.click('[data-umenu]'); await page.locator('.umenu-list').getByRole('menuitem', { name: /Usuários/ }).click();
  await expect(page.locator('.urow').first()).toBeVisible();
});
Then('a lista de usuários mostra a conta de {string}', async ({ page, mem }, apelido) => {
  await expect(page.locator('.urow', { hasText: mem.pessoas[apelido].email })).toHaveCount(1);
});
When('abro os dados de {string}', async ({ page, mem }, apelido) => {
  await page.locator(`[data-adm-user="${mem.pessoas[apelido].uid}"]`).click();
  await expect(page.locator('.robar')).toContainText('somente leitura');
});
Then('vejo o lançamento {string} em modo somente leitura', async ({ page }, desc) => {
  await ui.irPara(page, 'mês'); await ui.alternarVisao(page, 'lanc');
  await expect(page.locator('.lrow', { hasText: desc })).toHaveCount(1);
  await expect(page.locator('[data-lnew]')).toBeDisabled();
});
Then('o menu do usuário não tem a opção Usuários', async ({ page }) => {
  await page.click('[data-umenu]');
  await expect(page.locator('.umenu-list').getByRole('menuitem', { name: /Usuários/ })).toHaveCount(0);
});

/* ---------- endereço do porteiro ---------- */
When('informo o endereço do porteiro {string} em Buscar do banco', async ({ page }, url) => {
  await ui.irPara(page, 'ajustes'); await page.click('[data-bank]');
  await expect(page.locator('#bkurl')).toBeVisible();
  await page.fill('#bkurl', url); await page.locator('#bkurl').dispatchEvent('change');
});
Then('o banco guarda o endereço do porteiro {string} na nuvem desta conta', async ({ mem }, url) => {
  await expect.poll(async () => { const d = await banco.lerDoc(`users/${mem.uid}/config/banco`); return banco.campo(d, 'json'); }).toContain(url);
});
When('abro Buscar do banco no aparelho novo', async ({ mem }) => {
  await ui.irPara(mem.aparelho2, 'ajustes'); await mem.aparelho2.click('[data-bank]');
});
Then('o campo do endereço do porteiro já vem preenchido com {string}', async ({ mem }, url) => {
  await expect(mem.aparelho2.locator('#bkurl')).toHaveValue(url);
});
