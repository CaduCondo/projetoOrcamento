/* Confere a carga: abre o app (Chrome de verdade), carrega o arquivo pelo MESMO caminho da pessoa
   (Ajustes → Carregar backup → Juntar) e compara, mês a mês, os totais do app com os totais que a PLANILHA mostra.
   Uso:  node tools/planilha/verificar-no-app.js <pasta-com orcamento-planilha.json e conferencia-planilha.json>
   (precisa de `python build.py --env local --out dist/e2e/index.html` e do servidor: `python -m http.server 4173 --directory dist/e2e`) */
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path');
const { abrirLogada } = require('../../e2e/support/ui');

(async () => {
  const pasta = process.argv[2]; if (!pasta) throw new Error('Informe a pasta com os arquivos gerados.');
  const arq = path.join(pasta, 'orcamento-planilha.json'), esperado = JSON.parse(fs.readFileSync(path.join(pasta, 'conferencia-planilha.json'), 'utf8'));
  const browser = await chromium.launch(); const ctx = await browser.newContext({ baseURL: 'http://localhost:4173', locale: 'pt-BR' });
  const page = await ctx.newPage(); const erros = [];
  page.on('pageerror', e => erros.push(e.message)); page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.addInitScript(() => { window.__noTour = true; });
  await abrirLogada(page);
  await page.locator('#nav [data-tab="aj"]').click().catch(async () => { await page.click('[data-tab="aj"]'); });
  await page.click('[data-import]');
  await page.setInputFiles('#imfile', arq);
  await page.locator('#dlg4 [data-ch="juntar"]').click();
  await page.waitForSelector('#dlg4', { state: 'hidden' });
  const r = await page.evaluate(() => {
    const out = { cats: S.cats.length, anos: S.anos, itens: 0, meses: {} };
    for (const [k, v] of Object.entries(S.data)) out.itens += v.items.length;
    for (const y of S.anos) for (let m = 0; m < 12; m++) {
      out.meses[`${y}|${m}`] = { receber: { real: MT('receber', y, m, 'real'), prev: MT('receber', y, m, 'prev') }, pagar: { real: MT('pagar', y, m, 'real'), prev: MT('pagar', y, m, 'prev') } };
    }
    out.acum = Object.fromEntries(S.anos.map(y => [y, acum(y, 0, 'real')]));
    return out;
  });
  let ok = 0, dif = [];
  for (const [mes, t] of Object.entries(esperado)) for (const tipo of ['receber', 'pagar']) {
    if (t[tipo] == null) continue;
    const app = r.meses[mes]?.[tipo]; if (!app) { dif.push([mes, tipo, t[tipo], null]); continue; }
    // a planilha conta toda célula com valor; o app 'real' só conta o confirmado e 'prev' conta confirmado+previsto: o certo é estar entre os dois
    const esp = Math.round((t[tipo] - (t['sem_ok_' + tipo] || 0)) * 100) / 100;     // planilha menos o que ainda não tem OK
    if (Math.abs(app.real - esp) < 0.015 && app.prev + 0.015 >= app.real) ok++; else dif.push([mes, tipo, esp, app.real, app.prev]);
  }
  console.log(`App: ${r.cats} categorias, ${r.itens} lançamentos, anos ${r.anos.join(',')}`);
  console.log(`Totais mês a mês conferidos com a planilha: ${ok} iguais, ${dif.length} diferentes`);
  for (const d of dif.slice(0, 40)) console.log('  DIFERENTE', JSON.stringify(d));
  console.log('Saldo de janeiro por ano (app, modo realizado):', JSON.stringify(r.acum));
  console.log('Erros de JavaScript:', erros.length ? erros : 'nenhum');
  if (process.argv[3]) {                                              // fotos da tela para conferir com os olhos
    const fotos = process.argv[3]; fs.mkdirSync(fotos, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 1400 });
    for (const [aba, nome] of [['mes', 'mes'], ['ano', 'ano'], ['cat', 'categorias'], ['graf', 'graficos']]) {
      await page.click(`[data-tab="${aba}"]`); await page.waitForTimeout(400); await page.screenshot({ path: path.join(fotos, nome + '.png') });
    }
  }
  await browser.close();
  process.exit(dif.length || erros.length ? 1 : 0);
})();
