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
   <button class="btn sec" id="csv">Exportar para Excel (.csv)</button></div>
   <div class="row" style="margin-top:12px"><label class="btn sec">Importar anos anteriores (.json)<input type="file" id="imp" accept=".json" hidden></label></div>
   <p class="hint">A importação junta os anos do arquivo aos seus dados. Categorias com o mesmo nome são reaproveitadas.</p></div></div>
</div>${catPanel()}`}
