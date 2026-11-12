/* Carteira: dinheiro em papel. É um "saldo" do Patrimônio marcado com carteira:true; cada entrada/saída fica num pequeno histórico. */
const CARTEIRA_NOME='Carteira (dinheiro)',CARTEIRA_HIST=30;
const carteiraItem=()=>S.saldos.find(i=>i.carteira)||null;
const carteiraSaldo=()=>carteiraItem()?.valor||0;
/* delta > 0: entrou dinheiro (sacou do banco, recebeu); delta < 0: saiu (gastou). Devolve o novo saldo. */
function carteiraMov(delta,desc=''){delta=Math.round(Number(delta)*100)/100;if(!delta||isNaN(delta))throw new Error('Informe um valor diferente de zero.');
  let c=carteiraItem();if(!c){c={nome:CARTEIRA_NOME,valor:0,carteira:true,hist:[]};S.saldos.unshift(c)}
  c.valor=Math.round((c.valor+delta)*100)/100;
  c.hist=[{t:new Date().toISOString().slice(0,10),v:delta,d:String(desc||'').trim()},...(c.hist||[])].slice(0,CARTEIRA_HIST);return c.valor}
