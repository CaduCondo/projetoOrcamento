/* Gerenciador de categorias (Ajustes) */
/* ---------- GERENCIADOR DE CATEGORIAS (Ajustes) ---------- */
let catUI={q:'',filtro:'ativas',tipo:'',lim:40,col:'uso',dir:-1};      // ordem: padrão = usadas há menos tempo primeiro
/* cabeçalho clicável: 1º clique crescente, 2º decrescente, 3º volta ao padrão */
const CAT_COLS=[['tipo','Tipo'],['nome','Nome'],['dia','Dia'],['vig','Onde aparece'],['uso','Último uso'],['n','Lanç.']];
function catHead(){return `<div class="cr hd">${CAT_COLS.map(([k,l],i)=>`<span class="srt c${i} ${catUI.col===k?'on':''}" data-csort="${k}" role="button" tabindex="0" title="Clique para ordenar" aria-sort="${catUI.col===k?(catUI.dir>0?'ascending':'descending'):'none'}">${i===0?'':l}${i===0?'<span title="Tipo: receita ou despesa">⇅</span>':''}${catUI.col===k?(catUI.dir>0?' ▲':' ▼'):''}</span>`).join('')}<span class="c6"></span></div>`}
function sortCats(l,st){const{col,dir}=catUI,nome=c=>normName(c.nome);
  const chave={tipo:c=>c.tipo,nome,vig:c=>normName(scopeLabel(c)),uso:c=>st[c.id]?.last??-1,n:c=>st[c.id]?.n||0};
  return l.sort((a,b)=>{
    if(col==='dia'){const x=a.dia||0,z=b.dia||0;if(!x||!z)return !x&&!z?nome(a).localeCompare(nome(b)):!x?1:-1;return(x-z)*dir||nome(a).localeCompare(nome(b))}
    const x=chave[col](a),z=chave[col](b);return(typeof x==='number'?x-z:String(x).localeCompare(String(z)))*dir||nome(a).localeCompare(nome(b))})}
function catRows(){const st=catStats(),nq=normName(catUI.q);
  let l=S.cats.filter(c=>(!catUI.tipo||c.tipo===catUI.tipo));
  if(nq){const tk=nq.split(' ');l=l.filter(c=>tk.every(x=>normName(c.nome).includes(x)))}
  else if(catUI.filtro==='ativas')l=l.filter(c=>isActive(c,st));
  else if(catUI.filtro==='sem')l=l.filter(c=>!st[c.id]);
  else if(catUI.filtro==='antigas')l=l.filter(c=>st[c.id]&&!isActive(c,st));
  sortCats(l,st);
  const tot=l.length;
  const html=l.slice(0,catUI.lim).map(c=>{const x=st[c.id];return `<div class="cr"><span class="dot ${c.tipo}" title="${c.tipo==='pagar'?'Despesas':'Receitas'}"></span>
   <input class="cn" data-cn="${c.id}" value="${esc(c.nome)}" aria-label="Nome"><input class="cd" data-cd="${c.id}" value="${c.dia??''}" placeholder="dia" title="Dia do vencimento ou da entrada do dinheiro" aria-label="Dia">
   <span class="vig" title="Onde esta categoria aparece nas telas">${esc(scopeLabel(c))||'<span class="sub">histórico</span>'}</span>
   <span class="sub xs">${x?'último uso '+lastLabel(x.last):'sem lançamentos'}</span><span class="sub xs">${x?x.n+' lanç.':''}</span>
   <span class="cact"><button class="btn sec sm" data-cedit="${c.id}" title="Editar nome, dia e onde aparece">Editar</button><button class="btn sec sm" data-cmerge="${c.id}" title="Juntar com outra categoria">Mesclar</button><button class="btn dan sm" data-cdel="${c.id}" title="Excluir" aria-label="Excluir">✕</button></span></div>`}).join('')||'<p class="hint" style="padding:14px 4px">Nenhuma categoria com esse filtro.</p>';
  return{html:catHead()+html+(tot>catUI.lim?`<div style="padding:10px 4px"><button class="btn sec sm" data-cmore>Mostrar mais ${Math.min(40,tot-catUI.lim)} (${tot-catUI.lim} restantes)</button></div>`:''),tot}}
function renderCatList(){const r=catRows(),el=document.getElementById('cl');if(!el)return;el.innerHTML=r.html;document.getElementById('cc').textContent=`${r.tot} de ${S.cats.length}`}
/* Página Categorias: o lugar de CRIAR, EDITAR, MESCLAR e EXCLUIR categorias */
function vCat(){return catPanel()}
function catPanel(){const r=catRows(),sg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button data-cf="${k}|${v}" class="${catUI[k]===v?'on':''}">${l}</button>`).join('')}</div>`;
  return `<div class="panel" ><h2>Categorias <span class="sub" id="cc">${r.tot} de ${S.cats.length}</span></h2><div style="padding:12px 14px">
   <div class="row"><input id="cq" type="search" placeholder="🔍 Buscar categoria…" value="${esc(catUI.q)}" style="flex:1;min-width:200px">
    ${sg('filtro',[['ativas','Ativas'],['antigas','Antigas'],['sem','Sem lançamentos'],['todas','Todas']])}${sg('tipo',[['','Todas'],['receber','Receitas'],['pagar','Despesas']])}</div>
   <p class="hint" style="margin:2px 0 8px">“Ativas” = usadas nos últimos 24 meses; ao buscar aparecem todas. Aqui você cria, edita e exclui. Na tela Mês você apenas <b>inclui</b> no mês uma categoria que já existe. Mudar nome ou dia aqui vale <b>de ${MESES[selM].toLowerCase()}/${selY} em diante</b> (o passado não muda). Para corrigir um erro em todos os meses, use <b>Editar</b>.</p>
   <div class="row"><button class="btn sec sm" data-newcat="pagar">＋ Categoria a pagar</button><button class="btn sec sm" data-newcat="receber">＋ Categoria a receber</button></div>
   <div id="cl">${r.html}</div></div></div>`}
