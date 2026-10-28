/* Janela de categoria (página Categorias): criar e editar, num lugar só.
   Campos: nome, dia (1 a 31) e "Fixa — aparece todo mês". Na edição também: Mesclar e Excluir.
   Mudanças de nome/dia valem do MÊS ATUAL em diante: os meses anteriores continuam com o nome antigo (o app avisa). */
const dlg3=el('dlg3');
const hojeYM=()=>{const d=new Date();return[d.getFullYear(),d.getMonth()]};
const CategoryDialog={
  mode:'new',tipo:null,id:null,
  openNew(tipo,nome=''){Object.assign(this,{mode:'new',tipo,id:null,ico:'',cor:''});this.draw({nome,dia:'',fixa:false});dlg3.showModal();setTimeout(()=>el('cfn')?.focus(),0)},
  openEdit(id){if(readOnly)return;const c=catById(id);Object.assign(this,{mode:'edit',tipo:c.tipo,id,ico:c.ico||'',cor:c.cor||''});this.draw({nome:c.nome,dia:c.dia??'',fixa:!!c.fixa});dlg3.showModal()},
  draw(v){const novo=this.mode==='new',pagar=this.tipo==='pagar',c=novo?null:catById(this.id),[y,m]=hojeYM(),st=c?catStats()[c.id]:null;
    const dica=pagar?'Dia em que essa conta vence.':'Dia em que esse dinheiro entra.';
    dlg3.innerHTML=`<form id="cf" novalidate>
     <div class="dh"><div><h3>${novo?(pagar?'Nova despesa':'Nova receita'):esc(c.nome)}</h3>
       <div class="sub">${novo?'Depois, inclua no mês pela tela Mês (“＋ Categoria”) ou marque como fixa.':`${pagar?'Despesa':'Receita'} · ${esc(scopeLabel(c)||'aparece quando usada')}${st?` · ${st.n} lançamento(s), último em ${lastLabel(st.last)}`:''}`}</div></div>
       <button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">
      <label class="f">Nome *<input id="cfn" maxlength="60" autocomplete="off" value="${esc(v.nome)}" placeholder="${pagar?'ex.: Aluguel':'ex.: Salário'}"></label>
      <label class="f"><span>Dia do mês (opcional) <span class="info" title="${dica}">ⓘ</span></span><input id="cfd" type="number" min="1" max="31" inputmode="numeric" value="${v.dia}" placeholder="1 a 31"></label>
      <label class="switch"><input type="checkbox" id="cff" ${v.fixa?'checked':''}><span class="sw"></span><span><b>Fixa — aparece todo mês</b><br><span class="sub">Ex.: aluguel, salário. Desligada: aparece só quando você inclui no mês ou quando tem lançamento.</span></span></label>
      <div class="f"><span>Ícone e cor <span class="sub">(só enfeite, para achar a categoria de relance)</span></span><div id="cfvis">${this.visual()}</div></div>
      ${novo?'':`<div class="note" id="cfnote">✏️ Mudanças no <b>nome</b> ou no <b>dia</b> valem de <b>${MESES[m].toLowerCase()}/${y}</b> em diante. Os meses anteriores continuam como estão.</div>`}
      <div class="err" id="cferr" role="alert"></div>
      ${novo?'':`<div class="row cfx"><button type="button" class="btn sec sm" data-cmerge="${c.id}" title="Juntar os lançamentos desta categoria com outra">🔀 Mesclar com outra…</button><button type="button" class="btn dan sm" data-cdel="${c.id}">🗑 Excluir</button></div>`}
     </div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button class="btn">${novo?'Criar':'Salvar'}</button></div></form>`},
  /* escolha de ícone e cor: botões pequenos; clicar de novo no que está marcado desmarca (volta ao automático) */
  visual(){const sug=catIco({nome:el('cfn')?.value||'',ico:''}),i=this.ico,c=this.cor;
    return `<div class="picker">${ICONES.map(x=>`<button type="button" class="pk ${x===i?'on':''}" data-pico="${x}" aria-label="ícone ${x}">${x}</button>`).join('')}</div>
     <div class="picker">${CORES.map(x=>`<button type="button" class="pk cor ${x===c?'on':''}" data-pcor="${x}" style="background:${x}" aria-label="cor ${x}"></button>`).join('')}</div>
     <div class="sub">${i||c?`Escolhido: ${catBadge({tipo:this.tipo,ico:i,cor:c,nome:el('cfn')?.value||''})}`:`Automático${sug?`: ${sug} pelo nome`:''}`}</div>`},
  pick(k,v){this[k]=this[k]===v?'':v;el("cfvis").innerHTML=this.visual()},
  submit(){const err=t=>{el('cferr').textContent=t},input={nome:el('cfn').value,dia:el('cfd').value},fixa=el('cff').checked,[y,m]=hojeYM();
    let msg='';
    try{
      if(this.mode==='new'){const n=createCat(this.tipo,input,fixa?'fixa':'lib',y,m);this.guardaVisual(n)}
      else{const c=catById(this.id),limpo=cleanInput(input),mudou=limpo.nome!==c.nome||(limpo.dia||null)!==(c.dia||null);
        let alvo=c;
        if(mudou){const antigo=c.nome;alvo=reviseCat(c.id,input,'manter',y,m);
          msg=alvo!==c?`“${antigo}” passa a ser “${alvo.nome}” de ${MESES[m].toLowerCase()}/${y} em diante. Os meses anteriores continuam com o nome antigo.`:'Categoria atualizada.'}
        if(fixa!==!!alvo.fixa){setFixa(alvo.id,fixa,y,m);msg=msg||(fixa?'Agora ela aparece todo mês.':`Deixou de ser fixa de ${MESES[m].toLowerCase()}/${y} em diante.`)}
        this.guardaVisual(alvo);if(alvo!==c)this.guardaVisual(c)}
    }catch(e){return err(e.message)}
    save();dlg3.close();if(msg)snackbar(msg,null,null,9000)}
  ,guardaVisual(c){this.ico?c.ico=this.ico:delete c.ico;this.cor?c.cor=this.cor:delete c.cor}
};
dlg3.addEventListener('click',e=>{const t=e.target;let b;
  if(b=t.closest('[data-pico]'))CategoryDialog.pick('ico',b.dataset.pico);
  else if(b=t.closest('[data-pcor]'))CategoryDialog.pick('cor',b.dataset.pcor);
  else if(t.closest('[data-cclose]')||t===dlg3)dlg3.close();
  else if(b=t.closest('#cf [data-cmerge]')){const id=b.dataset.cmerge;dlg3.close();MergeDialog.open(id)}
  else if(b=t.closest('#cf [data-cdel]')){const id=b.dataset.cdel;dlg3.close();confirmDeleteCat(id)}});
dlg3.addEventListener('submit',e=>{if(e.target.id!=='cf')return;e.preventDefault();CategoryDialog.submit()});
dlg3.addEventListener('close',()=>render());

/* Janela da tela Mês: INCLUIR neste mês uma categoria que já existe.
   Conforme a pessoa digita, a lista mostra as categorias cujo nome tem o texto em qualquer parte (sem ligar para acento ou maiúscula). */
const UseCategoryDialog={
  tipo:null,y:0,m:0,
  open(tipo){Object.assign(this,{tipo,y:selY,m:selM});const pagar=tipo==='pagar';
    dlg3.innerHTML=`<form id="uf" novalidate>
     <div class="dh"><div><h3>Incluir categoria · ${pagar?'Despesas':'Receitas'}</h3><div class="sub">em ${MESES[this.m]} de ${this.y}</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db"><label class="f">Nome da categoria<input id="ufq" autocomplete="off" placeholder="Digite parte do nome, ex.: sal"></label>
      <div id="ufl" class="ulist" role="listbox"></div>
      <p class="hint">Só aparecem categorias que já existem e ainda não estão neste mês. Para criar, editar ou excluir categorias, use a página <a data-gocat>Categorias</a>.</p></div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button></div></form>`;
    this.list('');dlg3.showModal();setTimeout(()=>el('ufq')?.focus(),0)},
  list(q){const l=pickableCats(this.tipo,this.y,this.m,q),st=catStats(),box=el('ufl');if(!box)return;
    const row=c=>{const x=st[c.id];return `<button type="button" class="uopt" role="option" data-upick="${c.id}"><span class="dot ${c.tipo}"></span><span class="nm">${esc(c.nome)}</span><span class="tg">${x?'último uso '+lastLabel(x.last):'sem lançamentos'}</span></button>`};
    box.innerHTML=l.slice(0,30).map(row).join('')+(l.length>30?`<div class="hint">+${l.length-30} — continue digitando para filtrar</div>`:'')
      ||(q.trim()?`<div class="hint">Nenhuma categoria com “${esc(q.trim())}”. <a data-gocat="${esc(q.trim())}">Criar “${esc(q.trim())}” na página Categorias</a></div>`:'<div class="hint">Todas as categorias deste tipo já estão neste mês.</div>')},
  pick(id){useCatInMonth(id,this.y,this.m);save();dlg3.close();snackbar(`“${catById(id).nome}” incluída em ${MESES[this.m].toLowerCase()}/${this.y}.`)},
  gocat(nome){dlg3.close();tab='cat';render();CategoryDialog.openNew(this.tipo,nome||'')}
};
dlg3.addEventListener('input',e=>{if(e.target.id==='ufq')UseCategoryDialog.list(e.target.value)});
dlg3.addEventListener('click',e=>{let b;
  if(b=e.target.closest('[data-upick]'))UseCategoryDialog.pick(b.dataset.upick);
  else if(b=e.target.closest('[data-gocat]'))UseCategoryDialog.gocat(b.dataset.gocat)});
dlg3.addEventListener('submit',e=>{if(e.target.id==='uf'){e.preventDefault();const o=dlg3.querySelector('[data-upick]');if(o)UseCategoryDialog.pick(o.dataset.upick)}});
