/* Casca da tela: menu, ano, render geral */
/* ---------- RENDER GERAL ---------- */
const TABS=[['mes','Mês','📅'],['ano','Ano','🗓️'],['graf','Gráficos','📊'],['pat','Patrimônio','🏦'],['cat','Categorias','🏷️'],['aj','Ajustes','⚙️']];
function chrome(){const n=document.getElementById('nav'),h=document.getElementById('hr');
  if(!user){n.innerHTML='';h.innerHTML='';return}
  n.innerHTML=TABS.map(([k,l,i])=>`<button class="${tab===k?'on':''}" data-tab="${k}"><span class="ti" aria-hidden="true">${i}</span><span class="tl">${l}</span></button>`).join('');
  h.innerHTML=`<label class="row" style="margin:0">Ano <select id="ysel">${S.anos.map(y=>`<option ${y===selY?'selected':''}>${y}</option>`).join('')}</select></label>
   <button class="btn sec sm" data-addyear title="Adicionar outro ano">＋ ano</button>
   ${userMenu()}`}
/* foto + nome: abre um menu com Meu cadastro, Usuários (só administrador), Ajuda e Sair */
function userMenu(){const p=myProfile(),nome=esc(p?profileLabel(p,user):user),soFoto=p&&p.foto&&!p.nome;
  return `<div class="umenu"><button type="button" class="userchip" data-umenu="toggle" aria-haspopup="menu" aria-expanded="false" title="Meu cadastro, ajuda e sair">${avatar(p,user)}${soFoto?'':`<span class="uname">${nome}</span>`}<span class="caret" aria-hidden="true">▾</span></button>
   <div class="umenu-list" role="menu" hidden>
    <button type="button" role="menuitem" data-tab="perfil"><span class="mi" aria-hidden="true">👤</span><span class="mt"><b>${nome}</b><small>Meu cadastro</small></span></button>
    ${backend.isAdmin?'<button type="button" role="menuitem" data-adm="abrir"><span class="mi" aria-hidden="true">👥</span><span class="mt">Usuários<small>Ver os dados de outro usuário (somente leitura)</small></span></button>':''}
    <button type="button" role="menuitem" data-help><span class="mi" aria-hidden="true">❓</span><span class="mt">Ajuda desta tela</span></button>
    <hr>
    <button type="button" role="menuitem" class="sair" data-logout><span class="mi" aria-hidden="true">🚪</span><span class="mt">Sair</span></button>
   </div></div>`}
function render(){chrome();destroyCharts();tip.style.display='none';const a=document.getElementById('app');
  if(!user){a.innerHTML=vLogin();renderNotice();renderRoBar();return}
  a.innerHTML={mes:vMes,ano:vAno,graf:vGraf,pat:vPat,cat:vCat,aj:vAj,perfil:vPerfil}[tab]();
  renderNotice();renderRoBar();
  if(tab==='mes'){const ch=a.querySelector('.chips'),on=ch?.querySelector('.chip.on');if(ch&&on&&ch.scrollWidth>ch.clientWidth)ch.scrollLeft=on.offsetLeft-ch.clientWidth/2+on.offsetWidth/2}   // celular: o mês escolhido aparece no meio
  if(tab==='graf')drawCharts();if(tab==='pat')drawPat();if(tab==='perfil')fillDeviceStatus();if(tab==='aj')fillErrors();
  if(readOnly){lockUi(a);lockUi(el('hr'))}
  if(Tour.on&&Tour.tab!==tab)Tour.end();Tour.auto(tab)}
const seg=()=>`<div class="seg" title="Realizado = só itens marcados como pagos/recebidos. Previsto = tudo."><button data-modo="real" class="${modo==='real'?'on':''}">Realizado</button><button data-modo="prev" class="${modo==='prev'?'on':''}">Previsto</button></div>`;
