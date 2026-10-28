/* Lançamentos do mês: todos os itens numa lista só, por dia (alternativa à visão "Por categoria" da tela Mês).
   Tocar num lançamento abre a janela dele: ajustar texto/valor, mudar a categoria e, se quiser, criar uma AUTOMAÇÃO
   ("sempre que aparecer este texto, vai para esta categoria"). Também tem o painel das automações na página Categorias. */
let mesVis='cat';                                   // 'cat' = por categoria · 'lanc' = lançamentos
const lancUI={q:'',f:'todos'};
const DSEM=['dom','seg','ter','qua','qui','sex','sáb'];

function lancFiltrados(y,m){let l=lancamentos(y,m);const tk=normName(lancUI.q).split(' ').filter(Boolean);
  if(lancUI.f==='sem')l=l.filter(x=>x.sem);else if(lancUI.f==='receber'||lancUI.f==='pagar')l=l.filter(x=>x.tipo===lancUI.f);
  if(tk.length)l=l.filter(x=>{const t=normName(descLimpa(x.it)+' '+x.cat.nome);return tk.every(k=>t.includes(k))});
  return l}
const sinal=n=>(n<0?'−':'+')+' '+fmtN(Math.abs(n));
function linhaLanc(x,y,m){const nome=x.sem?'<span class="semcat">⚠ Sem categoria</span>':esc(x.cat.nome);
  return `<button type="button" class="lrow ${x.it.ok?'':'prev'}" data-lanc="${key(x.cid,y,m)}|${x.idx}">${x.sem?'<span class="cico sem">?</span>':catBadge(x.cat)}
   <span class="ltx"><b>${esc(descLimpa(x.it))}</b><span class="sub">${nome}${x.it.ok?'':` · ${x.tipo==='pagar'?'a pagar':'a receber'}`}${x.it.imp?' · importado':''}</span></span>
   <span class="lv ${x.v<0?'neg':'pos'}">${sinal(x.v)}</span></button>`}
function listaLanc(y,m){const l=lancFiltrados(y,m);
  if(!l.length)return `<p class="hint" style="padding:16px">${lancUI.q||lancUI.f!=='todos'?'Nenhum lançamento com esse filtro.':'Nenhum lançamento neste mês ainda. Use “＋ Lançamento” ou importe um extrato em Ajustes.'}</p>`;
  const dias=new Map();for(const x of l){(dias.get(x.dia)??dias.set(x.dia,[]).get(x.dia)).push(x)}
  return[...dias].map(([d,xs])=>{const tot=xs.reduce((s,x)=>s+(x.it.ok?x.v:0),0),dt=d?new Date(y,m,d):null;
    return `<div class="lday"><span>${d?`<b>${String(d).padStart(2,'0')}</b> ${DSEM[dt.getDay()]}`:'Sem dia'}</span><span class="${tot<0?'neg':'pos'}">${tot?sinal(tot):''}</span></div>${xs.map(x=>linhaLanc(x,y,m)).join('')}`}).join('')}
function vLanc(y,m){const todos=lancamentos(y,m),sem=todos.filter(x=>x.sem).length,
    f=(k,t)=>`<button data-lf="${k}" class="${lancUI.f===k?'on':''}">${t}</button>`;
  return `<div class="panel pm"><h2>LANÇAMENTOS <span class="sub">${todos.length} em ${MESES[m].toLowerCase()}</span></h2><div style="padding:12px 14px">
   ${sem?`<button type="button" class="alertb" data-lf="sem">⚠ ${sem} lançamento${sem>1?'s':''} sem categoria — resolver</button>`:''}
   <div class="row"><input id="lq" type="search" placeholder="🔍 Buscar lançamento ou categoria…" value="${esc(lancUI.q)}" style="flex:1;min-width:180px">
    <button class="btn sm" data-lnew>＋ Lançamento</button></div>
   <div class="seg lf">${f('todos','Todos')}${f('receber','Entradas')}${f('pagar','Saídas')}${f('sem','Sem categ.')}</div>
   <div id="ll">${listaLanc(y,m)}</div></div></div>`}
const refazLista=()=>{const b=el('ll');if(b)b.innerHTML=listaLanc(selY,selM)};

/* ---- janela de um lançamento (novo ou existente) ---- */
const LancDialog={
  ref:null,                                         // {cid,y,m,idx} do existente; null = novo
  tipoNovo:'pagar',
  open(ref){if(readOnly)return;this.ref=ref;this.draw();dlg3.showModal();if(!ref)setTimeout(()=>el('liv')?.focus(),0)},
  item(){const r=this.ref;return r?cellOf(r.cid,r.y,r.m)?.items[r.idx]:null},
  draw(){const r=this.ref,it=this.item(),c=r?catById(r.cid):null,cat=it?categoriaDe(c,it):null,sem=!!(it&&semCategoria(c,it));
    const pagar=r?c.tipo==='pagar':this.tipoNovo==='pagar',nome=it?descLimpa(it):'';
    const txt=autoTxt(nomeSugerido(nome)),tipoCombo=r&&it.imp&&!it.imp.startsWith('cartao|')?'':(r?c.tipo:this.tipoNovo);
    dlg3.innerHTML=`<form id="lf2" novalidate>
     <div class="dh"><div><h3>${r?esc(nome):'Novo lançamento'}</h3><div class="sub">${r?`${MESES[r.m]} de ${r.y}${it.imp?' · veio do banco/extrato':''}`:`${MESES[selM]} de ${selY}`}</div></div><button type="button" class="btn sec" data-lclose>Fechar</button></div>
     <div class="db">
      ${r?'':`<div class="seg" style="margin-bottom:10px"><button type="button" data-ltipo="pagar" class="${pagar?'on':''}">Saída (despesa)</button><button type="button" data-ltipo="receber" class="${pagar?'':'on'}">Entrada (receita)</button></div>`}
      <label class="f">Descrição<input id="lid" maxlength="80" autocomplete="off" value="${esc(nome)}" placeholder="ex.: Padaria"></label>
      <div class="row2"><label class="f">Valor (R$)<input id="liv" class="money" inputmode="decimal" value="${it?fmtN(it.v):''}" placeholder="0,00"></label>
       ${r?'':`<label class="f">Dia<input id="lia" type="number" min="1" max="31" inputmode="numeric" placeholder="1 a 31" value="${selM===new Date().getMonth()&&selY===new Date().getFullYear()?new Date().getDate():''}"></label>`}</div>
      <label class="f">Categoria${sem?' <span class="semcat">— escolha uma</span>':''}${combo('lic',{value:sem?undefined:cat?.id,tipo:tipoCombo,ph:'Buscar categoria…',create:1})}</label>
      <label class="switch"><input type="checkbox" id="lik" ${!it||it.ok?'checked':''}><span class="sw"></span><span><b>Já ${pagar?'pago':'recebido'}</b><br><span class="sub">Só o que está marcado entra nos totais.</span></span></label>
      <div class="auto"><label class="switch"><input type="checkbox" id="lir" ${sem?'checked':''}><span class="sw"></span><span><b>Lembrar para os próximos</b><br><span class="sub">Sempre que aparecer este texto, já vai para a categoria escolhida:</span></span></label>
       <input id="lit" maxlength="40" autocomplete="off" value="${esc(txt)}" placeholder="texto que se repete (ex.: conta vivo)"></div>
      <div class="err" id="lerr" role="alert"></div>
      ${r?`<div class="row cfx"><button type="button" class="btn dan sm" data-ldel>🗑 Excluir lançamento</button></div>`:''}
     </div>
     <div class="df"><button type="button" class="btn dan" data-lclose>Cancelar</button><button class="btn">Salvar</button></div></form>`},
  async excluir(){const r=this.ref,it=this.item();if(!it)return;
    if(!await confirmAsync(`Excluir “${descLimpa(it)}”?`,'Excluir','Cancelar'))return;
    if(it.imp&&cardLinks(it).length)unlinkCardItem(it);
    cellOf(r.cid,r.y,r.m).items.splice(r.idx,1);save();dlg3.close();snackbar('Lançamento excluído.')},
  submit(){const err=t=>{el('lerr').textContent=t},r=this.ref,it=this.item(),desc=el('lid').value.trim().replace(/\s+/g,' '),v=parseV(el('liv').value),dest=Combobox.get('lic');
    if(!desc&&!v)return err('Escreva a descrição ou o valor.');
    if(r&&el('lir').checked&&!dest&&semCategoria(catById(r.cid),it))return err('Escolha a categoria para criar a automação.');
    try{
      let y,m,cid,idx,c;
      if(r){({y,m,cid,idx}=r);const pre=/^\d{2}\/\d{2}\s+/.exec(it.d||'');it.d=(pre?pre[0]:'')+desc;if(!it.lock)it.v=v;it.ok=el('lik').checked;
        const atual=categoriaDe(catById(cid),it);c=atual;
        if(dest&&dest!==atual.id)c=moveLancamento(cid,y,m,idx,dest)}
      else{if(!dest)return err('Escolha a categoria.');y=selY;m=selM;c=catById(dest);const dia=+el('lia').value;
        const pre=dia>=1&&dia<=31?`${String(dia).padStart(2,'0')}/${String(m+1).padStart(2,'0')} `:'';
        useCatInMonth(c.id,y,m);ens(c.id,y,m).items.push({v,d:pre+desc,ok:el('lik').checked})}
      let extra='';
      if(el('lir').checked){const a=addAuto(el('lit').value,c.tipo,c.nome),n=aplicarAutomacoes();extra=` Automação criada: “${a.txt}” → ${c.nome}${n?` (${n} parecido${n>1?'s':''} também organizado${n>1?'s':''})`:''}.`}
      save();dlg3.close();snackbar(`Salvo${c?` em “${c.nome}”`:''}.${extra}`,null,null,9000)
    }catch(e){err(e.message)}}
};
dlg3.addEventListener('click',e=>{let b;
  if(e.target.closest('[data-lclose]'))dlg3.close();
  else if(b=e.target.closest('#lf2 [data-ltipo]')){LancDialog.tipoNovo=b.dataset.ltipo;const d=el('lid').value,v=el('liv').value;LancDialog.draw();el('lid').value=d;el('liv').value=v}
  else if(e.target.closest('[data-ldel]'))LancDialog.excluir()});
dlg3.addEventListener('submit',e=>{if(e.target.id!=='lf2')return;e.preventDefault();LancDialog.submit()});
/* ao escolher a categoria, o texto da automação já fica pronto */
document.addEventListener('cbpick',e=>{if(e.detail.id==='lic'&&el('lir')&&!el('lir').checked&&LancDialog.item()&&semCategoria(catById(LancDialog.ref.cid),LancDialog.item()))el('lir').checked=true});

/* ---- cliques e busca da tela ---- */
app.addEventListener('click',e=>{let b;
  if(b=e.target.closest('[data-mv]')){mesVis=b.dataset.mv;render()}
  else if(b=e.target.closest('[data-lf]')){lancUI.f=b.dataset.lf;mesVis='lanc';render()}
  else if(b=e.target.closest('[data-lanc]')){const p=b.dataset.lanc.split('|');LancDialog.open({cid:p[0],y:+p[1],m:+p[2],idx:+p[3]})}
  else if(e.target.closest('[data-lnew]'))LancDialog.open(null)
  else if(b=e.target.closest('[data-adel]')){delAuto(b.dataset.adel);save();render();snackbar('Automação apagada. Os lançamentos que ela já organizou continuam onde estão.')}});
app.addEventListener('input',e=>{if(e.target.id==='lq'){lancUI.q=e.target.value;refazLista()}});

/* ---- painel das automações (página Categorias) ---- */
function autoPanel(){const l=autos();
  return `<div class="panel"><h2>Automações <span class="sub">${l.length}</span></h2><div style="padding:12px 14px">
   <p class="hint" style="margin:0 0 8px">Regras do tipo “quando o texto tiver <b>conta vivo</b>, vai para <b>Internet</b>”. Elas organizam sozinhas o que chega do extrato ou do banco. Para criar uma, abra um lançamento (tela Mês → Lançamentos) e ligue “Lembrar para os próximos”.</p>
   ${l.length?l.map(a=>{const c=S.cats.find(x=>x.tipo===a.tipo&&normName(x.nome)===normName(a.nome));
     return `<div class="arow"><span class="atx">“${esc(a.txt)}”</span><span class="aar">→</span><span class="acat">${c?catBadge(c):''} ${esc(a.nome)} <span class="sub">${a.tipo==='pagar'?'(despesa)':'(receita)'}</span></span><button type="button" class="btn sec sm" data-adel="${a.id}" title="Apagar esta automação" ${readOnly?'disabled':''}>✕</button></div>`}).join(''):'<p class="hint">Ainda não há automações.</p>'}
   </div></div>`}
