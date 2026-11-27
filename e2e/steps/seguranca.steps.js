const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Then } = createBdd(test);
const { irPara } = require('../support/ui');

/* O texto tem que estar ESCRITO na tela (como letras), na lista de categorias e na tela do mês. */
Then('o texto {string} aparece escrito na lista de categorias e na tela do mês', async ({ page }, texto) => {
  await irPara(page, 'categorias');
  await expect(page.locator('#cl')).toContainText(texto);
  await irPara(page, 'mês');
  await expect(page.locator('#app')).toContainText(texto);
});

/* No Chrome de verdade: se o texto virasse código, `window.__pwn` apareceria; se virasse elemento, existiria uma imagem "x", um <svg>, um <script> ou o #pwn4. */
Then('nenhum código escrito nos campos foi executado nem virou elemento da página', async ({ page }) => {
  for (const aba of ['mês', 'categorias', 'ano', 'patrimônio']) {
    await irPara(page, aba);
    const achados = await page.evaluate(() => ({
      executou: window.__pwn,
      elementos: [...document.querySelectorAll('#app img[src="x"], #app svg[onload], #app script, #pwn4, #app [onerror], #app [onload]')].map(e => e.outerHTML.slice(0, 60)),
    }));
    expect(achados.executou, `código rodou na tela ${aba}`).toBeUndefined();
    expect(achados.elementos, `elemento criado a partir do texto na tela ${aba}`).toEqual([]);
  }
});
