/* Ações de tela compartilhadas pelos passos: sempre pelo que a pessoa vê e clica (nada de mexer nos dados por baixo). */
const { expect } = require('@playwright/test');

const fs = require('node:fs');
const { HOJE, SENHA, EMAIL_PADRAO, ARQUIVO_CONTA } = require('./constantes');
const ABAS = { mês: 'mes', ano: 'ano', gráficos: 'graf', patrimônio: 'pat', categorias: 'cat', ajustes: 'aj' };

async function abrirApp(page) {
  await page.clock.setFixedTime(new Date(HOJE));
  await page.goto('/index.html');
}
async function criarConta(page, email = 'ana@exemplo.com') {
  await abrirApp(page);
  await page.click('[data-lm="up"]');
  await page.fill('#lem', email); await page.fill('#lpw', SENHA); await page.fill('#lpw2', SENHA);
  await page.click('#lf button');
  await expect(page.locator('#nav')).toBeVisible();
  const agoraNao = page.getByRole('button', { name: 'Agora não' });
  if (await agoraNao.isVisible()) await agoraNao.click();
}
/* abre o app já logado numa conta nova e vazia (retrato criado no global-setup); recarregar a página NÃO volta ao retrato */
async function abrirLogada(page) {
  const retrato = JSON.parse(fs.readFileSync(ARQUIVO_CONTA, 'utf8'));
  await page.addInitScript(r => { if (!sessionStorage.getItem('__e2e_retrato')) { sessionStorage.setItem('__e2e_retrato', '1'); for (const [k, v] of Object.entries(r.local)) localStorage.setItem(k, v); for (const [k, v] of Object.entries(r.sessao)) sessionStorage.setItem(k, v); } }, retrato);
  await abrirApp(page);
  await expect(page.locator('#nav')).toBeVisible();
  const agoraNao = page.getByRole('button', { name: 'Agora não' });
  if (await agoraNao.isVisible()) await agoraNao.click();
}
/* chave liga/desliga (o quadradinho de verdade fica escondido atrás do desenho): clica no rótulo, como a pessoa */
async function ligar(page, seletor, ligado = true) {
  const caixa = page.locator(seletor);
  if ((await caixa.isChecked()) !== ligado) await page.locator('label.switch', { has: caixa }).click();
  await expect(caixa).toBeChecked({ checked: ligado });
}
async function irPara(page, aba) { await page.click(`#nav [data-tab="${ABAS[aba] ?? aba}"]`); }
/* campo de valor com máscara: digita só os números, como a pessoa (4550 vira 45,50) */
async function digitarValor(campo, texto) { await campo.click(); await campo.pressSequentially(texto.replace(/\D/g, '')); }
const dinheiro = n => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* escolhe uma categoria no campo de busca (combobox) pelo nome */
async function escolherCategoria(page, idCampo, nome) {
  const campo = page.locator(`#${idCampo}in`);
  await campo.click(); await campo.fill(nome);
  await page.locator(`#${idCampo}in`).locator('xpath=..').locator('.cbo', { hasText: nome }).first().click();
}
/* arquivo de teste enviado pelo botão de arquivo, como se a pessoa tivesse escolhido no computador */
async function enviarArquivo(page, nome, conteudo, mime = 'text/plain') {
  await page.setInputFiles('#imfile', { name: nome, mimeType: mime, buffer: Buffer.from(conteudo, 'utf8') });
}
async function abrirImportacao(page) { await irPara(page, 'ajustes'); await page.click('[data-import]'); await expect(page.locator('#imf')).toBeVisible(); }
async function alternarVisao(page, visao) { await page.click(`[data-mv="${visao}"]`); }
/* cria um lançamento pela lista de Lançamentos do mês (janela "＋ Lançamento") */
async function novoLancamento(page, desc, valor, dia, cat, emDinheiro = false) {
  await irPara(page, 'mês'); await alternarVisao(page, 'lanc');
  await page.click('[data-lnew]');
  await expect(page.locator('#lf2')).toBeVisible();
  await page.fill('#lid', desc); await digitarValor(page.locator('#liv'), valor); await page.fill('#lia', String(dia));
  await escolherCategoria(page, 'lic', cat);
  if (emDinheiro) await ligar(page, '#lcart');
  await page.locator('#lf2').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('#dlg3')).not.toBeVisible();
  await expect(page.locator('.lrow', { hasText: desc })).toHaveCount(1);
}

module.exports = { ligar, novoLancamento, HOJE, SENHA, EMAIL_PADRAO, abrirLogada, ABAS, abrirApp, criarConta, irPara, digitarValor, dinheiro, escolherCategoria, enviarArquivo, abrirImportacao, alternarVisao };
