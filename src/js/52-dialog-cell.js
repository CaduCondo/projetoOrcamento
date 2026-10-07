/* Janela de itens de uma célula */
/* ---------- DRAWER ---------- */
const dlg=document.getElementById('dlg');let cur=null;
function openCell(cid,y,m){cur={cid,y,m};drawDlg();if(!dlg.open)dlg.showModal()}
function totals(){dlg.querySelector('#dr').textContent=fmtC(V(cur.cid,cur.y,cur.m,'real'));dlg.querySelector('#dp').textContent=fmtC(V(cur.cid,cur.y,cur.m,'prev'))}
const fmtC=n=>moneyFor(catById(cur.cid).tipo,n);
function prevCellRef(){let y=cur.y,m=cur.m-1;if(m<0){m=11;y--}return[y,m]}
function drawDlg(){const c=catById(cur.cid),x=ens(cur.cid,cur.y,cur.m),[py,pm]=prevCellRef(),hasPrev=(cellOf(cur.cid,py,pm)?.items||[]).length;
  dlg.innerHTML=`<div class="dh"><div><h3>${esc(c.nome)} · ${MESES[cur.m]} de ${cur.y}</h3><div class="sub">${c.tipo==='pagar'?'A pagar':'A receber'} — marque o que já foi ${c.tipo==='pagar'?'pago':'recebido'}; só isso entra no total</div></div><button class="btn sec" data-close>Fechar</button></div>
  <div class="db">${x.items.length?x.items.map((i,k)=>`<div class="item ${i.info?'info':i.ok?'':'prev'}"><input type="checkbox" class="ok" data-ik="${k}" ${i.ok&&!i.info?'checked':''} ${i.info?'disabled':''} title="${c.tipo==='pagar'?'Pago':'Recebido'}"><input class="money" data-iv="${k}" value="${fmtN(i.v)}" inputmode="decimal" aria-label="valor"><input data-id="${k}" value="${esc(i.d)}" placeholder="descrição" aria-label="descrição"><button data-info="${k}" class="cc ${i.info?'on':''}" title="Marcar como já incluso na fatura do cartão (informativo, não soma)">💳</button><button data-del="${k}" title="Remover">✕</button></div>`).join(''):'<p class="hint">Nenhum item ainda. Adicione abaixo.</p>'}
   <div class="item" style="margin-top:10px"><input type="checkbox" class="ok" id="nk" checked title="Já ${c.tipo==='pagar'?'pago':'recebido'}"><input id="nv" class="money" placeholder="0,00" inputmode="decimal"><input id="nd" placeholder="descrição (Enter para adicionar)"><span></span><button class="btn" style="padding:4px" data-add title="Adicionar">＋</button></div></div>
  <div class="df"><div><span class="sub">${c.tipo==='pagar'?'Pago':'Recebido'}</span><div class="big" id="dr"></div><div class="sub">Previsto: <span id="dp"></span></div></div>
   <div class="row" style="margin:0"><button class="btn sec sm" data-allok>Marcar todos</button>${hasPrev?`<button class="btn sec sm" data-copyprev title="Copia os itens de ${MESES[pm]} como previsão">Copiar do mês anterior</button>`:''}</div></div>`;
  totals();if(readOnly)lockUi(dlg);else setTimeout(()=>dlg.querySelector('#nv')?.focus(),0)}
function addItem(){const v=parseV(dlg.querySelector('#nv').value),d=dlg.querySelector('#nd').value.trim();if(!v&&!d)return;
  ens(cur.cid,cur.y,cur.m).items.push({v,d,ok:dlg.querySelector('#nk').checked});save();drawDlg()}
dlg.addEventListener('click',e=>{const t=e.target,x=cur&&ens(cur.cid,cur.y,cur.m);
  if(t.closest('[data-close]'))dlg.close();
  else if(t.closest('[data-add]'))addItem();
  else if(t.dataset.del!==undefined){x.items.splice(+t.dataset.del,1);save();drawDlg()}
  else if(t.dataset.info!==undefined){const i=x.items[+t.dataset.info];i.info=!i.info;if(!i.info)delete i.info;save();drawDlg()}
  else if(t.closest('[data-allok]')){x.items.forEach(i=>{if(!i.info)i.ok=true});save();drawDlg()}
  else if(t.closest('[data-copyprev]')){const[py,pm]=prevCellRef();ens(cur.cid,cur.y,cur.m).items=structuredClone(cellOf(cur.cid,py,pm).items.filter(i=>!/sem detalhe/.test(i.d))).map(i=>({...i,ok:false}));save();drawDlg()}
  else if(t===dlg)dlg.close()});
dlg.addEventListener('input',e=>{const t=e.target,x=ens(cur.cid,cur.y,cur.m);
  if(t.dataset.iv!==undefined){x.items[+t.dataset.iv].v=parseV(t.value);save();totals()}
  else if(t.dataset.id!==undefined){x.items[+t.dataset.id].d=t.value;save()}});
dlg.addEventListener('change',e=>{const t=e.target;if(t.dataset.ik!==undefined){ens(cur.cid,cur.y,cur.m).items[+t.dataset.ik].ok=t.checked;save();t.closest('.item').classList.toggle('prev',!t.checked);totals()}});
dlg.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='nv'||e.target.id==='nd')){e.preventDefault();addItem()}});
dlg.addEventListener('close',()=>{cur=null;render()});
