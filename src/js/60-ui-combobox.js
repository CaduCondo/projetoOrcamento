/* Busca de categoria (combobox): ao abrir mostra as mais usadas, ao digitar filtra todas
   e, se permitido, oferece criar a categoria na hora. Avisa a escolha pelo evento "cbpick". */
class Combobox {
  static chosen={};                                   // id do campo -> id da categoria escolhida
  static get(id){return Combobox.chosen[id]||null}
  static set(id,cid){Combobox.chosen[id]=cid;const c=catById(cid),i=document.getElementById(id+'in');if(i&&c)i.value=c.nome}

  /* HTML do campo. opções: value (categoria inicial), tipo (limita a receber/pagar), exclude (id a esconder), create, ph */
  static markup(id,o={}){const c=o.value?catById(o.value):null;Combobox.chosen[id]=c?c.id:null;
    return `<div class="cb" data-id="${id}" data-tipo="${o.tipo||''}" data-create="${o.create?1:0}" data-exclude="${o.exclude||''}"><input class="cbi" id="${id}in" autocomplete="off" placeholder="${o.ph||'Buscar categoria…'}" value="${c?esc(c.nome):''}"><div class="cbl" hidden></div></div>`}

  /* HTML da lista de opções para o texto digitado q */
  static optionsHtml(root,q){const t=root.dataset.tipo,ex=root.dataset.exclude,st=catStats(),nq=normName(q.trim());
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

  static open(root){const box=root.querySelector('.cbl');box.innerHTML=Combobox.optionsHtml(root,root.querySelector('.cbi').value);box.hidden=false;root._act=0;Combobox.mark(root)}
  static close(root){root.querySelector('.cbl').hidden=true}
  static mark(root){const os=[...root.querySelectorAll('.cbo')];os.forEach((o,i)=>o.classList.toggle('act',i===root._act));os[root._act]?.scrollIntoView({block:'nearest'})}
  static pick(root,cid){const c=catById(cid);Combobox.chosen[root.dataset.id]=cid;root.querySelector('.cbi').value=c.nome;Combobox.close(root);
    root.dispatchEvent(new CustomEvent('cbpick',{bubbles:true,detail:{id:root.dataset.id,cid}}))}
  static choose(root,opt){if(!opt)return;if(opt.dataset.pick)Combobox.pick(root,opt.dataset.pick);
    else if(opt.dataset.new){const nome=root.querySelector('.cbi').value.trim().replace(/\s+/g,' ');const c=addCat(opt.dataset.new,nome);save();Combobox.pick(root,c.id)}}

  /* liga os eventos (uma vez só, no documento inteiro) */
  static install(){
    const root=e=>e.target.closest?.('.cb'),isInput=e=>e.target.classList?.contains('cbi');
    document.addEventListener('focusin',e=>{const r=root(e);if(r&&isInput(e)){e.target.select();Combobox.open(r)}});
    document.addEventListener('focusout',e=>{const r=root(e);if(r&&!r.contains(e.relatedTarget))Combobox.close(r)});
    document.addEventListener('input',e=>{const r=root(e);if(r&&isInput(e)){Combobox.chosen[r.dataset.id]=null;Combobox.open(r)}});
    document.addEventListener('keydown',e=>{const r=root(e);if(!r||!isInput(e))return;const n=r.querySelectorAll('.cbo').length;
      if(e.key==='ArrowDown'){e.preventDefault();if(r.querySelector('.cbl').hidden)Combobox.open(r);else{r._act=Math.min(n-1,r._act+1);Combobox.mark(r)}}
      else if(e.key==='ArrowUp'){e.preventDefault();r._act=Math.max(0,r._act-1);Combobox.mark(r)}
      else if(e.key==='Enter'){e.preventDefault();Combobox.choose(r,r.querySelectorAll('.cbo')[r._act])}
      else if(e.key==='Escape')Combobox.close(r)});
    document.addEventListener('mousedown',e=>{const o=e.target.closest?.('.cbo');if(o){e.preventDefault();Combobox.choose(o.closest('.cb'),o)}});
  }
}
Combobox.install();
const combo=Combobox.markup,cbHtml=Combobox.optionsHtml; // atalhos usados pelas telas
