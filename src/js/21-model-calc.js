/* Cálculos: totais, saldos, acumulado, categorias ativas */
/* ---------- CÁLCULOS ---------- */
let modo='real',tab='mes',selY=new Date().getFullYear(),selM=new Date().getMonth(),period='ano',catSel='';
const key=(c,y,m)=>`${c}|${y}|${m}`;
const cellOf=(c,y,m)=>S.data[key(c,y,m)];
const ens=(c,y,m)=>(S.data[key(c,y,m)]??={items:[]});
const itemsOf=(c,y,m,md=modo)=>(cellOf(c,y,m)?.items||[]).filter(i=>!i.info&&(md==='prev'||i.ok));
const V=(c,y,m,md=modo)=>itemsOf(c,y,m,md).reduce((a,i)=>a+(+i.v||0),0);
const cats=t=>S.cats.filter(c=>c.tipo===t);
const yearHas=(c,y)=>MC.some((_,m)=>(cellOf(c.id,y,m)?.items||[]).length>0);
const anyHas=c=>S.anos.some(y=>yearHas(c,y));
const yearEmpty=y=>!S.cats.some(c=>yearHas(c,y));
const nowIdx=()=>{const d=new Date();return d.getFullYear()*12+d.getMonth()};
function catStats(){const st={},n=nowIdx();for(const[k,v]of Object.entries(S.data)){if(!v.items.length)continue;const[c,y,m]=k.split('|'),i=(+y)*12+(+m),x=st[c]??={n:0,last:-1,recent:0};
  x.n+=v.items.length;if(i>x.last)x.last=i;if(i>n-6&&i<=n)x.recent+=v.items.length}return st}
const isActive=(c,st)=>{const x=st[c.id];return !x||x.last>=nowIdx()-23};
const lastLabel=i=>`${MC[i%12].toLowerCase()}/${Math.floor(i/12)}`;
const visCats=(t,y)=>{const st=catStats();return cats(t).filter(c=>yearEmpty(y)?isActive(c,st):(yearHas(c,y)||!st[c.id]))};
const MT=(t,y,m,md=modo)=>cats(t).reduce((a,c)=>a+V(c.id,y,m,md),0);
const SAL=(y,m,md=modo)=>MT('receber',y,m,md)-MT('pagar',y,m,md);
function iniY(y,md=modo){if(S.saldoIni[y]!=null)return S.saldoIni[y];if(y<=S.anos[0])return 0;return acum(y-1,11,md)}
function acum(y,m,md=modo){let a=iniY(y,md);for(let i=0;i<=m;i++)a+=SAL(y,i,md);return a}
const hasData=(y,m)=>MT('receber',y,m,'prev')>0||MT('receber',y,m,'real')>0;
const lastActive=y=>{let l=0;for(let m=0;m<12;m++)if(hasData(y,m))l=m;return l};
function prevMonths(y,m,n){const r=[];for(let i=n-1;i>=0;i--){let mm=m-i,yy=y;while(mm<0){mm+=12;yy--}r.push([yy,mm])}return r}
const cellTip=cid=>{};
