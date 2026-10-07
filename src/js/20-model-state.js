/* Estado: migração de dados antigos e conta nova em branco */
/* ---------- ESTADO / MIGRAÇÃO ---------- */
function mig(s){if(!s.anos){const y=s.ano||2026;s.anos=[y];s.saldoIni={[y]:s.saldoInicial??0};const d={};
  for(const[k,v]of Object.entries(s.data||{})){const[c,m]=k.split('|');d[`${c}|${y}|${m}`]={items:v.items.map(i=>({v:i.v,d:i.d,ok:!!v.ok}))}}
  s.data=d;delete s.ano;delete s.saldoInicial}
  s.bens??=[];s.saldos??=[];s.dividas??=[];s.saldoIni??={};s.anos.sort((a,b)=>a-b);return s}
function blank(){const y=new Date().getFullYear(),c=(t,n,dia)=>({id:'c'+Math.random().toString(36).slice(2,8),tipo:t,nome:n,dia:dia||null});
  return{anos:[y],saldoIni:{},saldos:[],dividas:[],bens:[],data:{},cats:[c('receber','Salário',5),c('receber','Outras receitas'),c('pagar','Moradia',10),c('pagar','Contas (luz, água, internet)'),c('pagar','Mercado'),c('pagar','Transporte'),c('pagar','Saúde'),c('pagar','Lazer'),c('pagar','Outras despesas')]}}
