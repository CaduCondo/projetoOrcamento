/* Dados vindos direto do banco (Meu Pluggy, pelo "porteiro" do Cloudflare) -> itens no mesmo formato das outras importações.
   conta: valor com sinal (+ entrou / − saiu), igual ao que a Pluggy envia; cartão: compra positiva, estorno/pagamento negativo. */

const contaCartao=c=>c&&c.type==='CREDIT';
const nomeConta=c=>`${c.name||'Conta'}${c.number?' · final '+c.number:''}`;
/* lançamentos da Pluggy -> itens do app */
function pluggyItens(trans,cartao){
  return(trans||[]).map(t=>{const d=parseData(t.date);if(!dataOk(d))return null;let desc=String(t.description||'(sem descrição)').replace(/\s+/g,' ').trim();
    if(cartao&&t.totalInstallments>1&&!/\b\d{1,2}\/\d{1,2}\s*$/.test(desc))desc+=` ${String(t.installment||'').padStart(2,'0')}/${String(t.totalInstallments).padStart(2,'0')}`;
    const valor=Math.round(Number(t.amount)*100)/100;if(isNaN(valor))return null;
    return{...d,desc,valor,billId:t.billId||null}}).filter(Boolean)}
/* faturas da conta de cartão, da mais nova para a mais antiga */
const faturasOrdenadas=fs=>[...(fs||[])].sort((a,b)=>String(b.dueDate).localeCompare(String(a.dueDate)));
const rotuloFatura=f=>{const d=parseData(f.dueDate);return`vence ${d?String(d.dia).padStart(2,'0')+'/'+String(d.mes).padStart(2,'0')+'/'+d.ano:'?'} · R$ ${fmtN(f.totalAmount||0)}`};
/* itens de uma fatura + conferência com o total que o banco informa */
function itensDaFatura(todos,fatura){
  const itens=todos.filter(i=>i.billId===fatura.id),soma=Math.round(itens.reduce((s,i)=>s+i.valor,0)*100)/100,total=Math.round(Number(fatura.totalAmount||0)*100)/100;
  return{itens,soma,total,confere:Math.abs(soma-total)<0.005}}
