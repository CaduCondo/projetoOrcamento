const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { abrirApp, abrirLogada, criarConta, irPara, SENHA } = require('../support/ui');

Given('que tenho uma conta nova e vazia', async ({ page }) => { await abrirLogada(page); });
Given('que criei a conta {string}', async ({ page }, email) => { await criarConta(page, email); });
Given('que estou na aba {string}', async ({ page }, aba) => { await irPara(page, aba); });
When('vou para a aba {string}', async ({ page }, aba) => { await irPara(page, aba); });
When('recarrego a página', async ({ page }) => { await page.reload(); });
When('saio do app', async ({ page }) => { await page.getByRole('button', { name: 'Sair' }).click(); await expect(page.locator('#lf')).toBeVisible(); });
When('tento entrar com {string} e a senha {string}', async ({ page }, email, senha) => {
  await page.fill('#lem', email); await page.fill('#lpw', senha); await page.click('#lf button');
});
When('entro com {string} e a senha correta', async ({ page }, email) => {
  await page.fill('#lem', email); await page.fill('#lpw', SENHA); await page.click('#lf button');
});
Then('vejo o e-mail {string} no topo do app', async ({ page }, email) => { await expect(page.locator('#hr')).toContainText(email); });
Then('vejo a mensagem de erro de login', async ({ page }) => { await expect(page.locator('#lf .err, #lf [role=alert]').first()).not.toBeEmpty(); });
Then('não vejo o app aberto', async ({ page }) => { await expect(page.locator('#nav [data-tab="mes"]')).toHaveCount(0); await expect(page.locator('#lf')).toBeVisible(); });
