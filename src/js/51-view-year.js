/* Tela Ano */
/* ---------- ANO ---------- */
function vAno(){const y=selY,head=`<tr><th>Categoria</th>${MC.map(m=>`<th class="n">${m}</th>`).join('')}<th class="n">Total</th></tr>`;
  const F=(t,v)=>t==='pagar'?RP(v):R$(v),fn=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:2});
  const rows=t=>visCats(t,y).map(c=>{let s=0;const tds=MC.map((_,m)=>{const v=V(c.id,y,m);s+=v;const cls=v?(t==='pagar'?'neg':'pos'):'zero';
    return `<td class="n"><button class="val ${cls}" data-open="${c.id}|${y}|${m}" data-tipcell="${c.id}|${y}|${m}">${v?(t==='pagar'?'-':'')+fn(v):'–'}</button></td>`}).join('');
    return `<tr><td data-tipcat="${c.id}|${y}|0">${esc(c.nome)}</td>${tds}<td class="n"><b class="${t==='pagar'?'neg':'pos'}">${F(t,s)}</b></td></tr>`}).join('');
  const line=(lbl,f,fix)=>{let s=0;return `<tr class="tot"><td>${lbl}</td>${MC.map((_,m)=>{const v=f(m);s+=v;const cl=fix||(v>=0?'pos':'neg');return `<td class="n ${cl}">${fix==='neg'&&v?'-':''}${fn(v)}</td>`}).join('')}<td class="n ${fix||(s>=0?'pos':'neg')}">${fix==='neg'?'-':''}${R$(s)}</td></tr>`};
  const sec=t=>`<tr class="secr"><td>${t}</td>${'<td></td>'.repeat(13)}</tr>`;
  return `<div class="row">${seg()}<span class="sub">Ano ${y}</span></div>
  <div class="panel grid"><table>${head}${sec('A RECEBER')}${rows('receber')}${line('Total a receber',m=>MT('receber',y,m),'pos')}
   ${sec('A PAGAR')}${rows('pagar')}${line('Total a pagar',m=>MT('pagar',y,m),'neg')}
   ${sec('RESULTADO')}${line('Saldo do mês',m=>SAL(y,m))}
   <tr class="tot"><td>Acumulado</td>${MC.map((_,m)=>`<td class="n">${fn(acum(y,m))}</td>`).join('')}<td></td></tr></table></div>
   <p class="hint">Clique numa célula para editar os itens. O acumulado parte do saldo inicial do ano (Ajustes) ou do fim do ano anterior.</p>`}
