/* Casca da tela: menu, ano, render geral */
/* ---------- RENDER GERAL ---------- */
const TABS=[['mes','Mês'],['ano','Ano'],['graf','Gráficos'],['pat','Patrimônio'],['aj','Ajustes']];
function chrome(){const n=document.getElementById('nav'),h=document.getElementById('hr');
  if(!user){n.innerHTML='';h.innerHTML='';return}
  n.innerHTML=TABS.map(([k,l])=>`<button class="${tab===k?'on':''}" data-tab="${k}">${l}</button>`).join('');
  h.innerHTML=`<label class="row" style="margin:0">Ano <select id="ysel">${S.anos.map(y=>`<option ${y===selY?'selected':''}>${y}</option>`).join('')}</select></label>
   <button class="btn sec sm" data-addyear title="Adicionar outro ano">＋ ano</button><button type="button" class="userchip" data-tab="perfil" title="Meu cadastro">${avatar(profile,user)}${profile&&profile.foto&&!profile.nome?'':`<span class="uname">${esc(profile?profileLabel(profile,user):user)}</span>`}</button>
   <button class="btn dan sm" data-logout>Sair</button>`}
function render(){chrome();destroyCharts();tip.style.display='none';const a=document.getElementById('app');
  if(!user){a.innerHTML=vLogin();renderNotice();return}
  a.innerHTML={mes:vMes,ano:vAno,graf:vGraf,pat:vPat,aj:vAj,perfil:vPerfil}[tab]();
  renderNotice();
  if(tab==='graf')drawCharts();if(tab==='pat')drawPat();if(tab==='perfil')fillDeviceStatus()}
const seg=()=>`<div class="seg" title="Realizado = só itens marcados como pagos/recebidos. Previsto = tudo."><button data-modo="real" class="${modo==='real'?'on':''}">Realizado</button><button data-modo="prev" class="${modo==='prev'?'on':''}">Previsto</button></div>`;
