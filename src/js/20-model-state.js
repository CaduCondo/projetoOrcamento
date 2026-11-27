/* Estado global da aplicação, migração de dados antigos e conta nova em branco */
let user=null,S=null;                       // e-mail logado e os dados dele
let readOnly=false,viewing=null;            // administrador vendo os dados de outra pessoa (somente leitura)
let modo='real',tab='mes',period='ano',catSel='',loginMode='in';
let selY=new Date().getFullYear(),selM=new Date().getMonth();

/* escolhe o ano/mês inicial: o atual, se existir nos dados */
function initSelection(){const now=new Date(),cy=now.getFullYear();
  selY=S.anos.includes(cy)?cy:S.anos[S.anos.length-1];selM=selY===cy?now.getMonth():0;tab='mes'}

/* converte o formato antigo (um ano só) para o atual (vários anos) e completa campos faltantes */
function mig(s){if(!s.anos){const y=s.ano||2026;s.anos=[y];s.saldoIni={[y]:s.saldoInicial??0};const d={};
  for(const[k,v]of Object.entries(s.data||{})){const[c,m]=k.split('|');d[`${c}|${y}|${m}`]={items:v.items.map(i=>({v:i.v,d:i.d,ok:!!v.ok}))}}
  s.data=d;delete s.ano;delete s.saldoInicial}
  s.bens??=[];s.saldos??=[];s.dividas??=[];s.autos??=[];s.saldoIni??={};s.anos.sort((a,b)=>a-b);return saneIds(s)}

/* Backup importado e dados lidos da nuvem são entrada de FORA: identificadores e tipo entram em atributos do HTML, então só valem se forem "seguros".
   Id estranho vira um id novo (os lançamentos acompanham); tipo estranho vira "pagar"; lançamento órfão com id estranho é descartado. */
const ID_SEGURO=/^[A-Za-z0-9_-]{1,64}$/;
function saneIds(s){const ren={},novo=()=>'c'+Math.random().toString(36).slice(2,9);
  (s.cats||[]).forEach(c=>{if(c.tipo!=='receber'&&c.tipo!=='pagar')c.tipo='pagar';if(!ID_SEGURO.test(String(c.id))){const n=novo();ren[c.id]=n;c.id=n}});
  (s.cats||[]).forEach(c=>{if(c.prevId!=null){if(c.prevId in ren)c.prevId=ren[c.prevId];else if(!ID_SEGURO.test(String(c.prevId)))delete c.prevId}});
  (s.autos||[]).forEach(a=>{if(!ID_SEGURO.test(String(a.id)))a.id='a'+Math.random().toString(36).slice(2,8)});
  if(s.data){const d={};for(const[k,v]of Object.entries(s.data)){const i=k.indexOf('|'),cid=k.slice(0,i),resto=k.slice(i);
    if(cid in ren)d[ren[cid]+resto]=v;else if(ID_SEGURO.test(cid))d[k]=v}      // com id estranho e sem categoria: descartado
    s.data=d}
  return s}
const newId=()=>'c'+Math.random().toString(36).slice(2,9);
const makeCat=(tipo,nome,dia=null)=>({id:newId(),tipo,nome,dia});

/* conta nova: categorias básicas e o ano atual */
function blank(){const y=new Date().getFullYear(),c=makeCat;
  return{anos:[y],saldoIni:{},saldos:[],dividas:[],bens:[],autos:[],data:{},cats:[c('receber','Salário',5),c('receber','Outras receitas'),c('pagar','Moradia',10),c('pagar','Contas (luz, água, internet)'),c('pagar','Mercado'),c('pagar','Transporte'),c('pagar','Saúde'),c('pagar','Lazer'),c('pagar','Outras despesas')]}}
