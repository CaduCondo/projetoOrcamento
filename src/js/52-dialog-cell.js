/* Janela de itens de uma célula */
/* ---------- DRAWER ---------- */
const dlg=document.getElementById('dlg');let cur=null;
function openCell(cid,y,m){cur={cid,y,m};drawDlg();if(!dlg.open)dlg.showModal()}
function totals(){dlg.querySelector('#dr').textContent=fmtC(V(cur.cid,cur.y,cur.m,'real'));dlg.querySelector('#dp').textContent=fmtC(V(cur.cid,cur.y,cur.m,'prev'))}
const fmtC=n=>moneyFor(catById(cur.cid).tipo,n);
function prevCellRef(){let y=cur.y,m=cur.m-1;if(m<0){m=11;y--}return[y,m]}
function drawDlg(){const c=catById(cur.cid),x=ens(cur.cid,cur.y,cur.m),[py,pm]=prevCellRef(),hasPrev=(cellOf(cur.cid,py,pm)?.items||[]).length;
  dlg.innerHTML=`<div class="dh"><div><h3>${esc(c.nome)} · ${MESES[cur.m]} de ${cur.y}</h3><div class="sub">${c.tipo==='pagar'?'Despesas':'Receitas'} — marque o que já foi ${c.tipo==='pagar'?'pago':'recebido'}; só isso entra no total</div></div><button class="btn sec" data-close>Fechar</button></div>
  <div class="db">${x.items.length?x.items.map((i,k)=>`<div class="item ${i.info?'info':i.ok?'':'prev'}"><input type="checkbox" class="ok" data-ik="${k}" ${i.ok&&!i.info?'checked':''} ${i.info?'disabled':''} title="${c.tipo==='pagar'?'Pago':'Recebido'}"><input class="money" data-iv="${k}" value="${fmtN(i.v)}" inputmode="decimal" aria-label="valor" ${i.lock?'readonly title="Valor vindo do cartão: não se altera aqui"':''}><input data-id="${k}" value="${esc(i.d)}" placeholder="descrição" aria-label="descrição"><button data-info="${k}" class="cc ${i.info?'on':''}" ${i.lock?'disabled title="Este valor veio da fatura do cartão: o 💳 fica fixo (senão contaria duas vezes)"':'title="Marcar como já incluso na fatura do cartão (informativo, não soma)"'}>💳</button><button data-del="${k}" title="Remover">✕</button></div>${itemActions(c,i,k)}`).join(''):'<p class="hint">Nenhum item ainda. Adicione abaixo.</p>'}
   <div class="item" style="margin-top:10px"><input type="checkbox" class="ok" id="nk" checked title="Já ${c.tipo==='pagar'?'pago':'recebido'}"><input id="nv" class="money" placeholder="0,00" inputmode="decimal"><input id="nd" placeholder="descrição (Enter para adicionar)"><span></span><button class="btn" style="padding:4px" data-add title="Adicionar">＋</button></div></div>
  <div class="df"><div><span class="sub">${c.tipo==='pagar'?'Pago':'Recebido'}</span><div class="big" id="dr"></div><div class="sub">Previsto: <span id="dp"></span></div></div>
   <div class="row" style="margin:0"><button class="btn sec sm" data-allok>Marcar todos</button>${hasPrev?`<button class="btn sec sm" data-copyprev title="Copia os itens de ${MESES[pm]} como previsão">Copiar do mês anterior</button>`:''}</div></div>
  <div class="df rm"><span class="sub">${x.items.length?'Para tirar esta categoria do mês, apague antes todos os itens.':`Não vai usar “${esc(c.nome)}” em ${MESES[cur.m].toLowerCase()}?`}</span>
   <button type="button" class="btn dan sm" data-rmmonth ${x.items.length?'disabled title="Tem lançamentos neste mês"':`title="Tira a categoria só deste mês; os outros meses não mudam"`}>Tirar do mês</button></div>`;
  totals();if(readOnly)lockUi(dlg);else setTimeout(()=>dlg.querySelector('#nv')?.focus(),0)}
function addItem(){const v=parseV(dlg.querySelector('#nv').value),d=dlg.querySelector('#nd').value.trim();if(!v&&!d)return;
  ens(cur.cid,cur.y,cur.m).items.push({v,d,ok:dlg.querySelector('#nk').checked});save();drawDlg()}
dlg.addEventListener('click',e=>{const t=e.target,x=cur&&ens(cur.cid,cur.y,cur.m);
  if(t.closest('[data-close]'))dlg.close();
  else if(t.closest('[data-add]'))addItem();
  else if(t.dataset.del!==undefined)delItem(+t.dataset.del)
  else if(t.dataset.tocat!==undefined)itemToCategory(+t.dataset.tocat)
  else if(t.dataset.toex!==undefined)itemToExisting(+t.dataset.toex)
  else if(t.dataset.unlink!==undefined){unlinkCardItem(x.items[+t.dataset.unlink]);save();drawDlg()}
  else if(t.dataset.info!==undefined){const i=x.items[+t.dataset.info];if(i.lock)return;i.info=!i.info;if(!i.info)delete i.info;save();drawDlg()}
  else if(t.closest('[data-allok]')){x.items.forEach(i=>{if(!i.info)i.ok=true});save();drawDlg()}
  else if(t.closest('[data-copyprev]')){const[py,pm]=prevCellRef();ens(cur.cid,cur.y,cur.m).items=structuredClone(cellOf(cur.cid,py,pm).items.filter(i=>!/sem detalhe/.test(i.d))).map(i=>({...i,ok:false}));save();drawDlg()}
  else if(t.closest('[data-rmmonth]'))removeFromMonthUi();
  else if(t===dlg)dlg.close()});
dlg.addEventListener('input',e=>{const t=e.target,x=ens(cur.cid,cur.y,cur.m);
  if(t.dataset.iv!==undefined){x.items[+t.dataset.iv].v=parseV(t.value);save();totals()}
  else if(t.dataset.id!==undefined){x.items[+t.dataset.id].d=t.value;save()}});
dlg.addEventListener('change',e=>{const t=e.target;if(t.dataset.ik!==undefined){ens(cur.cid,cur.y,cur.m).items[+t.dataset.ik].ok=t.checked;save();t.closest('.item').classList.toggle('prev',!t.checked);totals()}});
dlg.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='nv'||e.target.id==='nd')){e.preventDefault();addItem()}});
dlg.addEventListener('close',()=>{cur=null;render()});

/* tirar a categoria do mês: 2 passos (botão na janela + confirmação) e "Desfazer" depois, para não acontecer sem querer */
async function removeFromMonthUi(){if(readOnly||!cur)return;const{cid,y,m}=cur,c=catById(cid);
  if(!await confirmAsync(`Tirar “${c.nome}” de ${MESES[m]} de ${y}? Ela some só deste mês; os outros meses e a categoria continuam como estão.`,'Tirar do mês','Cancelar'))return;
  const antes=JSON.stringify(c);
  try{removeCatFromMonth(cid,y,m)}catch(e){return alert(e.message)}
  save();dlg.close();
  snackbar(`“${c.nome}” saiu de ${MESES[m].toLowerCase()}/${y}.`,'Desfazer',()=>{const i=S.cats.findIndex(x=>x.id===cid);if(i>=0){S.cats[i]=JSON.parse(antes);save();render()}})}

/* ---- itens que vieram da importação (fatura do cartão / extrato da conta) ---- */
const nomeDe=key=>catById(parseKey(key).c)?.nome||'?';
/* linha de ações embaixo do item */
function itemActions(c,i,k){
  if(readOnly)return'';
  if(i.lock)return`<div class="itact sub">💳 veio da fatura do cartão: por isso não soma. Para desfazer, apague este item (✕) ou use “Desfazer” no item do cartão.</div>`;
  if(!i.imp)return'';
  if(i.imp.startsWith('cartao|')){const ls=cardLinks(i);
    return ls.length?`<div class="itact">✓ Levado para <b>${ls.map(l=>esc(nomeDe(l.key))).join(', ')}</b> (só informativo; este valor continua somando aqui) <button type="button" class="btn sec sm" data-unlink="${k}" title="Apaga a cópia informativa">Desfazer</button></div>`
      :`<div class="itact"><button type="button" class="btn sec sm" data-tocat="${k}" title="Cria uma categoria neste mês com este valor (💳, não soma)">→ Virar categoria</button><button type="button" class="btn sec sm" data-toex="${k}" title="Lança este valor (💳, não soma) numa categoria que já existe">→ Lançar em categoria</button></div>`}
  return`<div class="itact"><button type="button" class="btn sec sm" data-tocat="${k}" title="Tira daqui e cria uma categoria neste mês com este valor">→ Virar categoria</button><button type="button" class="btn sec sm" data-toex="${k}" title="Tira daqui e lança numa categoria que já existe">→ Lançar em categoria</button></div>`}
/* nome sugerido: tira a data do começo e o "03/12" de parcela */
const nomeSugerido=d=>d.replace(/^\d{2}\/\d{2}\s+/,'').replace(/\s+\d{2}\/\d{2}$/,'').trim();
async function itemToCategory(k){const x=ens(cur.cid,cur.y,cur.m),it=x.items[k],cartao=it.imp.startsWith('cartao|');
  const nome=await askText(cartao?'Virar categoria (só informativa)':'Virar categoria',cartao?'Nome da categoria (aparece nas Despesas do mês com 💳 e não soma)':'Nome da categoria',nomeSugerido(it.d));
  if(!nome)return;
  try{cartao?cardItemToCategory(cur.cid,cur.y,cur.m,k,nome):contaItemMove(cur.cid,cur.y,cur.m,k,{nome})}catch(e){return alert(e.message)}
  save();drawDlg();snackbar(`Categoria “${nome}” criada em ${MESES[cur.m].toLowerCase()}/${cur.y}${cartao?' (com 💳: não soma; o valor continua no cartão)':' (o valor saiu da Movimentação)'}.`)}
async function itemToExisting(k){const x=ens(cur.cid,cur.y,cur.m),it=x.items[k],cartao=it.imp.startsWith('cartao|');
  const r=await askChoice({titulo:'Lançar em qual categoria?',texto:`<p class="hint">${cartao?'O valor entra na categoria escolhida com o 💳 (informativo, não soma) e continua somando no cartão.':'O valor sai da Movimentação e passa a somar na categoria escolhida.'}</p>${combo('mvc',{tipo:cartao?'pagar':'',ph:'Buscar categoria…'})}`,
    opcoes:[{id:'ok',label:'Lançar nesta categoria',cls:''},{id:'',label:'Cancelar',cls:'dan'}]});
  if(r!=='ok')return;const dest=Combobox.get('mvc');if(!dest)return alert('Escolha uma categoria da lista.');
  try{cartao?cardItemToExisting(cur.cid,cur.y,cur.m,k,dest):contaItemMove(cur.cid,cur.y,cur.m,k,dest)}catch(e){return alert(e.message)}
  save();drawDlg();snackbar(`Lançado em “${catById(dest).nome}”.`)}
/* apagar item: se for do cartão e já foi levado para outras categorias, apaga as cópias junto (com confirmação) */
async function delItem(k){const x=ens(cur.cid,cur.y,cur.m),it=x.items[k];
  if(it.imp&&cardLinks(it).length){if(!await confirmAsync('Este item do cartão foi levado para outra categoria. Apagar também a cópia informativa de lá?','Apagar os dois','Cancelar'))return;unlinkCardItem(it)}
  x.items.splice(k,1);save();drawDlg()}
