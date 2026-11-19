/* Janela "Mesclar categoria": escolhe a categoria que vai ficar com os lançamentos da outra */
const dlg2=document.getElementById('dlg2');
const MergeDialog={
  src:null,dst:null,modo:'mesclar',
  /* modo 'mesclar': junta os lançamentos na outra categoria · modo 'virar': a categoria inteira vira LANÇAMENTOS da outra, no mesmo mês */
  open(id,modo='mesclar'){this.src=id;this.dst=null;this.modo=modo;const c=catById(id),n=catStats()[id]?.n||0,virar=modo==='virar';
    dlg2.innerHTML=`<div class="dh"><div><h3>${virar?'Virar lançamento de outra categoria':'Mesclar'} — “${esc(c.nome)}”</h3><div class="sub">${virar?`Cada valor de “${esc(c.nome)}” passa a ser um <b>lançamento</b> da categoria que você escolher, no <b>mesmo mês</b>, e “${esc(c.nome)}” deixa de existir como categoria.`:`${n} lançamento(s) serão movidos para a categoria que você escolher, e “${esc(c.nome)}” deixa de existir.`}</div></div></div>
     <div class="db" style="min-height:230px"><div class="fld">${virar?'Virar lançamento da categoria…':'Mesclar dentro de…'}${combo('mg',{tipo:c.tipo,exclude:id,ph:'Buscar a categoria que vai ficar'})}</div><div class="hint" id="mgsum" style="margin-top:14px"></div></div>
     <div class="df"><button class="btn dan" data-mgcancel>Cancelar</button><button class="btn" id="mgok" data-mgok disabled>${virar?'Virar lançamento':'Mesclar'}</button></div>`;
    dlg2.showModal();setTimeout(()=>dlg2.querySelector('#mgin').focus(),0)},
  picked(cid){this.dst=cid;const a=catById(this.src),b=catById(cid);
    let ex='';
    if(this.modo==='virar'){const l=lancamentosParaVirar(this.src),mostra=l.slice(0,4);
      ex=`<br>${l.length} lançamento(s) dentro de “<b>${esc(b.nome)}</b>”${mostra.length?', por exemplo:':'.'}<ul style="margin:6px 0 0 18px;padding:0">${mostra.map(i=>`<li>${esc(MESES[i.m].toLowerCase())}/${i.y}: ${esc(i.d)} — ${R$(i.v)}</li>`).join('')}${l.length>mostra.length?`<li>…e mais ${l.length-mostra.length}</li>`:''}</ul>`}
    dlg2.querySelector('#mgsum').innerHTML=`“<b>${esc(a.nome)}</b>” → “<b>${esc(b.nome)}</b>”${ex}`;dlg2.querySelector('#mgok').disabled=false},
  confirm(){if(!this.dst)return;const a=catById(this.src),b=catById(this.dst);
    if(this.modo==='virar'){let n;try{n=virarLancamento(this.src,this.dst)}catch(e){return alert(e.message)}
      save();dlg2.close();render();snackbar(`“${a.nome}” agora é lançamento de “${b.nome}” (${n} lançamento${n===1?'':'s'}).`);return}
    mergeCat(this.src,this.dst);save();dlg2.close();render()}
};
dlg2.addEventListener('click',e=>{if(e.target.closest('[data-mgcancel]')||e.target===dlg2)dlg2.close();
  else if(e.target.closest('[data-mgok]'))MergeDialog.confirm()});
