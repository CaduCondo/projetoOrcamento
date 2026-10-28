/* Tela Mês: cartões do mês e as tabelas Receitas / Despesas.
   Cada bloco tem o botão "＋ Categoria", que INCLUI neste mês uma categoria que já existe (criar, editar e excluir ficam na página Categorias). */
function sumBadge(c,y,m){const its=cellOf(c.id,y,m)?.items||[];if(!its.length)return'';const w=its.some(i=>/sem detalhe/.test(i.d));
  const cc=its.some(i=>i.info)?' <span title="Tem valor já incluso na fatura do cartão (não soma)">💳</span>':'';
  return `${its.length>1?'':`<span class="sub">${esc(its[0].d)}</span>`}${cc}${w?' <span class="warn" title="A anotação antiga não batia com o total — revise">⚠</span>':''}`}
/* ordem das linhas: clique no título da coluna (1º clique crescente, 2º decrescente, 3º volta à ordem manual; ao abrir a tela já vem por Dia). Cada bloco tem a sua. */
const mesSort={receber:{col:'dia',dir:1},pagar:{col:'dia',dir:1}};      // ao abrir: pela coluna Dia
/* m = null: tela Ano (o valor é o total do ano) */
function sortMes(list,tipo,y,m){const{col,dir}=mesSort[tipo];if(col==='manual')return list;
  const nome=c=>normName(c.nome),val=c=>m==null?MC.reduce((s,_,i)=>s+V(c.id,y,i,'real'),0):V(c.id,y,m,'real')||V(c.id,y,m,'prev')||0;
  return[...list].sort((a,b)=>{
    if(col==='dia'){const x=a.dia||0,z=b.dia||0;if(!x||!z)return !x&&!z?nome(a).localeCompare(nome(b)):!x?1:-1;   // sem dia sempre no fim
      return(x-z)*dir||nome(a).localeCompare(nome(b))}
    if(col==='valor')return(val(a)-val(b))*dir||nome(a).localeCompare(nome(b));
    return nome(a).localeCompare(nome(b))*dir})}
const thMes=(tipo,col,txt,cls='')=>{const s=mesSort[tipo],on=s.col===col;
  return `<th class="srt ${cls} ${on?'on':''}" data-sort="${tipo}|${col}" role="button" tabindex="0" title="Clique para ordenar" aria-sort="${on?(s.dir>0?'ascending':'descending'):'none'}">${txt}${on?(s.dir>0?' ▲':' ▼'):''}</th>`};
/* "vence hoje": despesa com dia cadastrado igual ao dia de hoje (no mês atual) e com pelo menos 1 item ainda PREVISTO.
   Se tudo já está confirmado (agendado/pago), não avisa, mesmo no dia do vencimento. */
function venceHoje(c,y,m){const d=new Date();
  return c.tipo==='pagar'&&!!c.dia&&c.dia===d.getDate()&&y===d.getFullYear()&&m===d.getMonth()
    &&(cellOf(c.id,y,m)?.items||[]).some(i=>!i.ok&&!i.info)}
function rowMes(c,y,m){const r=V(c.id,y,m,'real'),p=V(c.id,y,m,'prev'),neg=c.tipo==='pagar',f=n=>moneyFor(c.tipo,n);
  const its=cellOf(c.id,y,m)?.items||[],n=its.length,vazio=!p&&!r&&!n,noCartao=its.filter(i=>i.info).reduce((s,i)=>s+i.v,0);
  const main=vazio?'<span class="lancar">＋ Lançar</span>':`<span class="${neg?'neg':'pos'}" ${r?'':'style="opacity:.5"'}>${f(r)}</span>`;
  const vh=venceHoje(c,y,m);
  return `<tr draggable="true" data-cat="${c.id}" data-tipo="${c.tipo}"${vh?' class="venc" title="Vence hoje e ainda está como previsto: agende/pague e marque como pago para tirar este aviso"':''}><td class="grip" title="Arraste para reordenar">⋮⋮</td>
 <td data-tipcat="${c.id}|${y}|${m}">${catBadge(c)} ${esc(c.nome)}${vh?' <span class="vtag">⏰ vence hoje</span>':''}<br>${sumBadge(c,y,m)}</td>
 <td class="dia">${c.dia?`<span class="dd">${c.dia}</span>`:''}</td>
 <td class="n">${n>1?`<span class="cnt" title="Quantidade de itens que formam este valor">${n} itens</span>`:''}<button class="val" data-open="${c.id}|${y}|${m}" data-tipcell="${c.id}|${y}|${m}">${main}</button>${p!==r?`<div class="sub" style="padding-right:8px">previsto ${f(p)}</div>`:''}${noCartao?`<div class="sub infoc" title="Valor lançado como “já está na fatura do cartão”: aparece aqui para você acompanhar, mas NÃO entra no total (já está dentro do valor do cartão de crédito)">💳 ${f(noCartao)} no cartão · não soma</div>`:''}</td></tr>`}
/* um bloco (Receitas ou Despesas) com as linhas e o botão de nova categoria no canto inferior esquerdo */
function blocoMes(tipo,titulo,total,y,m){
  const linhas=sortMes(visCats(tipo,y,m),tipo,y,m).map(c=>rowMes(c,y,m)).join('');
  return `<div class="panel pm ${tipo}"><h2>${titulo.toUpperCase()}</h2>
   <table class="mes"><thead><tr><th></th>${thMes(tipo,'nome','Categoria')}${thMes(tipo,'dia','Dia','dia')}${thMes(tipo,'valor','Valor','n')}</tr></thead>
   <tbody>${linhas||`<tr><td colspan="4" class="sub" style="padding:16px">Nenhuma categoria neste mês. Use “＋ Categoria” para incluir uma que já existe.</td></tr>`}</tbody>
   <tfoot><tr><td></td><td colspan="2">Total de ${titulo.toLowerCase()}</td><td class="n"><b class="${tipo==='pagar'?'neg':'pos'}">${total}</b></td></tr></tfoot></table>
   <div class="pfoot"><button class="btn sec sm" data-usecat="${tipo}" title="Incluir neste mês uma categoria de ${tipo==='pagar'?'despesa':'receita'} que já existe">＋ Categoria</button></div></div>`}
/* Resumo do mês atual: quanto dá para gastar por dia até o fim do mês e o que ainda vence. (Só no mês de hoje.) */
function resumoMes(y,m){const h=new Date();if(y!==h.getFullYear()||m!==h.getMonth())return'';
  const hoje=h.getDate(),dias=new Date(y,m+1,0).getDate()-hoje+1,fim=acum(y,m,'prev');
  const pend=visCats('pagar',y,m).map(c=>({c,p:Math.round((V(c.id,y,m,'prev')-V(c.id,y,m,'real'))*100)/100})).filter(x=>x.p>0);
  const falta=pend.reduce((s,x)=>s+x.p,0),prox=pend.filter(x=>x.c.dia&&x.c.dia>=hoje).sort((a,b)=>a.c.dia-b.c.dia).slice(0,3);
  return `<div class="resumo"><div class="rb"><span class="l">Pode gastar por dia</span><b class="${fim>0?'pos':'neg'}">${fim>0?R$(fim/dias):'sem folga'}</b><span class="sub">${fim>0?`saldo previsto ${R$(fim)} ÷ ${dias} dia${dias>1?'s':''}`:`saldo previsto do mês: ${R$(fim)}`}</span></div>
   <div class="rb"><span class="l">Ainda a pagar</span><b class="neg">${RP(falta)}</b><span class="sub">${pend.length} conta${pend.length===1?'':'s'} no mês</span></div>
   ${prox.length?`<div class="prox"><span class="l">Próximos vencimentos</span>${prox.map(x=>`<button type="button" data-open="${key(x.c.id,y,m)}"><b>dia ${x.c.dia}</b> ${esc(x.c.nome)} <span class="neg">${R$(x.p)}</span></button>`).join('')}</div>`:''}</div>`}
function vMes(){const y=selY,m=selM,R=MT('receber',y,m,'real'),P=MT('pagar',y,m,'real'),Rp=MT('receber',y,m,'prev'),Pp=MT('pagar',y,m,'prev');
  const curY=new Date().getFullYear(),curMo=new Date().getMonth();
  return `<div class="chips">${MESES.map((n,i)=>`<button class="chip ${i===m?'on':''} ${i===curMo&&y===curY?'cur':''}" data-m="${i}">${n}</button>`).join('')}<span class="sub" style="margin-left:8px">${MESES[m]} de ${y}</span></div>
  ${resumoMes(y,m)}
  <div class="row mvrow"><div class="seg" title="Escolha como ver o mês"><button data-mv="cat" class="${mesVis==='cat'?'on':''}">Por categoria</button><button data-mv="lanc" class="${mesVis==='lanc'?'on':''}">Lançamentos</button></div></div>
  ${mesVis==='lanc'?`<div class="lsum"><span>Recebido <b class="pos">${R$(R)}</b></span><span>Pago <b class="neg">${RP(P)}</b></span><span>Saldo <b class="${R-P>=0?'pos':'neg'}">${R$(R-P)}</b></span></div>`:`  <div class="cards">
   <div class="card"><div class="l">Recebido</div><div class="v pos">${R$(R)}</div><div class="sub">previsto ${R$(Rp)}</div></div>
   <div class="card"><div class="l">Pago</div><div class="v neg">${RP(P)}</div><div class="sub">previsto ${RP(Pp)}</div></div>
   <div class="card"><div class="l">Saldo do mês</div><div class="v ${R-P>=0?'pos':'neg'}">${R$(R-P)}</div><div class="sub">previsto ${R$(Rp-Pp)}</div></div>
   <div class="card"><div class="l">Acumulado</div><div class="v">${R$(acum(y,m,'real'))}</div><div class="sub">previsto ${R$(acum(y,m,'prev'))}</div></div></div>`}
  ${mesVis==='lanc'?vLanc(y,m):`<div class="two">${blocoMes('receber','Receitas',R$(R),y,m)}${blocoMes('pagar','Despesas',RP(P),y,m)}</div>
  <p class="hint">Só o que está marcado como pago/recebido entra nos totais; o resto é previsão. Clique em “Lançar” (ou no valor) para lançar e editar os itens, passe o mouse para espiar, arraste ⋮⋮ para reordenar.</p>`}`}
