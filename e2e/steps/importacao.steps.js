const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);
const { irPara, enviarArquivo, abrirImportacao, alternarVisao } = require('../support/ui');

/* extratos de exemplo (inventados), no formato OFX que os bancos exportam */
const OFX_CONTA = `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>Banco Exemplo<FID>999</FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><DTSTART>20261001
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>5000.00<FITID>1<MEMO>REMUNERACAO SALARIO
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261010<TRNAMT>-99.90<FITID>2<MEMO>CONTA VIVO 03/10
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261013<TRNAMT>-50.00<FITID>3<MEMO>PIX LOJA
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const OFX_VIVO_DE_NOVO = OFX_CONTA.split('<STMTTRN>')[0] + `<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261020<TRNAMT>-99.90<FITID>9<MEMO>CONTA VIVO 05/10
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dois = n => String(n).padStart(2, '0');
const ofxCartao = (itens) => `<?xml version="1.0"?><OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST>
${itens.map((i, n) => `<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>2026${dois(i.mes)}${dois(i.dia)}</DTPOSTED><TRNAMT>-${i.valor}</TRNAMT><FITID>c${n}</FITID><MEMO>${i.desc}</MEMO></STMTTRN>`).join('\n')}
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

async function importar(page, nome, conteudo, mes) {
  await abrirImportacao(page);
  await enviarArquivo(page, nome, conteudo);
  if (mes) await page.selectOption('#imm', { label: MAIUSCULA(mes) });
  await expect(page.locator('#imf .imrow').first()).toBeVisible();
  await page.click('[data-imgo]');
  await expect(page.locator('#dlg3')).not.toBeVisible();
}
const MAIUSCULA = s => s[0].toUpperCase() + s.slice(1);

Given('que importei o extrato OFX da conta com 3 movimentações', async ({ page }) => { await importar(page, 'extrato.ofx', OFX_CONTA); });
When('importo o extrato OFX da conta com 3 movimentações', async ({ page }) => { await importar(page, 'extrato.ofx', OFX_CONTA); });
When('importo o extrato OFX da conta com a conta Vivo de outro dia', async ({ page }) => { await importar(page, 'extrato2.ofx', OFX_VIVO_DE_NOVO); });
When('importo uma fatura OFX do cartão com a compra {string} de {string} no dia {int} de {string}', async ({ page }, desc, valor, dia, mes) => {
  await abrirImportacao(page);
  await enviarArquivo(page, 'fatura.ofx', ofxCartao([{ dia, mes: MESES.indexOf(mes.toLowerCase()) + 1, desc, valor: valor.replace(/\./g, '').replace(',', '.') }]));
  await page.selectOption('#imm', { label: MAIUSCULA(mes) });
  await expect(page.locator('#imf .imrow').first()).toBeVisible();
  await page.click('[data-imgo]'); await expect(page.locator('#dlg3')).not.toBeVisible();
});
When('tento importar o mesmo extrato de novo', async ({ page }) => { await abrirImportacao(page); await enviarArquivo(page, 'extrato.ofx', OFX_CONTA); await expect(page.locator('#imf .imrow').first()).toBeVisible(); });

Then('na tela de importação os 3 itens aparecem como já importados e não dá para importar de novo', async ({ page }) => {
  await expect(page.locator('#imf .imrow.ja')).toHaveCount(3);
  await expect(page.locator('[data-imgo]')).toBeDisabled();
  await page.locator('#imf [data-cclose]').last().click();
});
Then('na lista de lançamentos vejo {int} lançamentos', async ({ page }, n) => { await irPara(page, 'mês'); await alternarVisao(page, 'lanc'); await expect(page.locator('.lrow')).toHaveCount(n); });
Then('vejo o lançamento {string} de {string} como {string}', async ({ page }, desc, valor, tipo) => {
  await irPara(page, 'mês'); await alternarVisao(page, 'lanc');
  const linha = page.locator('.lrow', { hasText: desc });
  await expect(linha).toHaveCount(1);
  await expect(linha.locator('.lv')).toContainText(valor);
  await expect(linha.locator('.lv')).toHaveClass(tipo === 'entrada' ? /pos/ : /neg/);
});
Then('vejo o aviso de {int} lançamentos sem categoria', async ({ page }, n) => { await expect(page.locator('.alertb')).toContainText(new RegExp(`${n} lançamentos? sem categoria`)); });
Then('não vejo aviso de lançamentos sem categoria', async ({ page }) => { await expect(page.locator('.lrow').first()).toBeVisible(); await expect(page.locator('.alertb')).toHaveCount(0); });
Then('o lançamento {string} está na categoria {string}', async ({ page }, desc, cat) => {
  await irPara(page, 'mês'); await alternarVisao(page, 'lanc');
  await expect(page.locator('.lrow', { hasText: desc }).locator('.ltx .sub')).toContainText(cat);
});
Then('no resumo do mês vejo as parcelas já comprometidas de {string} com {string}', async ({ page }, mes, valor) => {
  await irPara(page, 'mês');
  const bloco = page.locator('.resumo .prox', { hasText: 'Parcelas do cartão já comprometidas' });
  await expect(bloco.locator('button', { hasText: new RegExp('^' + mes, 'i') })).toContainText(valor);
});
When('abro o detalhe das parcelas', async ({ page }) => { await page.locator('.resumo [data-parc]').last().click(); await expect(page.locator('#dlg3')).toBeVisible(); });
Then('o detalhe das parcelas mostra {string} na {string}', async ({ page }, texto, parcela) => {
  const bloco = page.locator('#dlg3 .pit').filter({ hasText: texto }).filter({ hasText: parcela });
  await expect(bloco).toHaveCount(1);
});
Then('o detalhe das parcelas não mostra mais parcelas depois da quinta', async ({ page }) => {
  await expect(page.locator('#dlg3 .pit')).toHaveCount(2);
  await expect(page.locator('#dlg3 .pmes')).toHaveCount(2);
});
