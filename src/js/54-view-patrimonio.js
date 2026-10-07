/* Tela Patrimônio */
/* ---------- PATRIMÔNIO ---------- */
function list(k,title,hint){const a=S[k],tot=a.reduce((x,i)=>x+(+i.valor||0),0);
  return `<div class="panel"><h2>${title} <b>${R$(tot)}</b></h2><div style="padding:12px 14px">${hint?`<p class="hint">${hint}</p>`:''}
   ${a.map((i,n)=>`<div class="row"><input data-ln="${k}|${n}" value="${esc(i.nome)}" style="flex:1"><input class="money" data-lv="${k}|${n}" value="${fmtN(i.valor)}" size="14" inputmode="decimal" placeholder="0,00"><button class="btn dan" data-ld="${k}|${n}">✕</button></div>`).join('')}
   <button class="btn sec" data-la="${k}">＋ Adicionar</button></div></div>`}
function vPat(){const s=S.saldos.reduce((x,i)=>x+i.valor,0),d=S.dividas.reduce((x,i)=>x+i.valor,0);
  return `<div class="cards"><div class="card"><div class="l">Saldos nas contas</div><div class="v pos">${R$(s)}</div></div><div class="card"><div class="l">Total que devo</div><div class="v neg">${RP(d)}</div></div><div class="card"><div class="l">Saldos − dívidas</div><div class="v ${s-d>=0?'pos':'neg'}">${R$(s-d)}</div></div></div>
  <div class="two">${list('saldos','Saldos por banco/conta')}${list('dividas','Dívidas e valores a devolver','Valores negativos abatem a dívida (ex.: “paguei com carro”).')}</div>
  <div class="charts" style="margin-top:16px"><div class="cbox"><h3>Onde está o dinheiro</h3><p>Saldos por banco/conta.</p><div class="cw"><canvas id="p1"></canvas></div></div><div class="cbox"><h3>Dívidas</h3><p>Cada item que você deve.</p><div class="cw"><canvas id="p2"></canvas></div></div></div>
  <div style="margin-top:16px">${list('bens','Bens e valores','Migrado do bloco contas/casa/ape da planilha. Renomeie como quiser.')}</div>`}
function drawPat(){Chart.defaults.color=getComputedStyle(document.documentElement).getPropertyValue('--mut').trim();
  const s=S.saldos.filter(i=>i.valor>0),d=S.dividas.filter(i=>i.valor>0);
  CH.push(new Chart(document.getElementById('p1'),donutCfg(s.map(i=>i.nome),s.map(i=>i.valor))));
  CH.push(new Chart(document.getElementById('p2'),{type:'bar',data:{labels:d.map(i=>i.nome),datasets:[{data:d.map(i=>i.valor),backgroundColor:PAL[3]}]},options:{indexAxis:'y',maintainAspectRatio:false,scales:{x:{ticks:{callback:K}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+R$(c.parsed.x)}}}}}))}
