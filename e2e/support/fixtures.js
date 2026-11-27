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
    /* o navegador registra no console o "400" do servidor de login quando a senha está errada: é esperado (o app mostra a mensagem), não é erro do app */
    const loginRecusado = m => /status of 400/.test(m.text()) && /accounts:signInWithPassword/.test(m.location().url || '');
    page.on('console', m => { if (m.type() === 'error' && !loginRecusado(m)) erros.push('console.error: ' + m.text() + (m.location().url ? ' [' + m.location().url.replace(/\?.*$/, '') + ']' : '')); });
    await page.addInitScript(() => { window.__noTour = true; });
    await use(page);
    expectBase(erros, 'o app não pode gerar erro de JavaScript').toEqual([]);
  },
});
module.exports = { test };
