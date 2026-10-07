/* Gerenciador de categorias (Ajustes) */
/* ---------- GERENCIADOR DE CATEGORIAS (Ajustes) ---------- */
let catUI={q:'',filtro:'ativas',tipo:'',lim:40};
function catRows(){const st=catStats(),nq=normName(catUI.q);
  let l=S.cats.filter(c=>(!catUI.tipo||c.tipo===catUI.tipo));
  if(nq){const tk=nq.split(' ');l=l.filter(c=>tk.every(x=>normName(c.nome).includes(x)))}
  else if(catUI.filtro==='ativas')l=l.filter(c=>isActive(c,st));
  else if(catUI.filtro==='sem')l=l.filter(c=>!st[c.id]);
  else if(catUI.filtro==='antigas')l=l.filter(c=>st[c.id]&&!isActive(c,st));
  l.sort((a,b)=>(st[b.id]?.last??-1)-(st[a.id]?.last??-1)||normName(a.nome).localeCompare(normName(b.nome)));
  const tot=l.length;
  const html=l.slice(0,catUI.lim).map(c=>{const x=st[c.id];return `<div class="cr"><span class="dot ${c.tipo}" title="${c.tipo==='pagar'?'A pagar':'A receber'}"></span>
   <input class="cn" data-cn="${c.id}" value="${esc(c.nome)}" aria-label="Nome"><input class="cd" data-cd="${c.id}" value="${c.dia??''}" placeholder="dia" title="Dia do vencimento ou da entrada do dinheiro" aria-label="Dia">
   <span class="vig" title="Onde esta categoria aparece nas telas">${esc(scopeLabel(c))||'<span class="sub">histórico</span>'}</span>
   <span class="sub xs">${x?'último uso '+lastLabel(x.last):'sem lançamentos'}</span><span class="sub xs">${x?x.n+' lanç.':''}</span>
   <button class="btn sec sm" data-cedit="${c.id}" title="Editar nome, dia e onde aparece">Editar</button><button class="btn sec sm" data-cmerge="${c.id}" title="Juntar com outra categoria">Mesclar</button><button class="btn dan sm" data-cdel="${c.id}" title="Excluir">✕</button></div>`}).join('')||'<p class="hint" style="padding:14px 4px">Nenhuma categoria com esse filtro.</p>';
  return{html:html+(tot>catUI.lim?`<div style="padding:10px 4px"><button class="btn sec sm" data-cmore>Mostrar mais ${Math.min(40,tot-catUI.lim)} (${tot-catUI.lim} restantes)</button></div>`:''),tot}}
function renderCatList(){const r=catRows(),el=document.getElementById('cl');if(!el)return;el.innerHTML=r.html;document.getElementById('cc').textContent=`${r.tot} de ${S.cats.length}`}
function catPanel(){const r=catRows(),sg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button data-cf="${k}|${v}" class="${catUI[k]===v?'on':''}">${l}</button>`).join('')}</div>`;
  return `<div class="panel" style="margin-top:16px"><h2>Categorias <span class="sub" id="cc">${r.tot} de ${S.cats.length}</span></h2><div style="padding:12px 14px">
   <div class="row"><input id="cq" type="search" placeholder="🔍 Buscar categoria…" value="${esc(catUI.q)}" style="flex:1;min-width:200px">
    ${sg('filtro',[['ativas','Ativas'],['antigas','Antigas'],['sem','Sem lançamentos'],['todas','Todas']])}${sg('tipo',[['','Todas'],['receber','A receber'],['pagar','A pagar']])}</div>
   <p class="hint" style="margin:2px 0 8px">“Ativas” = usadas nos últimos 24 meses; ao buscar aparecem todas. Mudar nome ou dia aqui vale <b>de ${MESES[selM].toLowerCase()}/${selY} em diante</b> (o passado não muda). Para corrigir um erro em todos os meses, use <b>Editar</b>.</p>
   <div class="row"><button class="btn sec sm" data-newcat="pagar">＋ Categoria a pagar</button><button class="btn sec sm" data-newcat="receber">＋ Categoria a receber</button></div>
   <div id="cl">${r.html}</div></div></div>`}
