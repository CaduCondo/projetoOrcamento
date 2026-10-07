/* Cálculos: células, totais, saldos e acumulado.
   "real" = só itens marcados como pagos/recebidos; "prev" = tudo (previsão). Itens "info" (já na fatura do cartão) nunca somam. */
const key=(c,y,m)=>`${c}|${y}|${m}`;
const cellOf=(c,y,m)=>S.data[key(c,y,m)];
const ens=(c,y,m)=>(S.data[key(c,y,m)]??={items:[]});
const itemsOf=(c,y,m,md=modo)=>(cellOf(c,y,m)?.items||[]).filter(i=>!i.info&&(md==='prev'||i.ok));
const V=(c,y,m,md=modo)=>itemsOf(c,y,m,md).reduce((a,i)=>a+(+i.v||0),0);
const cats=t=>S.cats.filter(c=>c.tipo===t);
const MT=(t,y,m,md=modo)=>cats(t).reduce((a,c)=>a+V(c.id,y,m,md),0);
const SAL=(y,m,md=modo)=>MT('receber',y,m,md)-MT('pagar',y,m,md);
/* saldo inicial do ano: o definido à mão ou o final do ano anterior */
function iniY(y,md=modo){if(S.saldoIni[y]!=null)return S.saldoIni[y];if(y<=S.anos[0])return 0;return acum(y-1,11,md)}
function acum(y,m,md=modo){let a=iniY(y,md);for(let i=0;i<=m;i++)a+=SAL(y,i,md);return a}
const hasData=(y,m)=>MT('receber',y,m,'prev')>0||MT('receber',y,m,'real')>0;
const lastActive=y=>{let l=0;for(let m=0;m<12;m++)if(hasData(y,m))l=m;return l};
/* os n meses que terminam em (y,m), atravessando a virada de ano */
function prevMonths(y,m,n){const r=[];for(let i=n-1;i>=0;i--){let mm=m-i,yy=y;while(mm<0){mm+=12;yy--}r.push([yy,mm])}return r}
