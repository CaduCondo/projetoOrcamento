/* Balões ao passar o mouse (itens da célula e histórico) */
/* ---------- TOOLTIP ---------- */
const tip=document.getElementById('tip');
function tipCell(cid,y,m){const c=S.cats.find(x=>x.id===cid),its=cellOf(cid,y,m)?.items||[];
  const neg=c.tipo==='pagar',f=n=>neg?RP(n):R$(n);
  if(!its.length)return `<b>${esc(c.nome)} · ${MC[m]}/${y}</b><br><span style="opacity:.7">Sem lançamentos</span>`;
  return `<b>${esc(c.nome)} · ${MC[m]}/${y}</b><table>${its.map(i=>`<tr style="${i.info||!i.ok?'opacity:.65':''}"><td>${i.info?'💳':i.ok?'✓':'○'} ${esc(i.d||'(sem descrição)')}</td><td class="tn">${f(i.v)}</td></tr>`).join('')}
   ${its.some(i=>i.info)?'<tr><td colspan="2" style="opacity:.7">💳 = já está na fatura do cartão (não soma)</td></tr>':''}<tr><td><b>Realizado</b></td><td class="tn"><b>${f(V(cid,y,m,'real'))}</b></td></tr><tr><td>Previsto</td><td class="tn">${f(V(cid,y,m,'prev'))}</td></tr></table>`}
function tipCat(cid,y,m){const c=S.cats.find(x=>x.id===cid),neg=c.tipo==='pagar',f=n=>neg?RP(n):R$(n);
  const ms=prevMonths(y,m,6).map(([yy,mm])=>[yy,mm,V(cid,yy,mm,'real'),V(cid,yy,mm,'prev')]),mx=Math.max(1,...ms.map(x=>Math.max(x[2],x[3]))),n=ms.filter(x=>x[3]>0);
  return `<b>${esc(c.nome)}</b> <span style="opacity:.7">— últimos 6 meses</span><table>${ms.map(([yy,mm,r,p])=>`<tr><td>${MC[mm]}/${String(yy).slice(2)}</td><td><span class="bar" style="width:${Math.round(r/mx*90)}px"></span></td><td class="tn">${f(r)}</td>${p!==r?`<td class="tn" style="opacity:.6">prev. ${f(p)}</td>`:'<td></td>'}</tr>`).join('')}</table>
   <div style="opacity:.75;margin-top:4px">Média: ${f(n.length?n.reduce((a,x)=>a+x[2],0)/n.length:0)}</div>`}
document.addEventListener('mouseover',e=>{const t=e.target.closest?.('[data-tipcell],[data-tipcat]');if(!t){tip.style.display='none';return}
  const d=t.dataset.tipcell||t.dataset.tipcat,[c,y,m]=d.split('|');tip.innerHTML=t.dataset.tipcell?tipCell(c,+y,+m):tipCat(c,+y,+m);tip.style.display='block'});
document.addEventListener('mousemove',e=>{if(tip.style.display==='none')return;const w=tip.offsetWidth,h=tip.offsetHeight;
  let x=e.clientX+16,y=e.clientY+16;if(x+w>innerWidth-8)x=e.clientX-w-16;if(y+h>innerHeight-8)y=Math.max(8,innerHeight-h-8);tip.style.left=x+'px';tip.style.top=y+'px'});
