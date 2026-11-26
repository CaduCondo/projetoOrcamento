const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);

const botaoMenu = page => page.locator('[data-umenu]');
const listaMenu = page => page.locator('.umenu-list');

Then('o menu do usuário está fechado', async ({ page }) => {
  await expect(listaMenu(page)).toBeHidden();
  await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'false');
});
Then('o menu do usuário está fechado e {string} e {string} não aparecem soltos no topo', async ({ page }, a, b) => {
  await expect(listaMenu(page)).toBeHidden();
  for (const nome of [a, b]) await expect(page.locator('#hr').getByRole('button', { name: nome })).toBeHidden();
  await expect(botaoMenu(page)).toBeVisible();
});
When('abro o menu do usuário', async ({ page }) => {
  await botaoMenu(page).click();
  await expect(listaMenu(page)).toBeVisible();
  await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'true');
});
When('aperto a tecla Esc', async ({ page }) => { await page.keyboard.press('Escape'); });
When('toco fora do menu', async ({ page }) => { await page.locator('h1').click(); });
When('toco de novo na foto e no nome', async ({ page }) => { await botaoMenu(page).click(); });
When('escolho {string} no menu', async ({ page }, nome) => { await listaMenu(page).getByRole('menuitem', { name: new RegExp(nome) }).click(); });
Then('o menu mostra as opções {string}, {string} e {string} e não mostra {string}', async ({ page }, a, b, c, fora) => {
  const itens = listaMenu(page).getByRole('menuitem');
  await expect(itens).toHaveCount(3);
  for (const [i, nome] of [a, b, c].entries()) await expect(itens.nth(i)).toContainText(nome);
  await expect(listaMenu(page).getByRole('menuitem', { name: new RegExp(fora) })).toHaveCount(0);
});
Then('vejo a tela de cadastro', async ({ page }) => { await expect(page.locator('#pfn')).toBeVisible(); await expect(page.locator('#pfe')).toBeVisible(); });
Then('vejo a explicação guiada da tela', async ({ page }) => {
  await expect(page.locator('#tour .tour-tip')).toBeVisible();
  await expect(page.locator('#tour #tourt')).not.toBeEmpty();
});
Then('vejo a tela de entrada do app', async ({ page }) => { await expect(page.locator('#lf')).toBeVisible(); await expect(page.locator('#nav [data-tab="mes"]')).toHaveCount(0); });
Then('o ano, o botão {string} e a foto estão na mesma linha do topo', async ({ page }, ano) => {
  const caixas = await Promise.all(['#ysel', '[data-addyear]', '[data-umenu]'].map(s => page.locator(s).boundingBox()));
  const centros = caixas.map(c => c.y + c.height / 2);
  expect(Math.max(...centros) - Math.min(...centros), 'ano, "' + ano + '" e foto/nome na mesma linha').toBeLessThan(12);
});
Then('o nome ao lado da foto aparece: {word}', async ({ page }, sim) => {
  const nome = page.locator('[data-umenu] .uname');
  if (sim === 'sim') await expect(nome).toBeVisible(); else await expect(nome).toBeHidden();   // telas médias mostram só foto e seta (falta espaço)
});
Then('todas as opções do menu aparecem inteiras dentro da tela com pelo menos {int} pixels de altura', async ({ page }, minimo) => {
  const { width, height } = page.viewportSize();
  const itens = listaMenu(page).getByRole('menuitem');
  const n = await itens.count(); expect(n).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < n; i++) {
    const c = await itens.nth(i).boundingBox();
    expect(c.height, `opção ${i + 1} pequena demais para tocar`).toBeGreaterThanOrEqual(minimo);
    expect(c.x, `opção ${i + 1} sai pela esquerda`).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width, `opção ${i + 1} sai pela direita`).toBeLessThanOrEqual(width);
    expect(c.y + c.height, `opção ${i + 1} sai por baixo`).toBeLessThanOrEqual(height);
  }
});
