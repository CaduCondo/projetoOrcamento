/* Mesclar categorias */
function mergeCat(src,dst){Object.keys(S.data).filter(k=>k.startsWith(src+'|')).forEach(k=>{const[,y,m]=k.split('|'),nk=`${dst}|${y}|${m}`,v=S.data[k];
    if(S.data[nk])S.data[nk].items.push(...v.items);else S.data[nk]=v;delete S.data[k]});
  const a=S.cats.find(c=>c.id===src),b=S.cats.find(c=>c.id===dst);if(b&&!b.dia&&a?.dia)b.dia=a.dia;S.cats=S.cats.filter(c=>c.id!==src);if(catSel===src)catSel=dst}
let mgSrc=null,mgDst=null;
const dlg2=document.getElementById('dlg2');
function openMerge(id){mgSrc=id;mgDst=null;const c=S.cats.find(x=>x.id===id),n=catStats()[id]?.n||0;
  dlg2.innerHTML=`<div class="dh"><div><h3>Mesclar “${esc(c.nome)}”</h3><div class="sub">${n} lançamento(s) serão movidos para a categoria que você escolher, e “${esc(c.nome)}” deixa de existir.</div></div></div>
   <div class="db" style="min-height:230px"><div class="fld">Mesclar dentro de…${combo('mg',{tipo:c.tipo,exclude:id,ph:'Buscar a categoria que vai ficar'})}</div><p class="hint" id="mgsum" style="margin-top:14px"></p></div>
   <div class="df"><button class="btn dan" data-mgcancel>Cancelar</button><button class="btn" id="mgok" data-mgok disabled>Mesclar</button></div>`;
  dlg2.showModal();setTimeout(()=>dlg2.querySelector('#mgin').focus(),0)}
function mgPicked(cid){mgDst=cid;const a=S.cats.find(c=>c.id===mgSrc),b=S.cats.find(c=>c.id===cid);
  dlg2.querySelector('#mgsum').innerHTML=`“<b>${esc(a.nome)}</b>” → “<b>${esc(b.nome)}</b>”`;dlg2.querySelector('#mgok').disabled=false}
dlg2.addEventListener('click',e=>{if(e.target.closest('[data-mgcancel]')||e.target===dlg2)dlg2.close();
  else if(e.target.closest('[data-mgok]')&&mgDst){mergeCat(mgSrc,mgDst);save();dlg2.close();render()}});
