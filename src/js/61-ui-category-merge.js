/* Janela "Mesclar categoria": escolhe a categoria que vai ficar com os lançamentos da outra */
const dlg2=document.getElementById('dlg2');
const MergeDialog={
  src:null,dst:null,
  open(id){this.src=id;this.dst=null;const c=catById(id),n=catStats()[id]?.n||0;
    dlg2.innerHTML=`<div class="dh"><div><h3>Mesclar “${esc(c.nome)}”</h3><div class="sub">${n} lançamento(s) serão movidos para a categoria que você escolher, e “${esc(c.nome)}” deixa de existir.</div></div></div>
     <div class="db" style="min-height:230px"><div class="fld">Mesclar dentro de…${combo('mg',{tipo:c.tipo,exclude:id,ph:'Buscar a categoria que vai ficar'})}</div><p class="hint" id="mgsum" style="margin-top:14px"></p></div>
     <div class="df"><button class="btn dan" data-mgcancel>Cancelar</button><button class="btn" id="mgok" data-mgok disabled>Mesclar</button></div>`;
    dlg2.showModal();setTimeout(()=>dlg2.querySelector('#mgin').focus(),0)},
  picked(cid){this.dst=cid;const a=catById(this.src),b=catById(cid);
    dlg2.querySelector('#mgsum').innerHTML=`“<b>${esc(a.nome)}</b>” → “<b>${esc(b.nome)}</b>”`;dlg2.querySelector('#mgok').disabled=false},
  confirm(){if(!this.dst)return;mergeCat(this.src,this.dst);save();dlg2.close();render()}
};
dlg2.addEventListener('click',e=>{if(e.target.closest('[data-mgcancel]')||e.target===dlg2)dlg2.close();
  else if(e.target.closest('[data-mgok]'))MergeDialog.confirm()});
