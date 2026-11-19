const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { irPara, digitarValor } = require('../support/ui');

const TIPO = { Despesas: 'pagar', Receitas: 'receber' };
const linhaMes = (page, nome) => page.locator('tr[data-cat]').filter({ has: page.locator('td:nth-child(2)', { hasText: nome }) });
const semZero = /(^|[^\d.,])0,00/;

async function irParaMes(page, mes) {
  await irPara(page, 'mês');
  if (mes) await page.locator('.chips .chip', { hasText: new RegExp('^' + mes + '$') }).click();
}
/* inclui a categoria no mês (se ela ainda não aparece), procurando primeiro em Despesas e depois em Receitas */
async function incluirNoMes(page, nome, tipo) {
  if (await linhaMes(page, nome).count()) return;
  for (const t of tipo ? [tipo] : ['pagar', 'receber']) {
    await page.click(`[data-usecat="${t}"]`);
    await expect(page.locator('#ufq')).toBeFocused();
    await page.fill('#ufq', nome);
    const opcao = page.locator('[data-upick]', { hasText: nome }).first();
    if (await opcao.count()) { await opcao.click(); await expect(linhaMes(page, nome)).toHaveCount(1); return; }
    await page.locator('#uf [data-cclose]').first().click();
  }
  throw new Error(`Não achei a categoria "${nome}" para incluir no mês`);
}
async function lancar(page, nome, desc, valor, pago) {
  await linhaMes(page, nome).locator('.val').click();
  await expect(page.locator('#dlg')).toBeVisible();
  await expect(page.locator('#nv')).toBeFocused();            // espera o app terminar de focar o valor (senão o texto pode cair no campo errado)
  await page.fill('#nd', desc); await digitarValor(page.locator('#nv'), valor);
  await page.locator('#nk').setChecked(pago);
  await page.click('[data-add]');
  await expect(page.locator(`#dlg input[data-id][value="${desc}"]`)).toHaveCount(1);
  await page.click('#dlg [data-close]'); await expect(page.locator('#dlg')).not.toBeVisible();
}

Given('que lancei {string} de {string} na categoria {string} no mês de {string}', async ({ page }, desc, valor, nome, mes) => {
  await irParaMes(page, mes); await incluirNoMes(page, nome); await lancar(page, nome, desc, valor, true);
});
When('incluo a categoria {string} nas {string} do mês atual', async ({ page }, nome, grupo) => { await irParaMes(page); await incluirNoMes(page, nome, TIPO[grupo]); });
When('lanço {string} de {string} na categoria {string} como já pago', async ({ page }, desc, valor, nome) => { await lancar(page, nome, desc, valor, true); });
When('lanço {string} de {string} na categoria {string} como apenas previsto', async ({ page }, desc, valor, nome) => { await lancar(page, nome, desc, valor, false); });
When('abro a categoria {string} do mês', async ({ page }, nome) => { await irParaMes(page); await linhaMes(page, nome).locator('.val').click(); await expect(page.locator('#dlg')).toBeVisible(); });
When('clico para apagar o item {string}', async ({ page }, desc) => { await page.locator('#dlg .item').filter({ has: page.locator(`input[data-id][value="${desc}"]`) }).locator('[data-del]').click(); await expect(page.locator('#dlg4')).toBeVisible(); });
When('cancelo a confirmação', async ({ page }) => { await page.locator('#dlg4 [data-ch=""]').click(); await expect(page.locator('#dlg4')).not.toBeVisible(); });
When('confirmo a exclusão do item', async ({ page }) => { await page.locator('#dlg4 [data-ch="sim"]').click(); await expect(page.locator('#dlg4')).not.toBeVisible(); });
When('anoto um saldo guardado de {string} com {string} no Patrimônio', async ({ page }, nome, valor) => {
  await irPara(page, 'patrimônio'); await page.click('[data-la="saldos"]');
  await page.locator('[data-ln^="saldos|"]').last().fill(nome);
  await digitarValor(page.locator('[data-lv^="saldos|"]').last(), valor); await page.keyboard.press('Tab');
  await expect(page.locator('#cartp')).toBeVisible();
});

Then('o total pago de {string} mostra {string}', async ({ page }, grupo, valor) => {
  await irParaMes(page);
  const total = page.locator(`.pm.${TIPO[grupo]} tfoot .n`);
  if (valor === '0,00') await expect(total).toContainText(semZero); else await expect(total).toContainText(valor);
});
Then('a categoria {string} mostra o valor {string} na tabela do mês', async ({ page }, nome, valor) => { await expect(linhaMes(page, nome).locator('td.n .val')).toContainText(valor); });
Then('a categoria {string} mostra o previsto {string} na tabela do mês', async ({ page }, nome, valor) => { await expect(linhaMes(page, nome).locator('td.n')).toContainText(new RegExp('previsto\\s*-?R\\$\\s*' + valor.replace(/\./g, '\\.'))); });
Then('o item {string} continua na janela da categoria', async ({ page }, desc) => { await expect(page.locator(`#dlg input[data-id][value="${desc}"]`)).toHaveCount(1); });
Then('a janela da categoria não tem mais itens', async ({ page }) => { await expect(page.locator('#dlg .item input[data-id]')).toHaveCount(0); await expect(page.locator('#dlg')).toContainText('Nenhum item ainda'); await page.click('#dlg [data-close]'); });
Then('o resumo do mês mostra {string} com {string}', async ({ page }, rotulo, valor) => { await irParaMes(page); await expect(page.locator('.resumo .rb', { hasText: rotulo })).toContainText(valor); });

When('abro a categoria {string} do mês de {string}', async ({ page }, nome, mes) => { await irParaMes(page, mes); await linhaMes(page, nome).locator('.val').click(); await expect(page.locator('#dlg')).toBeVisible(); });
Then('no mês de {string} a categoria {string} mostra o valor {string}', async ({ page }, mes, nome, valor) => { await irParaMes(page, mes); await expect(linhaMes(page, nome).locator('td.n .val')).toContainText(valor); });
