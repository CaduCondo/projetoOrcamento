/* Tela Mês: cartões do mês e as tabelas A receber / A pagar.
   Categorias novas entram pelo botão "＋ Categoria" de cada bloco; o valor é lançado depois, no botão "Lançar" da linha. */
function sumBadge(c,y,m){const its=cellOf(c.id,y,m)?.items||[];if(!its.length)return'';const w=its.some(i=>/sem detalhe/.test(i.d));
  const cc=its.some(i=>i.info)?' <span title="Tem valor já incluso na fatura do cartão (não soma)">💳</span>':'';
  return `${its.length>1?'':`<span class="sub">${esc(its[0].d)}</span>`}${cc}${w?' <span class="warn" title="A anotação antiga não batia com o total — revise">⚠</span>':''}`}
function rowMes(c,y,m){const r=V(c.id,y,m,'real'),p=V(c.id,y,m,'prev'),neg=c.tipo==='pagar',f=n=>moneyFor(c.tipo,n);
  const n=(cellOf(c.id,y,m)?.items||[]).length,vazio=!p&&!r&&!n;
  const main=vazio?'<span class="lancar">＋ Lançar</span>':`<span class="${neg?'neg':'pos'}" ${r?'':'style="opacity:.5"'}>${f(r)}</span>`;
  return `<tr draggable="true" data-cat="${c.id}" data-tipo="${c.tipo}"><td class="grip" title="Arraste para reordenar">⋮⋮</td>
 <td data-tipcat="${c.id}|${y}|${m}">${esc(c.nome)}${c.dia?` <span class="sub">dia ${c.dia}</span>`:''}<br>${sumBadge(c,y,m)}</td>
 <td class="n">${n>1?`<span class="cnt" title="Quantidade de itens que formam este valor">${n} itens</span>`:''}<button class="val" data-open="${c.id}|${y}|${m}" data-tipcell="${c.id}|${y}|${m}">${main}</button>${p!==r?`<div class="sub" style="padding-right:8px">previsto ${f(p)}</div>`:''}</td></tr>`}
/* um bloco (A receber ou A pagar) com as linhas e o botão de nova categoria no canto inferior esquerdo */
function blocoMes(tipo,titulo,total,y,m){
  const linhas=visCats(tipo,y,m).map(c=>rowMes(c,y,m)).join('');
  return `<div class="panel"><h2>${titulo} <span class="${tipo==='pagar'?'neg':'pos'}">${total}</span></h2>
   <table>${linhas||`<tr><td class="sub" style="padding:16px">Nenhuma categoria neste mês. Use “＋ Categoria” para criar a primeira.</td></tr>`}</table>
   <div class="pfoot"><button class="btn sec sm" data-newcat="${tipo}" title="Criar uma categoria de ${tipo==='pagar'?'despesa':'receita'}">＋ Categoria</button></div></div>`}
function vMes(){const y=selY,m=selM,R=MT('receber',y,m,'real'),P=MT('pagar',y,m,'real'),Rp=MT('receber',y,m,'prev'),Pp=MT('pagar',y,m,'prev');
  const curY=new Date().getFullYear(),curMo=new Date().getMonth();
  return `<div class="chips">${MESES.map((n,i)=>`<button class="chip ${i===m?'on':''} ${i===curMo&&y===curY?'cur':''}" data-m="${i}">${n}</button>`).join('')}<span class="sub" style="margin-left:8px">${MESES[m]} de ${y}</span></div>
  <div class="cards">
   <div class="card"><div class="l">Recebido</div><div class="v pos">${R$(R)}</div><div class="sub">previsto ${R$(Rp)}</div></div>
   <div class="card"><div class="l">Pago</div><div class="v neg">${RP(P)}</div><div class="sub">previsto ${RP(Pp)}</div></div>
   <div class="card"><div class="l">Saldo do mês</div><div class="v ${R-P>=0?'pos':'neg'}">${R$(R-P)}</div><div class="sub">previsto ${R$(Rp-Pp)}</div></div>
   <div class="card"><div class="l">Acumulado</div><div class="v">${R$(acum(y,m,'real'))}</div><div class="sub">previsto ${R$(acum(y,m,'prev'))}</div></div></div>
  <div class="two">${blocoMes('receber','A receber',R$(R),y,m)}${blocoMes('pagar','A pagar',RP(P),y,m)}</div>
  <p class="hint">Só o que está marcado como pago/recebido entra nos totais; o resto é previsão. Clique em “Lançar” (ou no valor) para lançar e editar os itens, passe o mouse para espiar, arraste ⋮⋮ para reordenar.</p>`}
