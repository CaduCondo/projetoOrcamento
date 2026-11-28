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

/* ---- leitor de PDF (pdf.js 3.11.174 tem a falha CVE-2024-4367: PDF malicioso pode executar código; a defesa oficial para essa versão é isEvalSupported:false) ---- */
const { When } = createBdd(test);
When('o leitor de PDF lê um PDF simples com o texto {string}', async ({ page, mem }, texto) => {
  const r = await page.evaluate(async t => {
    /* monta um PDF mínimo válido, com as posições (xref) calculadas */
    const conteudo = `BT /F1 12 Tf 20 50 Td (${t}) Tj ET`;
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    let pdf = '%PDF-1.4\n'; const pos = [];
    objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    await PdfReader.load();
    const lib = window.pdfjsLib; let opcoes = null;
    /* espia com que opções o app abre o PDF (a biblioteca não deixa trocar getDocument direto, então envolve o objeto inteiro num proxy) */
    window.pdfjsLib = new Proxy(lib, { get: (alvo, nome) => nome === 'getDocument' ? o => { opcoes = o; return alvo.getDocument(o); } : alvo[nome] });
    let linhas;
    try { linhas = await PdfReader.lines(new File([new TextEncoder().encode(pdf)], 'teste.pdf', { type: 'application/pdf' })); } finally { window.pdfjsLib = lib; }
    return { linhas, chamou: opcoes !== null, isEvalSupported: opcoes ? opcoes.isEvalSupported : undefined };
  }, texto);
  mem.pdf = r;
});
Then('o texto lido do PDF é {string}', async ({ mem }, texto) => { expect(mem.pdf.linhas.join(' ')).toBe(texto); });
Then('o leitor de PDF foi aberto com a execução de código dinâmico desligada', async ({ mem }) => { expect(mem.pdf.chamou, 'o espião viu a abertura do PDF').toBe(true); expect(mem.pdf.isEvalSupported).toBe(false); });
