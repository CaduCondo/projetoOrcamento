const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { irPara } = require('../support/ui');

async function criarCategoria(page, tipo, nome, dia) {
  await irPara(page, 'categorias');
  await page.click(`[data-newcat="${tipo}"]`);
  await expect(page.locator('#cfn')).toBeFocused();
  await page.fill('#cfn', nome);
  if (dia) await page.fill('#cfd', String(dia));
  await page.locator('#cf').getByRole('button', { name: 'Criar' }).click();
  await expect(page.locator('#dlg3')).not.toBeVisible();
}
const linha = (page, nome) => page.locator('#cl [data-cedit]', { hasText: nome });

Given('que criei a categoria de despesa {string} com o dia {int}', async ({ page }, nome, dia) => { await criarCategoria(page, 'pagar', nome, dia); });
Given('que criei a categoria de despesa {string}', async ({ page }, nome) => { await criarCategoria(page, 'pagar', nome); });
Given('que criei a categoria de receita {string}', async ({ page }, nome) => { await criarCategoria(page, 'receber', nome); });
When('crio a categoria de despesa {string} com o dia {int}', async ({ page }, nome, dia) => { await criarCategoria(page, 'pagar', nome, dia); });
When('crio a categoria de despesa {string} com o dia {int} e o ícone {string}', async ({ page }, nome, dia, ico) => {
  await irPara(page, 'categorias'); await page.click('[data-newcat="pagar"]');
  await expect(page.locator('#cfn')).toBeFocused();
  await page.fill('#cfn', nome); await page.fill('#cfd', String(dia)); await page.click(`[data-pico="${ico}"]`);
  await page.locator('#cf').getByRole('button', { name: 'Criar' }).click(); await expect(page.locator('#dlg3')).not.toBeVisible();
});
When('mudo o dia da categoria {string} para {int}', async ({ page }, nome, dia) => {
  await irPara(page, 'categorias'); await linha(page, nome).click();
  await page.fill('#cfd', String(dia)); await page.locator('#cf').getByRole('button', { name: 'Salvar' }).click(); await expect(page.locator('#dlg3')).not.toBeVisible();
});
When('mudo o nome da categoria {string} para {string}', async ({ page }, nome, novo) => {
  await irPara(page, 'categorias'); await linha(page, nome).click();
  await page.fill('#cfn', novo); await page.locator('#cf').getByRole('button', { name: 'Salvar' }).click(); await expect(page.locator('#dlg3')).not.toBeVisible();
});
/* a exclusão de categoria usa a pergunta do próprio navegador (confirm): aqui respondemos e guardamos o texto perguntado */
async function excluir(page, mem, nome, aceitar) {
  await irPara(page, 'categorias'); await linha(page, nome).click();
  page.once('dialog', async d => { mem.pergunta = d.message(); await (aceitar ? d.accept() : d.dismiss()); });
  await page.click('#cf [data-cdel]');
  await expect.poll(() => mem.pergunta, { message: 'o app deveria pedir confirmação antes de excluir' }).toBeTruthy();
}
When('excluo a categoria {string} e confirmo', async ({ page, mem }, nome) => { await excluir(page, mem, nome, true); });
When('excluo a categoria {string} e desisto na confirmação', async ({ page, mem }, nome) => { await excluir(page, mem, nome, false); });
Then('o app perguntou se eu queria mesmo excluir {string}', async ({ mem }, nome) => { expect(mem.pergunta).toContain(`Excluir “${nome}”`); });
Then('a categoria {string} aparece na lista de categorias com o dia {int}', async ({ page }, nome, dia) => {
  await irPara(page, 'categorias'); await expect(linha(page, nome)).toHaveCount(1); await expect(linha(page, nome).locator('.cd')).toHaveText(String(dia));
});
Then('a categoria {string} continua na lista de categorias', async ({ page }, nome) => { await irPara(page, 'categorias'); await expect(linha(page, nome)).toHaveCount(1); });
Then('a categoria {string} aparece só uma vez na lista de categorias', async ({ page }, nome) => { await irPara(page, 'categorias'); await expect(linha(page, nome)).toHaveCount(1); });
Then('a categoria {string} aparece na lista com o ícone {string}', async ({ page }, nome, ico) => { await irPara(page, 'categorias'); await expect(linha(page, nome).locator('.cico')).toContainText(ico); });
Then('a categoria {string} não está mais na lista de categorias', async ({ page }, nome) => { await irPara(page, 'categorias'); await expect(page.locator('#cl')).toBeVisible(); await expect(linha(page, nome)).toHaveCount(0); });
Then('a categoria {string} tem o dia {int}', async ({ page }, nome, dia) => { await irPara(page, 'categorias'); await expect(linha(page, nome).locator('.cd')).toHaveText(String(dia)); });

Then('a lista de categorias não tem uma linha só chamada {string}', async ({ page }, nome) => {
  await irPara(page, 'categorias'); await expect(page.locator('#cl .cn').first()).toBeVisible();
  await expect(page.locator('#cl .cn').filter({ hasText: new RegExp('^' + nome + '$') })).toHaveCount(0);
});
Then('no mês de {string} a categoria {string} também mostra o dia {int} na tela do mês', async ({ page }, mes, nome, dia) => {
  await irPara(page, 'mês');
  await page.locator('.chips .chip', { hasText: new RegExp('^' + mes + '$') }).click();
  const linhaDoMes = page.locator('tr[data-cat]').filter({ has: page.locator('td:nth-child(2)', { hasText: nome }) });
  await expect(linhaDoMes).toHaveCount(1);
  await expect(linhaDoMes.locator('td.dia .dd')).toHaveText(String(dia));     // mudou no lugar: vale também para o mês antigo
});

When('crio a categoria de despesa {string} com o ícone {string} e a cor {string}', async ({ page }, nome, ico, cor) => {
  await irPara(page, 'categorias'); await page.click('[data-newcat="pagar"]');
  await expect(page.locator('#cfn')).toBeFocused();
  await page.fill('#cfn', nome); await page.click(`[data-pico="${ico}"]`); await page.click(`[data-pcor="${cor}"]`);
  await page.locator('#cf').getByRole('button', { name: 'Criar' }).click(); await expect(page.locator('#dlg3')).not.toBeVisible();
});
Then('a categoria {string} aparece na lista com a cor {string}', async ({ page }, nome, cor) => {
  await irPara(page, 'categorias');
  const fundo = await linha(page, nome).locator('.cico').evaluate(e => getComputedStyle(e).backgroundColor);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16));
  expect(fundo).toBe(`rgb(${r}, ${g}, ${b})`);
});
Then('os títulos da lista de categorias estão alinhados com os dados das linhas', async ({ page }) => {
  await irPara(page, 'categorias');
  await expect(linha(page, 'Academia')).toHaveCount(1);
  const x = async (loc) => { const b = await loc.boundingBox(); return { esq: b.x, dir: b.x + b.width }; };
  const hd = page.locator('#cl .cr.hd');
  const linhaAcad = linha(page, 'Academia');
  // "Nome": título e texto do nome começam na mesma coluna
  expect(Math.abs((await x(hd.locator('.c1'))).esq - (await x(linhaAcad.locator('.cn'))).esq), 'título Nome × nome').toBeLessThanOrEqual(2);
  // "Dia": a coluna do título e a do número têm o mesmo centro
  const [hdDia, dado] = [await x(hd.locator('.c2')), await x(linhaAcad.locator('.cd'))];
  expect(Math.abs((hdDia.esq + hdDia.dir) / 2 - (dado.esq + dado.dir) / 2), 'título Dia × dia').toBeLessThanOrEqual(2);
  // "Onde aparece", "Último uso" e "Lanç.": começam na mesma coluna que o dado
  const dados = linhaAcad.locator(':scope > span');
  expect(Math.abs((await x(hd.locator('.c3'))).esq - (await x(dados.nth(3))).esq), 'título Onde aparece × dado').toBeLessThanOrEqual(2);
  expect(Math.abs((await x(hd.locator('.c4'))).esq - (await x(dados.nth(4))).esq), 'título Último uso × dado').toBeLessThanOrEqual(2);
  expect(Math.abs((await x(hd.locator('.c5'))).esq - (await x(dados.nth(5))).esq), 'título Lanç. × dado').toBeLessThanOrEqual(2);
});
