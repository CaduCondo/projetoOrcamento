/* Base dos cenários da nuvem: tudo da base normal (navegador novo, erro de console reprova) mais
   - o Firebase SDK servido de e2e/.sdk no lugar do endereço de fora (o `integrity` do site continua valendo: se o arquivo não bater, o navegador recusa);
   - "outros aparelhos": navegadores novos (armazenamento vazio) com as mesmas regras, para provar que o dado vem do BANCO e não do aparelho. */
const fs = require('node:fs');
const path = require('node:path');
const { expect: expectBase } = require('@playwright/test');
const { test: base, ruidoEsperado } = require('../../support/fixtures');

const SDK = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'config', 'firebase-sdk.json'), 'utf8'));

async function servirSdk(context) {
  await context.route('https://www.gstatic.com/firebasejs/**', route => {
    const nome = route.request().url().split('/').pop();
    const arq = path.join(__dirname, '..', '..', '.sdk', SDK.version, nome);
    if (!fs.existsSync(arq)) return route.abort();
    route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(arq) });
  });
}

const test = base.extend({
  /* a base abre cada cenário com a conta e o estado do navegador do "aparelho 1" */
  context: async ({ context }, use) => { await servirSdk(context); await use(context); },
  /* abre um aparelho novo (navegador sem nada guardado). Os erros de console dele também reprovam o cenário. */
  novoAparelho: async ({ browser }, use) => {
    const abertos = [], erros = [];
    await use(async () => {
      const ctx = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: 1280, height: 900 } });
      await servirSdk(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e => erros.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !ruidoEsperado(m)) erros.push('console.error: ' + m.text() + (m.location().url ? ' [' + m.location().url.replace(/\?.*$/, '') + ']' : '')); });
      await page.addInitScript(() => { window.__noTour = true; });
      abertos.push(ctx);
      return page;
    });
    for (const c of abertos) await c.close();
    expectBase(erros, 'o app não pode gerar erro de JavaScript em outro aparelho').toEqual([]);
  },
});
module.exports = { test };
