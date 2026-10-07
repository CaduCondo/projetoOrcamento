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
/* "ativa" = usada nos últimos 24 meses (ou ainda sem nenhum lançamento) */
const isActive=(c,st)=>{const x=st[c.id];return !x||x.last>=nowIdx()-23};
const lastLabel=i=>`${MC[i%12].toLowerCase()}/${Math.floor(i/12)}`;
/* categorias exibidas na tela Mês/Ano: as usadas no ano; num ano vazio, as ativas */
const visCats=(t,y)=>{const st=catStats();return cats(t).filter(c=>yearEmpty(y)?isActive(c,st):(yearHas(c,y)||!st[c.id]))};

/* move todos os lançamentos de src para dst e remove src */
function mergeCat(src,dst){
  Object.keys(S.data).filter(k=>k.startsWith(src+'|')).forEach(k=>{const{y,m}=parseKey(k),nk=key(dst,y,m),v=S.data[k];
    if(S.data[nk])S.data[nk].items.push(...v.items);else S.data[nk]=v;delete S.data[k]});
  const a=catById(src),b=catById(dst);if(b&&!b.dia&&a?.dia)b.dia=a.dia;
  S.cats=S.cats.filter(c=>c.id!==src);if(catSel===src)catSel=dst}

/* coloca a categoria dragId na posição da categoria targetId (arrastar e soltar) */
function reorderCats(dragId,targetId){
  const fi=S.cats.findIndex(c=>c.id===dragId),oti=S.cats.findIndex(c=>c.id===targetId);if(fi<0||oti<0||fi===oti)return false;
  const[it]=S.cats.splice(fi,1);let ti=S.cats.findIndex(c=>c.id===targetId);if(fi<oti)ti++;S.cats.splice(ti,0,it);return true}

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
