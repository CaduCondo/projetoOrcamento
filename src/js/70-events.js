/* Eventos da tela (cliques, formulários, arrastar) */
/* ---------- EVENTOS ---------- */
const app=document.getElementById('app');
document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}});
document.getElementById('hr').addEventListener('click',e=>{
  if(e.target.closest('[data-logout]'))logout();
  else if(e.target.closest('[data-addyear]')){const def=Math.max(...S.anos)+1,v=parseInt(prompt('Qual ano deseja adicionar?',def));
    if(v>=1990&&v<=2100){if(!S.anos.includes(v)){S.anos.push(v);S.anos.sort((a,b)=>a-b);save()}selY=v;selM=0;render()}}});
document.addEventListener('input',e=>{if(e.target.id==='cq'){catUI.q=e.target.value;catUI.lim=40;renderCatList()}});
document.getElementById('hr').addEventListener('change',e=>{if(e.target.id==='ysel'){selY=+e.target.value;render()}});
let dragId=null;
app.addEventListener('dragstart',e=>{const r=e.target.closest?.('tr[data-cat]');if(!r)return;dragId=r.dataset.cat;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);r.classList.add('dragging');tip.style.display='none'});
app.addEventListener('dragover',e=>{const r=e.target.closest?.('tr[data-cat]');if(!r||!dragId)return;
  if(S.cats.find(c=>c.id===dragId).tipo!==r.dataset.tipo)return;e.preventDefault();app.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));r.classList.add('over')});
app.addEventListener('drop',e=>{const r=e.target.closest?.('tr[data-cat]');if(!r||!dragId||r.dataset.cat===dragId)return;e.preventDefault();
  const fi=S.cats.findIndex(c=>c.id===dragId),oti=S.cats.findIndex(c=>c.id===r.dataset.cat),[it]=S.cats.splice(fi,1);
  let ti=S.cats.findIndex(c=>c.id===r.dataset.cat);if(fi<oti)ti++;S.cats.splice(ti,0,it);dragId=null;save();render()});
app.addEventListener('dragend',()=>{dragId=null;app.querySelectorAll('.dragging,.over').forEach(x=>x.classList.remove('dragging','over'))});
app.addEventListener('click',e=>{const t=e.target;let b;
  if(b=t.closest('[data-lm]')){loginMode=b.dataset.lm;render()}
  else if(b=t.closest('[data-modo]')){modo=b.dataset.modo;render()}
  else if(b=t.closest('[data-m]')){selM=+b.dataset.m;render()}
  else if(b=t.closest('[data-open]')){const[c,y,m]=b.dataset.open.split('|');tip.style.display='none';openCell(c,+y,+m)}
  else if(b=t.closest('[data-la]')){S[b.dataset.la].push({nome:'Novo item',valor:0});save();render()}
  else if(b=t.closest('[data-ld]')){const[k,i]=b.dataset.ld.split('|');S[k].splice(+i,1);save();render()}
  else if(b=t.closest('[data-sc]')){const c=S.cats.find(x=>x.id===b.dataset.sc);CBVAL.qc=c.id;document.getElementById('qcin').value=c.nome;document.getElementById('qv').focus()}
  else if(b=t.closest('[data-cf]')){const[k,v]=b.dataset.cf.split('|');catUI[k]=v;catUI.lim=40;render()}
  else if(t.closest('[data-cmore]')){catUI.lim+=40;renderCatList()}
  else if(b=t.closest('[data-cmerge]'))openMerge(b.dataset.cmerge)
  else if(t.closest('[data-cnew]')){const n=document.getElementById('ncn').value.trim().replace(/\s+/g,' ');if(!n){document.getElementById('ncn').focus();return}
    S.cats.push({id:'c'+Date.now(),tipo:document.getElementById('nct').value,nome:n,dia:null});save();catUI.q=n;catUI.filtro='ativas';render()}
  else if(b=t.closest('[data-cdel]')){const c=S.cats.find(x=>x.id===b.dataset.cdel);const nl=catStats()[c.id]?.n||0;if(confirm(nl?`Excluir “${c.nome}” e os ${nl} lançamentos dela (em todos os anos)? Para juntar com outra categoria, use Mesclar.`:`Excluir “${c.nome}”?`)){S.cats=S.cats.filter(x=>x!==c);Object.keys(S.data).filter(k=>k.startsWith(c.id+'|')).forEach(k=>delete S.data[k]);save();render()}}
  else if(t.id==='bk'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download=`orcamento-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()}
  else if(t.id==='csv'){const rows=[['Ano','Tipo','Categoria',...MESES,'Total']];S.anos.forEach(y=>S.cats.forEach(c=>{const v=MESES.map((_,m)=>V(c.id,y,m,'real'));rows.push([y,c.tipo,c.nome,...v.map(x=>x.toFixed(2).replace('.',',')),v.reduce((a,b)=>a+b,0).toFixed(2).replace('.',',')])}));
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv'}));a.download='orcamento.csv';a.click()}});
app.addEventListener('submit',e=>{e.preventDefault();
  if(e.target.id==='lf')doLogin();
  else if(e.target.id==='qf'){const c=CBVAL.qc,v=parseV(qv.value),d=qd.value.trim();if(!c){document.getElementById('qcin').focus();return}if(!v){qv.focus();return}
    ens(c,selY,selM).items.push({v,d,ok:qk.checked});save();render();document.getElementById('qcin').focus()}});
app.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(t.id==='per'){period=t.value;render()}
  else if(t.id==='si'){if(t.value.trim()==='')delete S.saldoIni[selY];else S.saldoIni[selY]=parseV(t.value);save()}
  else if(d.ln){const[k,i]=d.ln.split('|');S[k][i].nome=t.value;save()}
  else if(d.lv){const[k,i]=d.lv.split('|');S[k][i].valor=parseV(t.value);save();render()}
  else if(d.cn){S.cats.find(c=>c.id===d.cn).nome=t.value;save()}
  else if(d.cd){S.cats.find(c=>c.id===d.cd).dia=parseInt(t.value)||null;save()}
  else if(t.id==='imp'){const f=t.files[0];if(!f)return;f.text().then(x=>{try{const o=JSON.parse(x);if(!o.cats||!o.data||!o.anos)throw 0;mergeImport(o)}catch(err){alert('Arquivo de importação inválido.')}t.value=''})}
  else if(t.id==='rs'){const f=t.files[0];if(!f)return;f.text().then(x=>{try{const s=JSON.parse(x);if(!s.cats||!s.data)throw 0;S=mig(s);if(!S.anos.includes(selY))selY=S.anos[S.anos.length-1];save();render()}catch{alert('Arquivo de backup inválido.')}})}});
