/* Base de todos os passos: um navegador novo por cenário (armazenamento vazio), sem o tour de primeira vez,
   e QUALQUER erro de JavaScript ou de console durante o cenário reprova o cenário (não deixa bug passar calado). */
const { expect: expectBase } = require('@playwright/test');
const { test: base } = require('playwright-bdd');

/* Duas mensagens de console que NÃO são erro do app (e só estas, com o endereço e o status exatos):
   1) senha errada: o servidor de login responde 400 e o navegador registra; o app mostra a mensagem ao usuário;
   2) canal de transmissão do Firestore (Listen/Write channel) respondendo 400 quando a conexão é cortada no meio (recarregar a página, fechar o
      navegador, trocar de tela): é ruído de transporte do próprio SDK, que reabre o canal sozinho. Visto no CI da nuvem em 27/11/2026 (3 de 5
      execuções) com o endereço http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel. Falha de gravação ou de permissão NÃO passa
      por aqui: aparece como erro de JavaScript ou como dado que não chegou ao banco, e os cenários conferem o banco. */
const ruidoEsperado = m => /status of 400/.test(m.text()) && (/accounts:signInWithPassword/.test(m.location().url || '') || /\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel/.test(m.location().url || ''));

const test = base.extend({
  /* memória do cenário: o que um passo guarda para o passo seguinte conferir */
  mem: async ({}, use) => { await use({}); },
  page: async ({ page }, use) => {
    const erros = [];
    page.on('pageerror', e => erros.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !ruidoEsperado(m)) erros.push('console.error: ' + m.text() + (m.location().url ? ' [' + m.location().url.replace(/\?.*$/, '') + ']' : '')); });
    await page.addInitScript(() => { window.__noTour = true; });
    await use(page);
    expectBase(erros, 'o app não pode gerar erro de JavaScript').toEqual([]);
  },
});
module.exports = { test, ruidoEsperado };
