/* Categorias: busca, atividade recente, mesclar, reordenar, excluir, importar anos.
   Tudo aqui é lógica de dados, sem tela (por isso é testável). */
const catById=id=>S.cats.find(c=>c.id===id);
const addCat=(tipo,nome,dia=null)=>{const c=makeCat(tipo,nome,dia);S.cats.push(c);return c};

const yearHas=(c,y)=>MC.some((_,m)=>(cellOf(c.id,y,m)?.items||[]).length>0);
const yearEmpty=y=>!S.cats.some(c=>yearHas(c,y));
const nowIdx=()=>{const d=new Date();return d.getFullYear()*12+d.getMonth()};
/* por categoria: nº de itens, último mês de uso e uso nos últimos 6 meses */
function catStats(){const st={},n=nowIdx();
  for(const[k,v]of Object.entries(S.data)){if(!v.items.length)continue;const{c,y,m}=parseKey(k),i=y*12+m,x=st[c]??={n:0,last:-1,recent:0};
    x.n+=v.items.length;if(i>x.last)x.last=i;if(i>n-6&&i<=n)x.recent+=v.items.length}
  return st}
/* categorias que mudaram de nome ganham uma "versão" nova (prevId aponta para a antiga). Na lista aparece UMA linha só: a atual,
   somando o uso das anteriores. */
const catsAtuais=()=>{const velhas=new Set(S.cats.map(c=>c.prevId).filter(Boolean));return S.cats.filter(c=>!velhas.has(c.id))};
function statsComHistorico(){const st=catStats(),out={...st};
  for(const c of S.cats){if(!c.prevId)continue;let n=0,last=-1,recent=0,any=false;
    for(let p=c,g=0;p&&g<50;p=catById(p.prevId),g++){const x=st[p.id];if(x){any=true;n+=x.n;last=Math.max(last,x.last);recent+=x.recent||0}}
    if(any)out[c.id]={...(st[c.id]||{}),n,last,recent}}
  return out}
/* "ativa" = usada nos últimos 24 meses (ou ainda sem nenhum lançamento) */
const isActive=(c,st)=>{const x=st[c.id];return !x||x.last>=nowIdx()-23};
const lastLabel=i=>`${MC[i%12].toLowerCase()}/${Math.floor(i/12)}`;
/* quais categorias aparecem em cada mês/ano: veja visCats em 24-model-schedule.js */

/* move todos os lançamentos de src para dst e remove src */
function mergeCat(src,dst){
  Object.keys(S.data).filter(k=>k.startsWith(src+'|')).forEach(k=>{const{y,m}=parseKey(k),nk=key(dst,y,m),v=S.data[k];
    if(S.data[nk])S.data[nk].items.push(...v.items);else S.data[nk]=v;delete S.data[k]});
  const a=catById(src),b=catById(dst);if(b&&!b.dia&&a?.dia)b.dia=a.dia;
  if(a?.extra&&b)b.extra=[...new Set([...(b.extra||[]),...a.extra])].sort();
  if(a?.hide&&b)b.hide=[...new Set([...(b.hide||[]),...a.hide])].sort();
  S.cats=S.cats.filter(c=>c.id!==src);if(catSel===src)catSel=dst}

/* "Virar lançamento": a categoria some e cada valor dela vira um lançamento da categoria escolhida, NO MESMO MÊS, com o nome
   dela na descrição (ex.: "IPVA" de abril/2017 vira o lançamento "IPVA" de abril/2017 dentro de "Documentos carro").
   Vale também para as versões antigas da categoria (nomes anteriores): cada mês usa o nome que ela tinha naquele mês. */
const versoesDe=id=>{const l=[];for(let c=catById(id),g=0;c&&g<50;c=catById(c.prevId),g++)l.push(c);return l};
const descVirada=(nome,d)=>{const t=String(d||'').trim(),a=normName(nome),b=normName(t);return !t||b===a?nome:(b.startsWith(a)?t:`${nome} - ${t}`)};
/* os lançamentos que vão mudar de lugar, em ordem de data: [{y,m,v,d,ok,info}] (serve para mostrar um exemplo antes de confirmar) */
function lancamentosParaVirar(srcId){const out=[];
  for(const v of versoesDe(srcId))for(const[k,cel]of Object.entries(S.data)){if(!k.startsWith(v.id+'|'))continue;const{y,m}=parseKey(k);
    cel.items.forEach(i=>out.push({y,m,v:i.v,d:descVirada(v.nome,i.d),ok:!!i.ok,info:!!i.info}))}
  return out.sort((a,b)=>a.y-b.y||a.m-b.m)}
function virarLancamento(srcId,dstId){
  const src=catById(srcId),dst=catById(dstId);
  if(!src||!dst||srcId===dstId)throw new Error('Escolha outra categoria.');
  if(src.tipo!==dst.tipo)throw new Error('A categoria escolhida precisa ser do mesmo tipo (receita ou despesa).');
  const vs=versoesDe(srcId);if(vs.some(v=>v.id===dstId))throw new Error('Escolha outra categoria.');
  let n=0;
  for(const v of vs)for(const k of Object.keys(S.data).filter(k=>k.startsWith(v.id+'|'))){const{y,m}=parseKey(k);
    const novos=S.data[k].items.map(i=>({...i,d:descVirada(v.nome,i.d)}));
    if(novos.length){ens(dstId,y,m).items.push(...novos);n+=novos.length}
    delete S.data[k]}
  (S.autos||[]).forEach(a=>{if(a.tipo===src.tipo&&vs.some(v=>normName(v.nome)===normName(a.nome)))a.nome=dst.nome});   // regras de importação passam a levar para a nova categoria
  S.cats=S.cats.filter(c=>!vs.some(v=>v.id===c.id));if(vs.some(v=>v.id===catSel))catSel=dstId;
  return n}

/* coloca a categoria dragId na posição da categoria targetId (arrastar e soltar) */
function reorderCats(dragId,targetId){
  const fi=S.cats.findIndex(c=>c.id===dragId),oti=S.cats.findIndex(c=>c.id===targetId);if(fi<0||oti<0||fi===oti)return false;
  const[it]=S.cats.splice(fi,1);let ti=S.cats.findIndex(c=>c.id===targetId);if(fi<oti)ti++;S.cats.splice(ti,0,it);return true}

/* grava na lista de categorias a ordem em que um tipo está sendo mostrado (ids na ordem da tela); o resto do tipo vai depois */
function applyOrder(tipo,ids){const mesmas=S.cats.filter(c=>c.tipo===tipo),pos=S.cats.map((c,i)=>c.tipo===tipo?i:-1).filter(i=>i>=0);
  const nova=[...ids.map(catById).filter(c=>c&&c.tipo===tipo),...mesmas.filter(c=>!ids.includes(c.id))];
  pos.forEach((p,i)=>{S.cats[p]=nova[i]})}

function deleteCat(id){S.cats=S.cats.filter(c=>c.id!==id);Object.keys(S.data).filter(k=>k.startsWith(id+'|')).forEach(k=>delete S.data[k])}

/* ---- importação de anos (arquivo gerado a partir de planilhas) ---- */
const yearHasData=y=>Object.keys(S.data).some(k=>parseKey(k).y===y&&S.data[k].items.length);
const importClashYears=o=>o.anos.filter(yearHasData);
/* junta os anos do arquivo aos dados: categorias de mesmo nome são reaproveitadas; os anos do arquivo substituem os existentes */
function applyImport(o){
  const map={};
  o.cats.forEach(c=>{let ex=S.cats.find(x=>x.tipo===c.tipo&&normName(x.nome)===normName(c.nome));
    if(!ex){ex=addCat(c.tipo,c.nome,c.dia)}else if(!ex.dia&&c.dia)ex.dia=c.dia;map[c.id]=ex.id});
  Object.keys(S.data).filter(k=>o.anos.includes(parseKey(k).y)).forEach(k=>delete S.data[k]);
  for(const[k,v]of Object.entries(o.data)){const{c,y,m}=parseKey(k);S.data[key(map[c],y,m)]=v}
  o.anos.forEach(y=>{if(!S.anos.includes(y))S.anos.push(y)});S.anos.sort((a,b)=>a-b);
  Object.entries(o.saldoIni||{}).forEach(([y,v])=>S.saldoIni[y]=v)}
