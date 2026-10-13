/* Tela Ano */
/* ---------- ANO ---------- */
function vAno(){const y=selY,head=`<tr><th></th><th></th>${MC.map(m=>`<th class="n">${m}</th>`).join('')}<th></th></tr>`;
  const F=moneyFor,fn=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2});
  const rows=t=>sortMes(visCats(t,y),t,y,null).map(c=>{let s=0;const tds=MC.map((_,m)=>{const v=V(c.id,y,m);s+=v;const cls=v?(t==='pagar'?'neg':'pos'):'zero';
    return `<td class="n"><button class="val ${cls}" data-open="${c.id}|${y}|${m}" data-tipcell="${c.id}|${y}|${m}">${v?(t==='pagar'?'-':'')+fn(v):'–'}</button></td>`}).join('');
    return `<tr draggable="true" data-cat="${c.id}" data-tipo="${t}"><td class="dia">${c.dia||''}</td><td data-tipcat="${c.id}|${y}|0">${esc(c.nome)}</td>${tds}<td class="n"><b class="${t==='pagar'?'neg':'pos'}">${F(t,s)}</b></td></tr>`}).join('');
  const line=(lbl,f,fix)=>{let s=0;return `<tr class="tot"><td></td><td>${lbl}</td>${MC.map((_,m)=>{const v=f(m);s+=v;const cl=fix||(v>=0?'pos':'neg');return `<td class="n ${cl}">${fix==='neg'&&v?'-':''}${fn(v)}</td>`}).join('')}<td class="n ${fix||(s>=0?'pos':'neg')}">${fix==='neg'?'-':''}${R$(s)}</td></tr>`};
  /* título do grupo: também é o cabeçalho clicável (Dia · nome do grupo · Total) para ordenar as linhas do grupo */
  const sec=(t,tit)=>`<tr class="secr">${thMes(t,'dia','Dia','dia')}${thMes(t,'nome',tit)}${'<td></td>'.repeat(12)}${thMes(t,'valor','Total','n')}</tr>`;
  return `<div class="row">${seg()}<span class="sub">Ano ${y}</span></div>
  <div class="panel grid"><table class="ano">${head}${sec('receber','RECEITAS')}${rows('receber')}${line('Total de receitas',m=>MT('receber',y,m),'pos')}
   ${sec('pagar','DESPESAS')}${rows('pagar')}${line('Total de despesas',m=>MT('pagar',y,m),'neg')}
   <tr class="secr"><td></td><td>RESULTADO</td>${'<td></td>'.repeat(13)}</tr>${line('Saldo do mês',m=>SAL(y,m))}
   <tr class="tot"><td></td><td>Acumulado</td>${MC.map((_,m)=>`<td class="n">${fn(acum(y,m))}</td>`).join('')}<td></td></tr></table></div>
   <p class="hint">Clique numa célula para editar os itens; clique nos títulos Dia, Categoria ou Total para ordenar; arraste uma linha para mudar de lugar dentro do seu grupo. O acumulado parte do saldo inicial do ano (Ajustes) ou do fim do ano anterior.</p>`}
