/* Tela Ajustes */
/* ---------- AJUSTES ---------- */
function vAj(){
  return `<div class="two">
  <div class="panel"><h2>Ano ${selY}</h2><div style="padding:12px 14px">
   <div class="row"><label class="row">Saldo inicial de ${selY}: <input id="si" class="money" inputmode="decimal" placeholder="${fmtN(iniY(selY))||'0,00'}" value="${S.saldoIni[selY]!=null?fmtN(S.saldoIni[selY])||'0,00':''}" size="14"></label></div>
   <p class="hint">Deixe em branco para continuar de onde o ano anterior terminou. Na planilha 2026 havia “TOTAL ACUMULADO 90000” em janeiro.</p></div></div>
  <div class="panel" id="dados"><h2>Dados: importar e exportar</h2><div style="padding:12px 14px">
   <div class="row"><button type="button" class="btn" data-import>📥 Importar arquivo</button></div>
   <p class="hint">Um botão só para tudo: <b>extrato da conta ou fatura do cartão de qualquer banco</b> (OFX, CSV ou PDF), a <b>planilha</b> do Meu Orçamento ou o <b>backup (.json)</b>. O app descobre sozinho o tipo do arquivo.</p>
   <div class="row"><button type="button" class="btn sec" id="csv">⬇ Baixar planilha (Excel)</button><button type="button" class="btn sec" id="bk">⬇ Baixar backup</button></div>
   <p class="hint">${backend.backupHint} A planilha traz o resumo de cada ano e todos os detalhes; ela também pode ser carregada de volta aqui sem perder nada.</p></div></div>
</div>${backend.isCloud&&backend.isAdmin&&!readOnly?`<div class="panel" id="bankp" style="margin-top:16px"><h2>🏦 Buscar do banco <span class="sub">só você vê</span></h2><div class="pbody"><p class="hint">Traz extrato da conta e fatura do cartão direto do banco (Open Finance, somente leitura), sem baixar arquivo. Os lançamentos aparecem na tela de conferência, como na importação de arquivo.</p><button type="button" class="btn" data-bank>🏦 Buscar do banco</button></div></div>`:''}${backend.canSeeErrors&&!readOnly?`<div class="panel" id="errp" style="margin-top:16px"><h2>🛠 Erros registrados <span class="sub">só você vê</span></h2><div class="pbody" id="errl"><p class="hint">Carregando…</p></div></div>`:''}`}
/* lista de erros registrados (administrador): o que deu errado, com quem, onde e quando — sem dados financeiros */
async function fillErrors(){const box=el('errl');if(!box)return;let l;
  try{l=await backend.listErrors()}catch(e){box.innerHTML=`<p class="err">Não consegui ler o registro (${esc(e?.code||e?.message||'erro')}). Publique as regras novas do banco (PASSO-A-PASSO, seção 2).</p>`;return}
  if(!l.length){box.innerHTML='<p class="hint">Nenhum erro registrado. 🎉</p>';return}
  const info=t=>{try{const o=JSON.parse(t||'{}');return Object.entries(o).map(([k,v])=>`<span class="tag">${esc(k)}: ${esc(String(v))}</span>`).join(' ')}catch{return esc(t||'')}};
  box.innerHTML=`<div class="row" style="justify-content:space-between"><span class="sub">${l.length} registro(s), do mais novo para o mais antigo</span><button type="button" class="btn dan sm" data-errclear>Apagar todos</button></div>
   <div class="errlist">${l.map(e=>`<div class="erow"><div class="erow-h"><span class="etipo ${esc(e.tipo)}">${esc(e.tipo)}</span><span class="sub">${esc(new Date(e.quando).toLocaleString('pt-BR'))}${e.email?' · '+esc(e.email):''}${e.tela?' · tela '+esc(e.tela):''}${e.env?' · '+esc(e.env):''}</span>
     <button type="button" class="btn sec sm" data-errdel="${esc(e.id)}" title="Marcar como resolvido (apaga o registro)">✓ Resolvido</button></div>
     <div class="emsg">${esc(e.msg)}</div>${e.info&&e.info!=='{}'?`<div class="einfo">${info(e.info)}</div>`:''}</div>`).join('')}</div>`}
