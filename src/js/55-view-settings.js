/* Tela Ajustes */
/* ---------- AJUSTES ---------- */
function vAj(){
  return `<div class="two">
  <div class="panel"><h2>Ano ${selY}</h2><div style="padding:12px 14px">
   <div class="row"><label class="row">Saldo inicial de ${selY}: <input id="si" class="money" inputmode="decimal" placeholder="${fmtN(iniY(selY))||'0,00'}" value="${S.saldoIni[selY]!=null?fmtN(S.saldoIni[selY])||'0,00':''}" size="14"></label></div>
   <p class="hint">Deixe em branco para continuar de onde o ano anterior terminou. Na planilha 2026 havia “TOTAL ACUMULADO 90000” em janeiro.</p></div></div>
  <div class="panel" id="dados"><h2>Dados: importar e exportar</h2><div style="padding:12px 14px">
   <div class="row"><button type="button" class="btn" data-import>📥 Importar arquivo</button></div>
   <p class="hint">Um botão só para tudo: <b>PDF do Itaú</b> (fatura do cartão ou extrato da conta), <b>planilha CSV</b> do Meu Orçamento ou <b>backup (.json)</b>. O app descobre sozinho o tipo do arquivo.</p>
   <div class="row"><button type="button" class="btn sec" id="csv">⬇ Baixar planilha (Excel)</button><button type="button" class="btn sec" id="bk">⬇ Baixar backup</button></div>
   <p class="hint">${backend.backupHint} A planilha traz o resumo de cada ano e todos os detalhes; ela também pode ser carregada de volta aqui sem perder nada.</p></div></div>
</div>`}
