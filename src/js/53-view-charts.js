/* Tela Gráficos */
/* ---------- GRÁFICOS ---------- */
let CH=[];const destroyCharts=()=>{CH.forEach(c=>c.destroy());CH=[]};
const PAL=['#2f6fed','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#64748b'];
function heat(){const y=selY,L=lastActive(y);const rows=cats('pagar').map(c=>({c,v:MC.map((_,m)=>V(c.id,y,m))})).filter(r=>r.v.some(x=>x>0));
  if(!rows.length)return'<p class="hint">Sem dados.</p>';
  return `<div class="heat"><table><tr><th>Categoria</th>${MC.slice(0,L+1).map(m=>`<th class="n">${m}</th>`).join('')}<th class="n">Total</th></tr>${rows.map(r=>{const mx=Math.max(...r.v.slice(0,L+1),1);
   return `<tr><td>${esc(r.c.nome)}</td>${r.v.slice(0,L+1).map((v,m)=>`<td class="h" data-open="${r.c.id}|${y}|${m}" style="background:rgba(239,68,68,${(v/mx*.65).toFixed(2)})">${v?K(Math.round(v)):''}</td>`).join('')}<td class="n"><b>${R$(r.v.reduce((a,b)=>a+b,0))}</b></td></tr>`}).join('')}</table></div>`}
function vGraf(){const opts=`<option value="ano">Ano todo</option>${MESES.map((m,i)=>`<option value="${i}" ${period==i?'selected':''}>${m}</option>`).join('')}`;
  if(!S.cats.some(c=>c.id===catSel))catSel=cats('pagar')[0]?.id;
  const box=(id,t,p,cls='')=>`<div class="cbox ${cls}"><h3>${t}</h3><p>${p}</p><div class="cw"><canvas id="${id}"></canvas></div></div>`;
  return `<div class="row">${seg()}<label class="row" style="margin:0">Período das categorias: <select id="per">${opts}</select></label><span class="sub">Ano ${selY} · ${modo==='real'?'só o que já foi pago/recebido':'tudo, inclusive previsão'}</span></div>
  <div class="cards" id="kpis"></div>
  <div class="gh">Visão geral</div><div class="charts">
   ${box('c1','Receber × pagar por mês','Barras: entradas e saídas. Linha: saldo do mês.')}
   ${box('c2','Saldo acumulado','Parte do saldo inicial e soma o resultado de cada mês.')}
   ${box('c3','Acumulado no ano: receitas × despesas','Quando as duas linhas se afastam, sobrou dinheiro.')}
   ${box('c4','Taxa de poupança','% do que entrou que sobrou no mês (abaixo de 0 = gastou mais do que recebeu).')}
   ${box('c5','Previsto × realizado','Compara o que você planejou com o que de fato foi pago/recebido.','full')}
  </div>
  <div class="gh">Despesas</div><div class="charts">
   ${box('c6','Despesas por categoria','Onde mais foi dinheiro no período.','tall')}
   ${box('c7','Participação nas despesas','Fatia de cada categoria (8 maiores + outras).')}
   ${box('c8','Para onde o dinheiro foi (itens)','Soma das descrições que você anotou.','tall')}
   ${box('c9','Maiores gastos individuais','Os 15 maiores itens isolados do período.','tall')}
   ${box('c10','Despesas empilhadas por mês','As 8 maiores categorias + “Outras”.')}
   ${box('c11','Média mensal por categoria','Quanto cada categoria pesa em um mês típico.')}
   ${box('c12','Quando o dinheiro sai (dia do mês)','Soma das despesas pelo dia de vencimento da categoria.','full')}
  </div>
  <div class="gh">Receitas</div><div class="charts">
   ${box('c13','De onde vem o dinheiro','Receitas por categoria no período.')}
   ${box('c14','Receitas por mês','Empilhadas por categoria.')}
  </div>
  <div class="gh">Categorias e comparativos</div><div class="charts">
   <div class="cbox full"><h3>Mapa de calor das despesas</h3><p>Quanto mais forte o vermelho, mais alto o gasto daquela categoria naquele mês. Clique para editar.</p>${heat()}</div>
   <div class="cbox full"><h3>Evolução de uma categoria</h3><p style="max-width:360px">${combo('cs',{value:catSel,ph:'Buscar categoria…'})}</p><div class="cw"><canvas id="c15"></canvas></div></div>
   ${box('c16','Comparativo entre anos','Receitas, despesas e saldo de cada ano cadastrado.','full')}
  </div>`}
function drawCharts(){
  const css=getComputedStyle(document.documentElement),ink=css.getPropertyValue('--mut').trim(),grid=css.getPropertyValue('--line').trim();
  Chart.defaults.color=ink;Chart.defaults.borderColor=grid;Chart.defaults.font.family='system-ui,Segoe UI,sans-serif';
  const y=selY,L=lastActive(y),ms=[...Array(L+1).keys()],lab=ms.map(m=>MC[m]),ms2=period==='ano'?ms:[+period];
  const fmt=R$,ax={ticks:{callback:K}},tip={callbacks:{label:c=>` ${c.dataset.label?c.dataset.label+': ':''}${fmt(c.parsed.y??c.parsed.x??c.parsed)}`}};
  const mk=(id,cfg)=>CH.push(new Chart(document.getElementById(id),cfg));
  const R=ms.map(m=>MT('receber',y,m)),P=ms.map(m=>MT('pagar',y,m)),B=ms.map(m=>SAL(y,m));
  const sum=a=>a.reduce((x,z)=>x+z,0),avg=a=>sum(a)/(a.length||1),best=B.indexOf(Math.max(...B)),worst=B.indexOf(Math.min(...B));
  const falR=sum(ms.map(m=>MT('receber',y,m,'prev')-MT('receber',y,m,'real'))),falP=sum(ms.map(m=>MT('pagar',y,m,'prev')-MT('pagar',y,m,'real')));
  document.getElementById('kpis').innerHTML=[['Total receber',fmt(sum(R)),'pos'],['Total pagar',RP(sum(P)),'neg'],['Saldo do ano',fmt(sum(B)),sum(B)>=0?'pos':'neg'],['Média receber/mês',fmt(avg(R)),'pos'],['Média pagar/mês',RP(avg(P)),'neg'],
    ['Melhor mês',`${MESES[best]}<div class="sub">${fmt(B[best])}</div>`,'pos'],['Pior mês',`${MESES[worst]}<div class="sub">${fmt(B[worst])}</div>`,'neg'],['Ainda falta receber',fmt(falR),''],['Ainda falta pagar',RP(falP),'']]
    .map(([l,v,c])=>`<div class="card"><div class="l">${l}</div><div class="v ${c}" style="font-size:18px">${v}</div></div>`).join('');
  const noleg={legend:{display:false}};
  mk('c1',{data:{labels:lab,datasets:[{type:'bar',label:'Receber',data:R,backgroundColor:PAL[2]},{type:'bar',label:'Pagar',data:P,backgroundColor:PAL[3]},{type:'line',label:'Saldo',data:B,borderColor:PAL[0],backgroundColor:PAL[0],tension:.25}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{tooltip:tip}}});
  mk('c2',{type:'line',data:{labels:lab,datasets:[{label:'Acumulado',data:ms.map(m=>acum(y,m)),borderColor:PAL[0],backgroundColor:PAL[0]+'33',fill:true,tension:.25}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{...noleg,tooltip:tip}}});
  let ar=0,ap=0;mk('c3',{type:'line',data:{labels:lab,datasets:[{label:'Receitas acumuladas',data:R.map(v=>ar+=v),borderColor:PAL[2],tension:.25},{label:'Despesas acumuladas',data:P.map(v=>ap+=v),borderColor:PAL[3],tension:.25}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{tooltip:tip}}});
  mk('c4',{type:'bar',data:{labels:lab,datasets:[{label:'Poupança',data:ms.map((m,i)=>R[i]>0?+(B[i]/R[i]*100).toFixed(1):null),backgroundColor:ms.map((m,i)=>B[i]>=0?PAL[2]:PAL[3])}]},options:{maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>v+'%'}}},plugins:{...noleg,tooltip:{callbacks:{label:c=>` ${c.parsed.y}%`}}}}});
  mk('c5',{type:'bar',data:{labels:lab,datasets:[{label:'Receber previsto',data:ms.map(m=>MT('receber',y,m,'prev')),backgroundColor:PAL[2]+'66'},{label:'Receber realizado',data:ms.map(m=>MT('receber',y,m,'real')),backgroundColor:PAL[2]},{label:'Pagar previsto',data:ms.map(m=>MT('pagar',y,m,'prev')),backgroundColor:PAL[3]+'66'},{label:'Pagar realizado',data:ms.map(m=>MT('pagar',y,m,'real')),backgroundColor:PAL[3]}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{tooltip:tip}}});
  const catTot=t=>cats(t).map(c=>({n:c.nome,v:sum(ms2.map(m=>V(c.id,y,m)))})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const hb=(id,arr,color)=>mk(id,{type:'bar',data:{labels:arr.map(x=>x.n),datasets:[{data:arr.map(x=>x.v),backgroundColor:color}]},options:{indexAxis:'y',maintainAspectRatio:false,scales:{x:ax},plugins:{...noleg,tooltip:{callbacks:{label:c=>' '+fmt(c.parsed.x)}}}}});
  const pt=catTot('pagar');hb('c6',pt,PAL[3]);
  const top8=pt.slice(0,8),oth=sum(pt.slice(8).map(x=>x.v));
  mk('c7',{type:'doughnut',data:{labels:[...top8.map(x=>x.n),...(oth?['Outras']:[])],datasets:[{data:[...top8.map(x=>x.v),...(oth?[oth]:[])],backgroundColor:PAL}]},options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.parsed)}`}},legend:{position:'right'}}}});
  const g={},all=[];cats('pagar').forEach(c=>ms2.forEach(m=>itemsOf(c.id,y,m).forEach(i=>{if(/sem detalhe/.test(i.d)||i.v<=0)return;const k=(i.d||c.nome).trim().toLowerCase();g[k]=(g[k]||0)+i.v;all.push({n:`${i.d||c.nome} (${c.nome} · ${MC[m]})`,v:i.v})})));
  hb('c8',Object.entries(g).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v).slice(0,20),PAL[1]);
  hb('c9',all.sort((a,b)=>b.v-a.v).slice(0,15),PAL[4]);
  const top=pt.slice(0,8).map(x=>x.n),cid=n=>cats('pagar').find(c=>c.nome===n).id;
  const ds=top.map((n,i)=>({label:n,backgroundColor:PAL[i],data:ms.map(m=>V(cid(n),y,m))}));
  ds.push({label:'Outras',backgroundColor:PAL[9],data:ms.map(m=>sum(cats('pagar').filter(c=>!top.includes(c.nome)).map(c=>V(c.id,y,m))))});
  mk('c10',{type:'bar',data:{labels:lab,datasets:ds},options:{maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,...ax}},plugins:{tooltip:tip}}});
  const nm=Math.max(1,ms2.filter(m=>MT('receber',y,m,'prev')>0).length);hb('c11',pt.map(x=>({n:x.n,v:x.v/nm})),PAL[5]);
  const dias=Array.from({length:31},(_,i)=>i+1),byDia=dias.map(d=>sum(cats('pagar').filter(c=>c.dia===d).map(c=>sum(ms2.map(m=>V(c.id,y,m))))));
  const semDia=sum(cats('pagar').filter(c=>!c.dia).map(c=>sum(ms2.map(m=>V(c.id,y,m)))));
  mk('c12',{type:'bar',data:{labels:[...dias,'s/ dia'],datasets:[{data:[...byDia,semDia],backgroundColor:PAL[3]}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{...noleg,tooltip:{callbacks:{label:c=>' '+fmt(c.parsed.y)}}}}});
  const rc=catTot('receber');
  mk('c13',{type:'doughnut',data:{labels:rc.map(x=>x.n),datasets:[{data:rc.map(x=>x.v),backgroundColor:PAL}]},options:{maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.parsed)}`}},legend:{position:'right'}}}});
  mk('c14',{type:'bar',data:{labels:lab,datasets:cats('receber').filter(c=>ms.some(m=>V(c.id,y,m)>0)).map((c,i)=>({label:c.nome,backgroundColor:PAL[i%10],data:ms.map(m=>V(c.id,y,m))}))},options:{maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,...ax}},plugins:{tooltip:tip}}});
  const cc=S.cats.find(c=>c.id===catSel);
  if(cc)mk('c15',{type:'bar',data:{labels:lab,datasets:[{label:cc.nome,data:ms.map(m=>V(cc.id,y,m)),backgroundColor:cc.tipo==='pagar'?PAL[3]:PAL[2]}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{...noleg,tooltip:tip}}});
  const tot=t=>S.anos.map(a=>sum(MC.map((_,m)=>MT(t,a,m))));
  mk('c16',{type:'bar',data:{labels:S.anos,datasets:[{label:'Receber',data:tot('receber'),backgroundColor:PAL[2]},{label:'Pagar',data:tot('pagar'),backgroundColor:PAL[3]},{label:'Saldo',data:S.anos.map((a,i)=>tot('receber')[i]-tot('pagar')[i]),backgroundColor:PAL[0]}]},options:{maintainAspectRatio:false,scales:{y:ax},plugins:{tooltip:tip}}});
}
