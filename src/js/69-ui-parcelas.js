/* Parcelas do cartão já comprometidas nos próximos meses (lê as compras parceladas das faturas importadas). */
const ParcelasDialog={
  open(){const pm=parcelasPorMes(selY,selM,12),cs=comprasParceladas(selY,selM);
    dlg3.innerHTML=`<div class="dh"><div><h3>💳 Parcelas já comprometidas</h3><div class="sub">Compras parceladas no cartão que ainda vão cair nos próximos meses (a partir de ${MESES[selM].toLowerCase()}/${selY})</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">${pm.length?pm.map(x=>`<div class="pmes"><div class="pmh"><b>${MESES[x.m]} de ${x.y}</b><span class="neg">${R$(x.total)}</span></div>
        ${x.itens.map(i=>`<div class="pit"><span>${esc(i.base)}</span><span class="sub">parcela ${i.n} de ${i.t}</span><span>${R$(i.v)}</span></div>`).join('')}</div>`).join('')
      :'<p class="hint">Nenhuma compra parcelada em andamento. Elas aparecem aqui depois que você importa a fatura do cartão (uma compra de “LOJA 03/08” mostra que faltam 5 parcelas).</p>'}
      ${cs.length?`<p class="hint">${cs.length} compra${cs.length>1?'s':''} parcelada${cs.length>1?'s':''} em andamento. O valor de cada mês é uma previsão: parcelas seguem o mesmo valor da última fatura importada.</p>`:''}</div>
     <div class="df"><button type="button" class="btn" data-cclose>Fechar</button></div>`;
    dlg3.showModal()}
};
document.addEventListener('click',e=>{if(e.target.closest('[data-parc]'))ParcelasDialog.open()});

/* Carteira: janela rápida para anotar entrada ou saída de dinheiro em papel */
const CarteiraDialog={
  open(tipo){if(readOnly)return;const sai=tipo==='saiu';
    dlg3.innerHTML=`<form id="cartf" novalidate><div class="dh"><div><h3>${sai?'Gastei em dinheiro':'Entrou dinheiro na carteira'}</h3><div class="sub">Saldo atual: ${R$(carteiraSaldo())}</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db"><label class="f">Valor (R$)<input id="cartv" class="money" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>
      <label class="f">Descrição (opcional)<input id="cartd" maxlength="60" autocomplete="off" placeholder="${sai?'ex.: Feira':'ex.: Saque no caixa'}"></label>
      <div class="err" id="carte" role="alert"></div></div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button class="btn" data-cart-sai="${sai?1:0}">Salvar</button></div></form>`;
    dlg3.showModal();setTimeout(()=>el('cartv')?.focus(),0)}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-cart]');if(b)CarteiraDialog.open(b.dataset.cart)});
dlg3.addEventListener('submit',e=>{if(e.target.id!=='cartf')return;e.preventDefault();
  const sai=!!+e.submitter?.dataset.cartSai||!!+dlg3.querySelector('[data-cart-sai]').dataset.cartSai,v=parseV(el('cartv').value);
  try{carteiraMov(sai?-Math.abs(v):Math.abs(v),el('cartd').value);save();dlg3.close();snackbar(`Carteira: ${R$(carteiraSaldo())}.`)}catch(x){el('carte').textContent=x.message}});
