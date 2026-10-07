/* Tela Mês */
/* ---------- MÊS ---------- */
function sumBadge(c,y,m){const its=cellOf(c.id,y,m)?.items||[];if(!its.length)return'';const w=its.some(i=>/sem detalhe/.test(i.d));
  const cc=its.some(i=>i.info)?' <span title="Tem valor já incluso na fatura do cartão (não soma)">💳</span>':'';
  return `<span class="sub">${its.length>1?its.length+' itens':esc(its[0].d)}</span>${cc}${w?' <span class="warn" title="A anotação antiga não batia com o total — revise">⚠</span>':''}`}
function rowMes(c,y,m){const r=V(c.id,y,m,'real'),p=V(c.id,y,m,'prev'),neg=c.tipo==='pagar',f=n=>moneyFor(c.tipo,n);
  const main=!p&&!r&&!(cellOf(c.id,y,m)?.items||[]).length?'<span class="zero">+ lançar</span>':`<span class="${neg?'neg':'pos'}" ${r?'':'style="opacity:.5"'}>${f(r)}</span>`;
  return `<tr draggable="true" data-cat="${c.id}" data-tipo="${c.tipo}"><td class="grip" title="Arraste para reordenar">⋮⋮</td>
 <td data-tipcat="${c.id}|${y}|${m}">${esc(c.nome)}${c.dia?` <span class="sub">dia ${c.dia}</span>`:''}<br>${sumBadge(c,y,m)}</td>
 <td class="n"><button class="val" data-open="${c.id}|${y}|${m}" data-tipcell="${c.id}|${y}|${m}">${main}</button>${p!==r?`<div class="sub" style="padding-right:8px">previsto ${f(p)}</div>`:''}</td></tr>`}
function shortcuts(){const st=catStats(),top=S.cats.filter(c=>st[c.id]?.recent).sort((a,b)=>st[b.id].recent-st[a.id].recent).slice(0,7);
  return top.length?`<div class="shortcuts"><span class="sub">Atalhos:</span>${top.map(c=>`<button type="button" class="sc" data-sc="${c.id}"><span class="dot ${c.tipo}"></span>${esc(c.nome)}</button>`).join('')}</div>`:''}
function vMes(){const y=selY,m=selM,R=MT('receber',y,m,'real'),P=MT('pagar',y,m,'real'),Rp=MT('receber',y,m,'prev'),Pp=MT('pagar',y,m,'prev');
  const curY=new Date().getFullYear(),curMo=new Date().getMonth();
  return `<div class="chips">${MESES.map((n,i)=>`<button class="chip ${i===m?'on':''} ${i===curMo&&y===curY?'cur':''}" data-m="${i}">${n}</button>`).join('')}<span class="sub" style="margin-left:8px">${MESES[m]} de ${y}</span></div>
  <div class="cards">
   <div class="card"><div class="l">Recebido</div><div class="v pos">${R$(R)}</div><div class="sub">previsto ${R$(Rp)}</div></div>
   <div class="card"><div class="l">Pago</div><div class="v neg">${RP(P)}</div><div class="sub">previsto ${RP(Pp)}</div></div>
   <div class="card"><div class="l">Saldo do mês</div><div class="v ${R-P>=0?'pos':'neg'}">${R$(R-P)}</div><div class="sub">previsto ${R$(Rp-Pp)}</div></div>
   <div class="card"><div class="l">Acumulado</div><div class="v">${R$(acum(y,m,'real'))}</div><div class="sub">previsto ${R$(acum(y,m,'prev'))}</div></div></div>
  <form class="quick" id="qf">
   <div class="fld">Categoria *${combo('qc',{create:1,ph:'Buscar ou criar…'})}</div>
   <label>Valor (R$) *<input id="qv" class="money" inputmode="decimal" placeholder="0,00" size="12" required></label>
   <label class="grow">O que foi (aparece na anotação)<input id="qd" placeholder="ex.: farmácia"></label>
   <label class="ck"><input type="checkbox" class="ok" id="qk" checked>&nbsp;Já pago/recebido</label>
   <button class="btn">Adicionar em ${MC[m]}/${y}</button>${shortcuts()}</form>
  <div class="two">
   <div class="panel"><h2>A receber <span class="pos">${R$(R)}</span></h2><table>${visCats('receber',y).map(c=>rowMes(c,y,m)).join('')}</table></div>
   <div class="panel"><h2>A pagar <span class="neg">${RP(P)}</span></h2><table>${visCats('pagar',y).map(c=>rowMes(c,y,m)).join('')}</table></div></div>
  <p class="hint">Só o que está marcado como pago/recebido entra nos totais; o resto é previsão. Clique num valor para editar os itens, passe o mouse para espiar, arraste ⋮⋮ para reordenar.</p>`}
