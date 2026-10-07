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
  s.bens??=[];s.saldos??=[];s.dividas??=[];s.saldoIni??={};s.anos.sort((a,b)=>a-b);return s}

const newId=()=>'c'+Math.random().toString(36).slice(2,9);
const makeCat=(tipo,nome,dia=null)=>({id:newId(),tipo,nome,dia});

/* conta nova: categorias básicas e o ano atual */
function blank(){const y=new Date().getFullYear(),c=makeCat;
  return{anos:[y],saldoIni:{},saldos:[],dividas:[],bens:[],data:{},cats:[c('receber','Salário',5),c('receber','Outras receitas'),c('pagar','Moradia',10),c('pagar','Contas (luz, água, internet)'),c('pagar','Mercado'),c('pagar','Transporte'),c('pagar','Saúde'),c('pagar','Lazer'),c('pagar','Outras despesas')]}}
