/* Tela Ajustes */
/* ---------- AJUSTES ---------- */
function vAj(){
  return `<div class="two">
  <div class="panel"><h2>Ano ${selY}</h2><div style="padding:12px 14px">
   <div class="row"><label class="row">Saldo inicial de ${selY}: <input id="si" class="money" inputmode="decimal" placeholder="${fmtN(iniY(selY))||'0,00'}" value="${S.saldoIni[selY]!=null?fmtN(S.saldoIni[selY])||'0,00':''}" size="14"></label></div>
   <p class="hint">Deixe em branco para continuar de onde o ano anterior terminou. Na planilha 2026 havia “TOTAL ACUMULADO 90000” em janeiro.</p></div></div>
  <div class="panel"><h2>Backup e exportação</h2><div style="padding:12px 14px">
   <p class="hint">${backend.backupHint}</p>
   <div class="row"><button class="btn" id="bk">Baixar backup (.json)</button>
   <label class="btn sec">Restaurar backup<input type="file" id="rs" accept=".json" hidden></label>
   <button class="btn sec" id="csv">Baixar CSV (abre no Excel)</button>
   <label class="btn sec">Carregar arquivo (.csv)<input type="file" id="csvin" accept=".csv,text/csv" hidden></label></div>
   <div class="row" style="margin-top:12px"><label class="btn sec">Importar anos anteriores (.json)<input type="file" id="imp" accept=".json" hidden></label></div>
   <p class="hint">O CSV traz o resumo de cada ano (como a tela Ano) e todos os detalhes, para você abrir no Excel e também carregar de volta aqui sem perder nada. A importação de anos junta os anos do arquivo aos seus dados; categorias com o mesmo nome são reaproveitadas.</p></div></div>
</div>${catPanel()}`}
