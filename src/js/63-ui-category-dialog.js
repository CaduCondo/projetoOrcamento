/* Janela de categoria: criar e editar (página Categorias).
   Nome, dia (1 a 31) e "onde aparece": só onde eu incluir no mês · o ano todo · (ao editar) só este mês · deste mês em diante.
   Ao editar, a mudança vale do mês escolhido em diante — o passado não muda — ou, se marcado, em todos os meses (corrigir um erro). */
const dlg3=el('dlg3');
const CategoryDialog={
  mode:'new',tipo:null,id:null,y:0,m:0,
  openNew(tipo,nome=''){Object.assign(this,{mode:'new',tipo,id:null,y:selY,m:selM});this.draw({nome,dia:'',scope:'lib',todos:false});dlg3.showModal();setTimeout(()=>el('cfn')?.focus(),0)},
  openEdit(id){const c=catById(id);Object.assign(this,{mode:'edit',tipo:c.tipo,id,y:selY,m:selM});this.draw({nome:c.nome,dia:c.dia??'',scope:scopeOf(c),todos:false});dlg3.showModal()},

  /* textos das 3 opções */
  labels(){const novo=this.mode==='new',{y,m}=this;
    return novo?{lib:'Só onde eu incluir no mês (recomendado)',ano:`O ano todo (${y}): aparece em todos os meses de ${y}`}
               :{lib:'Só onde eu incluir no mês',mes:'Só neste mês',ano:'Deste mês até dezembro do mesmo ano',futuro:'Deste mês em diante (até o mês atual; meses futuros começam vazios)'}},
  draw(v){const novo=this.mode==='new',pagar=this.tipo==='pagar',L=this.labels(),c=novo?null:catById(this.id);
    const dica=pagar?'Lembrete do dia do vencimento: o dia em que essa conta precisa ser paga.':'Lembrete do dia em que esse dinheiro entra (ou deveria entrar).';
    dlg3.innerHTML=`<form id="cf" novalidate>
     <div class="dh"><div><h3>${novo?'Nova categoria':'Editar categoria'} · ${pagar?'Despesas':'Receitas'}</h3>
       <div class="sub">${novo?'Depois de criar, inclua a categoria no mês pela tela Mês (botão “＋ Categoria”) e lance o valor.':`Hoje: ${esc(scopeLabel(c)||'categoria do histórico')}`}</div></div>
       <button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">
      ${novo?'':`<div class="note"><b>Quando vale a mudança?</b>
        <label class="radio"><input type="radio" name="cfq" value="daqui" ${v.todos?'':'checked'}> A partir de
          <select id="cfm" aria-label="mês">${MESES.map((n,i)=>`<option value="${i}" ${i===this.m?'selected':''}>${n}</option>`).join('')}</select>
          <select id="cfy" aria-label="ano">${S.anos.map(a=>`<option ${a===this.y?'selected':''}>${a}</option>`).join('')}</select> — o que passou não muda</label>
        <label class="radio"><input type="radio" name="cfq" value="todos" ${v.todos?'checked':''}> Em todos os meses (corrigir um erro, como um acento no nome)</label></div>`}
      <label class="f">Nome *<input id="cfn" maxlength="60" autocomplete="off" value="${esc(v.nome)}" placeholder="ex.: Salário"></label>
      <label class="f"><span>Dia do mês (1 a 31) <span class="info" title="${dica}">ⓘ</span></span><input id="cfd" type="number" min="1" max="31" inputmode="numeric" value="${v.dia}" placeholder="opcional"></label>
      <p class="hint" style="margin-top:-6px">${dica}</p>
      <fieldset class="scope" id="cfsc"><legend>Onde esta categoria aparece</legend>
       ${(novo?['lib','ano']:SCOPES).map(s=>`<label class="radio"><input type="radio" name="cfs" value="${s}" ${v.scope===s?'checked':''}> <span data-scl="${s}">${L[s]}</span></label>`).join('')}
      </fieldset>
      <div class="err" id="cferr" role="alert"></div></div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button class="btn">${novo?'Criar categoria':'Salvar alteração'}</button></div></form>`;
    this.syncScope()},
  /* "em todos os meses" não mexe na vigência: bloqueia as 3 opções */
  syncScope(){const todos=dlg3.querySelector('input[name=cfq]:checked')?.value==='todos';
    dlg3.querySelectorAll('input[name=cfs]').forEach(r=>{r.disabled=todos});el('cfsc')?.classList.toggle('off',todos)},
  submit(){const err=t=>{el('cferr').textContent=t},input={nome:el('cfn').value,dia:el('cfd').value},scope=dlg3.querySelector('input[name=cfs]:checked')?.value||(this.mode==='new'?'lib':'futuro');
    try{
      if(this.mode==='new')createCat(this.tipo,input,scope,this.y,this.m);
      else if(dlg3.querySelector('input[name=cfq]:checked')?.value==='todos')renameCatEverywhere(this.id,input);
      else reviseCat(this.id,input,scope,this.y,this.m);
    }catch(e){return err(e.message)}
    save();dlg3.close()}
};
dlg3.addEventListener('click',e=>{if(e.target.closest('[data-cclose]')||e.target===dlg3)dlg3.close()});
dlg3.addEventListener('change',e=>{
  if(e.target.id==='cfm')CategoryDialog.m=+e.target.value;
  else if(e.target.id==='cfy')CategoryDialog.y=+e.target.value;
  else if(e.target.name==='cfq')CategoryDialog.syncScope()});
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
