/* Busca de categoria (combobox) */
/* ---------- BUSCA DE CATEGORIA (combobox) ---------- */
const CBVAL={};
const combo=(id,o={})=>{const c=o.value?S.cats.find(x=>x.id===o.value):null;CBVAL[id]=c?c.id:null;
  return `<div class="cb" data-id="${id}" data-tipo="${o.tipo||''}" data-create="${o.create?1:0}" data-exclude="${o.exclude||''}"><input class="cbi" id="${id}in" autocomplete="off" placeholder="${o.ph||'Buscar categoria…'}" value="${c?esc(c.nome):''}"><div class="cbl" hidden></div></div>`};
function cbHtml(root,q){const t=root.dataset.tipo,ex=root.dataset.exclude,st=catStats(),nq=normName(q.trim());
  const list=S.cats.filter(c=>(!t||c.tipo===t)&&c.id!==ex),rec=c=>st[c.id]?.recent||0,lst=c=>st[c.id]?.last??-1;
  const row=c=>{const x=st[c.id],act=isActive(c,st);return `<div class="cbo" data-pick="${c.id}"><span class="dot ${c.tipo}"></span><span class="nm">${esc(c.nome)}</span><span class="tg">${x?(act?lastLabel(x.last):'antiga · '+lastLabel(x.last)):'nova'}</span></div>`};
  let h='';
  if(!nq){[['pagar','A pagar · mais usadas'],['receber','A receber · mais usadas']].forEach(([tp,lb])=>{
      const a=list.filter(c=>c.tipo===tp&&isActive(c,st)).sort((a,b)=>rec(b)-rec(a)||lst(b)-lst(a)).slice(0,8);if(a.length)h+=`<div class="cbh">${lb}</div>`+a.map(row).join('')});
    h+=`<div class="cbh">Digite para buscar entre as ${list.length} categorias</div>`}
  else{const toks=nq.split(' '),m=list.filter(c=>toks.every(x=>normName(c.nome).includes(x)))
      .sort((a,b)=>(normName(b.nome).startsWith(nq)-normName(a.nome).startsWith(nq))||(isActive(b,st)-isActive(a,st))||rec(b)-rec(a)||lst(b)-lst(a));
    h+=m.slice(0,30).map(row).join('')||'<div class="cbh">Nenhuma categoria encontrada</div>';
    if(m.length>30)h+=`<div class="cbh">+${m.length-30} — continue digitando para filtrar</div>`;
    if(root.dataset.create==='1'&&!list.some(c=>normName(c.nome)===nq))h+=`<div class="cbh">Não achou? Crie agora</div>`+['pagar','receber'].map(tp=>`<div class="cbo" data-new="${tp}"><span class="dot ${tp}"></span><span class="nm">＋ Criar “${esc(q.trim())}” em ${tp==='pagar'?'A pagar':'A receber'}</span></div>`).join('')}
  return h}
function cbOpen(root){const box=root.querySelector('.cbl');box.innerHTML=cbHtml(root,root.querySelector('.cbi').value);box.hidden=false;root._act=0;cbMark(root)}
function cbMark(root){const os=[...root.querySelectorAll('.cbo')];os.forEach((o,i)=>o.classList.toggle('act',i===root._act));os[root._act]?.scrollIntoView({block:'nearest'})}
function cbPick(root,cid){const c=S.cats.find(x=>x.id===cid);CBVAL[root.dataset.id]=cid;root.querySelector('.cbi').value=c.nome;root.querySelector('.cbl').hidden=true;
  root.dispatchEvent(new CustomEvent('cbpick',{bubbles:true,detail:{id:root.dataset.id,cid}}))}
function cbChoose(root,o){if(!o)return;if(o.dataset.pick)cbPick(root,o.dataset.pick);
  else if(o.dataset.new){const nome=root.querySelector('.cbi').value.trim().replace(/\s+/g,' ');const c={id:'c'+Date.now(),tipo:o.dataset.new,nome,dia:null};S.cats.push(c);save();cbPick(root,c.id)}}
document.addEventListener('focusin',e=>{const r=e.target.closest?.('.cb');if(r&&e.target.classList.contains('cbi')){e.target.select();cbOpen(r)}});
document.addEventListener('focusout',e=>{const r=e.target.closest?.('.cb');if(r&&!r.contains(e.relatedTarget))r.querySelector('.cbl').hidden=true});
document.addEventListener('input',e=>{const r=e.target.closest?.('.cb');if(r&&e.target.classList.contains('cbi')){CBVAL[r.dataset.id]=null;cbOpen(r)}});
document.addEventListener('keydown',e=>{const r=e.target.closest?.('.cb');if(!r||!e.target.classList.contains('cbi'))return;
  const n=r.querySelectorAll('.cbo').length;
  if(e.key==='ArrowDown'){e.preventDefault();if(r.querySelector('.cbl').hidden)cbOpen(r);else{r._act=Math.min(n-1,r._act+1);cbMark(r)}}
  else if(e.key==='ArrowUp'){e.preventDefault();r._act=Math.max(0,r._act-1);cbMark(r)}
  else if(e.key==='Enter'){e.preventDefault();cbChoose(r,r.querySelectorAll('.cbo')[r._act])}
  else if(e.key==='Escape'){r.querySelector('.cbl').hidden=true}});
document.addEventListener('mousedown',e=>{const o=e.target.closest?.('.cbo');if(o){e.preventDefault();cbChoose(o.closest('.cb'),o)}});
document.addEventListener('cbpick',e=>{const{id,cid}=e.detail;
  if(id==='qc')document.getElementById('qv')?.focus();
  else if(id==='cs'){catSel=cid;render()}
  else if(id==='mg')mgPicked(cid)});
