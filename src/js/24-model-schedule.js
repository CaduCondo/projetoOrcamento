/* Vigência das categorias: em quais meses uma categoria aparece nas telas.
   - c.vis   = {from:[ano,mês], to:[ano,mês] | null}  (null = sem fim)  → mostra a linha (mesmo vazia) nesses meses
   - c.until = [ano,mês]                              → a categoria "acabou" neste mês (versão antiga após uma edição)
   Categorias antigas (importadas) não têm vis nem until e seguem a regra do histórico (aparecem onde têm lançamentos).
   - c.extra = ["2026-10",...]                        → meses em que a pessoa INCLUIU a categoria pela tela Mês (uso pontual)
   - c.lib   = true                                    → categoria "de biblioteca": só aparece onde for incluída (extra) ou tiver lançamentos
   Meses FUTUROS (depois do mês atual) começam vazios: só mostram a categoria se ela foi incluída naquele mês, tem lançamento
   ou tem vigência com fim definido (ex.: "o ano todo").
   Alterações valem do mês escolhido em diante; o passado não muda (ver reviseCat). */
const ym=(y,m)=>y*12+m;
const ymOf=a=>a?ym(a[0],a[1]):null;
const fromYm=t=>[Math.floor(t/12),t%12];
const hasItemsIn=(c,y,m)=>(cellOf(c.id,y,m)?.items||[]).length>0;

const exKey=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;
const inExtra=(c,y,m)=>!!c.extra?.includes(exKey(y,m));

/* a categoria ainda existe a partir deste mês? (não terminou antes dele) */
const aliveFrom=(c,y,m)=>{const t=ym(y,m);return(!c.until||ymOf(c.until)>=t)&&(!c.vis||c.vis.to==null||ymOf(c.vis.to)>=t)};

/* a categoria deve aparecer no mês (y,m)? */
function showsInMonth(c,y,m,st){
  if(hasItemsIn(c,y,m)||inExtra(c,y,m))return true;
  const t=ym(y,m);if(c.until&&t>ymOf(c.until))return false;
  if(t>nowIdx())return !!(c.vis&&c.vis.to&&t>=ymOf(c.vis.from)&&t<=ymOf(c.vis.to));   // mês futuro: só com fim definido
  if(c.lib&&!c.vis)return false;
  if(c.vis){const e=ymOf(c.vis.to);return t>=ymOf(c.vis.from)&&(e==null||t<=e)}
  return yearEmpty(y)?isActive(c,st):(yearHas(c,y)||!st[c.id])}                // regra antiga (histórico)
/* e na visão do ano inteiro? */
function showsInYear(c,y,st){
  if(yearHas(c,y)||MC.some((_,m)=>inExtra(c,y,m)))return true;
  const a=ym(y,0),b=ym(y,11);if(c.until&&ymOf(c.until)<a)return false;
  if(c.lib&&!c.vis)return false;
  if(c.vis){const e=ymOf(c.vis.to);return ymOf(c.vis.from)<=b&&(e==null||e>=a)}
  return yearEmpty(y)?isActive(c,st):!st[c.id]}
/* categorias de um tipo que aparecem no mês (ou, sem mês, no ano) */
const visCats=(t,y,m)=>{const st=catStats();return cats(t).filter(c=>m==null?showsInYear(c,y,st):showsInMonth(c,y,m,st))};

/* ---- criação e alteração ---- */
const SCOPES=['lib','ano','mes','futuro'];
/* intervalo de vigência para a opção escolhida. Ao criar, "ano" cobre o ano inteiro; ao alterar, só do mês em diante */
function scopeVis(scope,y,m,creating){
  if(scope==='lib')return null;
  if(scope==='mes')return{from:[y,m],to:[y,m]};
  if(scope==='ano')return{from:[y,creating?0:m],to:[y,11]};
  return{from:[y,m],to:null}}
/* qual opção representa a vigência atual (para pré-selecionar na edição) */
function scopeOf(c){const v=c.vis;if(!v)return c.lib?'lib':'futuro';if(!v.to)return'futuro';
  if(v.from[0]===v.to[0]&&v.from[1]===v.to[1])return'mes';return'ano'}
const mesAno=a=>`${MC[a[1]].toLowerCase()}/${a[0]}`;
/* texto curto da vigência (Ajustes) */
function scopeLabel(c){let s='';if(c.lib&&!c.vis)s='só onde for incluída no mês';
  if(c.vis){const a=c.vis.from,b=c.vis.to;
    if(!b)s=`de ${mesAno(a)} em diante`;else if(a[0]===b[0]&&a[1]===0&&b[1]===11)s=`ano todo ${a[0]}`;
    else if(a[0]===b[0]&&a[1]===b[1])s=`só ${mesAno(a)}`;else s=`${mesAno(a)} a ${mesAno(b)}`}
  if(c.until)s+=(s?' · ':'')+`até ${mesAno(c.until)}`;return s}

/* devolve a mensagem de erro (texto) ou null se está tudo certo */
function validateCat({nome,dia},tipo,y,m,ignoreId){
  const n=(nome||'').trim().replace(/\s+/g,' ');if(!n)return'Digite o nome da categoria.';
  if(dia!==''&&dia!=null){const d=Number(dia);if(!Number.isInteger(d)||d<1||d>31)return'O dia precisa ser um número de 1 a 31.'}
  if(S.cats.some(c=>c.id!==ignoreId&&c.tipo===tipo&&normName(c.nome)===normName(n)&&aliveFrom(c,y,m)))return'Já existe uma categoria com esse nome neste período.';
  return null}
const cleanInput=({nome,dia})=>({nome:(nome||'').trim().replace(/\s+/g,' '),dia:dia===''||dia==null?null:Number(dia)});

/* aplica a opção "onde aparece" à categoria */
function applyScope(c,scope,y,m,creating){const v=scopeVis(scope,y,m,creating);if(v){c.vis=v;delete c.lib}else{delete c.vis;c.lib=true}}

/* cria a categoria já com a vigência escolhida (sem valor: o valor é lançado depois) */
function createCat(tipo,input,scope,y,m){
  const err=validateCat(input,tipo,y,m);if(err)throw new Error(err);
  const{nome,dia}=cleanInput(input),c=makeCat(tipo,nome,dia);applyScope(c,scope,y,m,true);S.cats.push(c);return c}

/* corrige nome/dia em TODOS os meses (ex.: erro de digitação), sem criar versão nova */
function renameCatEverywhere(id,input){const c=catById(id),t=new Date();
  const err=validateCat(input,c.tipo,t.getFullYear(),t.getMonth(),id);if(err)throw new Error(err);
  const{nome,dia}=cleanInput(input);c.nome=nome;c.dia=dia;return c}

/* altera a categoria DO MÊS (y,m) EM DIANTE. O que veio antes continua como estava.
   - Se a categoria só começa neste mês ou depois: edita direto.
   - Senão: cria uma nova "versão", encerra a antiga no mês anterior e leva os lançamentos de (y,m) em diante para a nova. */
function reviseCat(id,input,scope,y,m){
  const c=catById(id),t=ym(y,m);if(!c)throw new Error('Categoria não encontrada.');
  const err=validateCat(input,c.tipo,y,m,id);if(err)throw new Error(err);
  const{nome,dia}=cleanInput(input);
  if(c.vis&&ymOf(c.vis.from)>=t){                              // ainda nem começou: muda no lugar
    const f=c.vis.from;c.nome=nome;c.dia=dia;applyScope(c,scope,f[0],f[1],false);return c}
  const n=makeCat(c.tipo,nome,dia);applyScope(n,scope,y,m,false);n.prevId=c.id;
  if(c.extra){const ex=c.extra.filter(k=>k>=exKey(y,m)),ficam=c.extra.filter(k=>k<exKey(y,m));if(ex.length)n.extra=ex;if(ficam.length)c.extra=ficam;else delete c.extra}
  const prev=fromYm(t-1);
  if(c.vis){c.vis={from:c.vis.from,to:c.vis.to&&ymOf(c.vis.to)<t-1?c.vis.to:prev}}else c.until=prev;
  if(c.until&&ymOf(c.until)>t-1)c.until=prev;
  for(const k of Object.keys(S.data)){if(!k.startsWith(c.id+'|'))continue;const p=parseKey(k);
    if(ym(p.y,p.m)>=t){S.data[key(n.id,p.y,p.m)]=S.data[k];delete S.data[k]}}
  S.cats.splice(S.cats.indexOf(c)+1,0,n);return n}

/* ---- usar uma categoria que já existe num mês (tela Mês) ---- */
/* inclui a categoria no mês (y,m) sem criar nada novo */
function useCatInMonth(id,y,m){const c=catById(id);if(!c)throw new Error('Categoria não encontrada.');
  const k=exKey(y,m);c.extra??=[];if(!c.extra.includes(k)){c.extra.push(k);c.extra.sort()}return c}
/* categorias que podem ser incluídas no mês: ainda não aparecem nele e batem com o que foi digitado (em qualquer parte do nome) */
function pickableCats(tipo,y,m,q=''){
  const st=catStats(),t=ym(y,m),shown=new Set(visCats(tipo,y,m).map(c=>normName(c.nome))),
        antigas=new Set(S.cats.map(c=>c.prevId).filter(Boolean)),nq=normName(q),tk=nq?nq.split(' '):[],grupos=new Map();
  for(const c of cats(tipo)){const n=normName(c.nome);if(antigas.has(c.id)||shown.has(n)||!tk.every(x=>n.includes(x)))continue;
    const g=grupos.get(n)??[];g.push(c);grupos.set(n,g)}
  const escolhida=g=>g.find(c=>aliveFrom(c,y,m)&&!(c.vis&&ymOf(c.vis.from)>t))||g[g.length-1];
  const rec=c=>st[c.id]?.recent||0,lst=c=>st[c.id]?.last??-1;
  return[...grupos.values()].map(escolhida).sort((a,b)=>(normName(b.nome).startsWith(nq)-normName(a.nome).startsWith(nq))||rec(b)-rec(a)||lst(b)-lst(a)||normName(a.nome).localeCompare(normName(b.nome)))}
