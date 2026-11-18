/* Antes de todos os cenários: cria UMA conta de verdade pela tela (a senha é "pesada" de propósito, leva alguns segundos) e guarda o
   armazenamento do navegador logo depois. Os cenários que não são sobre criar conta começam desse retrato (conta nova e vazia),
   em vez de repetir o cadastro. O cadastro em si é testado de ponta a ponta em 01-conta.feature. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { HOJE, SENHA, EMAIL_PADRAO, ARQUIVO_CONTA } = require('./constantes');

module.exports = async config => {
  const base = config.projects[0].use.baseURL;
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'pt-BR' });
  await page.clock.setFixedTime(new Date(HOJE));
  await page.addInitScript(() => { window.__noTour = true; });
  await page.goto(base + '/index.html');
  await page.click('[data-lm="up"]');
  await page.fill('#lem', EMAIL_PADRAO); await page.fill('#lpw', SENHA); await page.fill('#lpw2', SENHA);
  await page.click('#lf button');
  await page.locator('#nav').waitFor();
  const retrato = await page.evaluate(() => { const copia = a => { const o = {}; for (let i = 0; i < a.length; i++) { const k = a.key(i); o[k] = a.getItem(k); } return o; }; return { local: copia(localStorage), sessao: copia(sessionStorage) }; });
  if (!Object.keys(retrato.local).length) throw new Error('A conta criada não deixou nada no armazenamento do navegador');
  fs.mkdirSync(path.dirname(ARQUIVO_CONTA), { recursive: true });
  fs.writeFileSync(ARQUIVO_CONTA, JSON.stringify(retrato));
  await browser.close();
};
