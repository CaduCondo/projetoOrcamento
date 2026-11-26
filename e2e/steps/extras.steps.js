const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const fs = require('node:fs');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { irPara, digitarValor } = require('../support/ui');

/* ---- carteira ---- */
async function carteira(page, tipo, valor, desc) {
  await irPara(page, 'patrimônio');
  await page.click(`[data-cart="${tipo}"]`);
  await expect(page.locator('#cartf')).toBeVisible();
  await expect(page.locator('#cartv')).toBeFocused();
  await digitarValor(page.locator('#cartv'), valor); await page.fill('#cartd', desc);
  await page.locator('#cartf').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('#dlg3')).not.toBeVisible();
}
Given('que anotei que entraram {string} na carteira com a descrição {string}', async ({ page }, v, d) => { await carteira(page, 'entrou', v, d); });
When('anoto que entraram {string} na carteira com a descrição {string}', async ({ page }, v, d) => { await carteira(page, 'entrou', v, d); });
When('anoto que saíram {string} da carteira com a descrição {string}', async ({ page }, v, d) => { await carteira(page, 'saiu', v, d); });
Then('o saldo da carteira é {string}', async ({ page }, valor) => {
  await irPara(page, 'patrimônio');
  const titulo = page.locator('#cartp h2');
  await expect(titulo).toContainText(new RegExp('R\\$\\s*' + valor.replace(/\./g, '\\.') + '$'));     // termina no valor
  await expect(titulo, 'saldo positivo: sem sinal de menos').not.toContainText('-');
});
Then('o histórico da carteira mostra {string} com {string}', async ({ page }, desc, valor) => {
  await irPara(page, 'patrimônio');
  const item = page.locator('#cartp .pit', { hasText: desc }); await expect(item).toHaveCount(1); await expect(item).toContainText(valor);
});

/* ---- recorrentes e perguntas ---- */
Then('a página Categorias lista a recorrente {string} com {string}', async ({ page }, nome, valor) => {
  await irPara(page, 'categorias');
  const linha = page.locator('#recp .arow', { hasText: nome }); await expect(linha).toHaveCount(1); await expect(linha).toContainText(valor);
});
Then('a página Categorias não lista a recorrente {string}', async ({ page }, nome) => {
  await irPara(page, 'categorias'); await expect(page.locator('#recp')).toBeVisible(); await expect(page.locator('#recp .arow', { hasText: nome })).toHaveCount(0);
});
When('abro a pergunta {string}', async ({ page }, pergunta) => { await page.locator('.perg summary', { hasText: pergunta }).click(); });
Then('a resposta da pergunta {string} diz {string} com {string}', async ({ page }, pergunta, palavra, valor) => {
  const resposta = page.locator('.perg details[open]', { hasText: pergunta }).locator('.pa');
  await expect(resposta).toContainText(palavra); await expect(resposta).toContainText(valor);
});

/* ---- backup e zerar ---- */
When('baixo o backup nos Ajustes', async ({ page, mem }) => {
  await irPara(page, 'ajustes');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#bk')]);
  mem.arquivoBackup = await download.path();
  expect(download.suggestedFilename()).toMatch(/^orcamento-backup-.*\.json$/);
});
Then('o arquivo de backup contém o lançamento {string} de {int}', async ({ mem }, desc, valor) => {
  const dados = JSON.parse(fs.readFileSync(mem.arquivoBackup, 'utf8'));
  const itens = Object.values(dados.data).flatMap(c => c.items);
  expect(itens.filter(i => i.d === desc && i.v === valor && i.ok === true)).toHaveLength(1);
});
When('zero os meus dados digitando {string}', async ({ page }, texto) => {
  await irPara(page, 'ajustes'); await page.click('[data-reset]');
  await expect(page.locator('#dlg4')).toBeVisible();
  await page.fill('#atx', texto); await page.locator('#dlg4 [data-ch="ok"]').click();
  await expect(page.locator('#dlg4')).not.toBeVisible();
});
When('carrego o backup baixado substituindo tudo', async ({ page, mem }) => {
  await irPara(page, 'ajustes'); await page.click('[data-import]');
  await page.setInputFiles('#imfile', { name: 'backup.json', mimeType: 'application/json', buffer: fs.readFileSync(mem.arquivoBackup) });
  await expect(page.locator('#dlg4')).toBeVisible();
  await page.locator('#dlg4 [data-ch="substituir"]').click();
  await expect(page.locator('#dlg4')).not.toBeVisible();
});

/* ---- layout ---- */
When('a janela do navegador tem {int} pixels de largura', async ({ page }, largura) => { await page.setViewportSize({ width: largura, height: 900 }); });
Then('o valor {string} da categoria {string} aparece inteiro dentro do painel de Despesas', async ({ page }, valor, nome) => {
  await irPara(page, 'mês');
  const painel = page.locator('.pm.pagar');
  const celula = painel.locator('tr[data-cat]').filter({ has: page.locator('td:nth-child(2)', { hasText: nome }) }).locator('td.n .val');
  await expect(celula).toContainText(valor);
  const [p, c] = [await painel.boundingBox(), await celula.boundingBox()];
  expect(c.x, 'valor não pode começar fora do painel (à esquerda)').toBeGreaterThanOrEqual(p.x - 1);
  expect(c.x + c.width, 'valor não pode passar da borda direita do painel').toBeLessThanOrEqual(p.x + p.width + 1);
  expect(await painel.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'o painel não pode ter conteúdo escondido na lateral').toBe(true);
});

/* ---- celular: nenhuma tela com rolagem para o lado e botões fáceis de tocar (issue #11) ---- */
const LARGURA_CELULAR = 375;
When('abro o app com a largura de um celular', async ({ page }) => { await page.setViewportSize({ width: LARGURA_CELULAR, height: 740 }); });
Then('a tela {string} não tem rolagem para o lado', async ({ page }, aba) => {
  await irPara(page, aba);
  await page.waitForTimeout(300);
  const sobra = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - window.innerWidth, corpo: document.body.scrollWidth - window.innerWidth }));
  expect(sobra.doc, `a tela "${aba}" passa da largura do celular`).toBeLessThanOrEqual(1);
  expect(sobra.corpo, `o corpo da tela "${aba}" passa da largura do celular`).toBeLessThanOrEqual(1);
});
Then('na tela {string} os botões visíveis têm pelo menos {int} pixels de altura', async ({ page }, aba, minimo) => {
  await irPara(page, aba);
  await page.waitForTimeout(300);
  /* fora da regra: cabeçalhos de tabela e de lista (só ordenam) e as células da planilha da tela Ano (dezenas de valores lado a lado) */
  const pequenos = await page.evaluate(min => [...document.querySelectorAll('button, [role=button], a[href], .tab, #nav [data-tab]')]
    .filter(e => !e.closest('th, .hd') && !e.closest('.grid td'))
    .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.pointerEvents !== 'none' && !e.disabled; })
    .map(e => ({ nome: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) }))
    .filter(x => x.h < min), minimo);
  expect(pequenos, `botões menores que ${minimo}px na tela "${aba}"`).toEqual([]);
});
