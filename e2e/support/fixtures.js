/* Base de todos os passos: um navegador novo por cenário (armazenamento vazio), sem o tour de primeira vez,
   e QUALQUER erro de JavaScript ou de console durante o cenário reprova o cenário (não deixa bug passar calado). */
const { expect: expectBase } = require('@playwright/test');
const { test: base } = require('playwright-bdd');

const test = base.extend({
  /* memória do cenário: o que um passo guarda para o passo seguinte conferir */
  mem: async ({}, use) => { await use({}); },
  page: async ({ page }, use) => {
    const erros = [];
    page.on('pageerror', e => erros.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') erros.push('console.error: ' + m.text()); });
    await page.addInitScript(() => { window.__noTour = true; });
    await use(page);
    expectBase(erros, 'o app não pode gerar erro de JavaScript').toEqual([]);
  },
});
module.exports = { test };
