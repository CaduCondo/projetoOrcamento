const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { irPara, alternarVisao, novoLancamento, escolherCategoria, ligar } = require('../support/ui');

When('crio o lançamento {string} de {string} no dia {int} na categoria {string}', async ({ page }, d, v, dia, c) => { await novoLancamento(page, d, v, dia, c); });
When('crio o lançamento {string} de {string} no dia {int} na categoria {string} pago em dinheiro', async ({ page }, d, v, dia, c) => { await novoLancamento(page, d, v, dia, c, true); });
When('busco por {string} nos lançamentos', async ({ page }, texto) => { await page.fill('#lq', texto); });
When('clico na tag {string}', async ({ page }, tag) => { await page.locator('.tagb', { hasText: tag }).click(); });
When('abro o lançamento {string}', async ({ page }, desc) => { await irPara(page, 'mês'); await alternarVisao(page, 'lanc'); await page.locator('.lrow', { hasText: desc }).click(); await expect(page.locator('#lf2')).toBeVisible(); });
When('escolho a categoria {string} e peço para lembrar', async ({ page }, cat) => {
  await escolherCategoria(page, 'lic', cat);
  await ligar(page, '#lir');
  await page.locator('#lf2').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('#dlg3')).not.toBeVisible();
});
Then('a lista mostra só {int} lançamento(s)', async ({ page }, n) => { await expect(page.locator('.lrow')).toHaveCount(n); });
Then('a página Categorias mostra a automação {string} para {string}', async ({ page }, texto, cat) => {
  await irPara(page, 'categorias');
  const regra = page.locator('.arow', { hasText: texto });
  await expect(regra).toHaveCount(1); await expect(regra).toContainText(cat);
});
