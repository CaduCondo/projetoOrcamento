/* Máscara de moeda nos campos de valor */
/* máscara de moeda: digita só números, vira 1.234,56 */
document.addEventListener('input',e=>{const el=e.target;if(!el.classList||!el.classList.contains('money'))return;
  const neg=el.value.includes('-'),d=el.value.replace(/\D/g,'');if(!d){el.value=neg?'-':'';return}
  el.value=(neg?'-':'')+(parseInt(d,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})},true);
const moneyIn=(attrs,v)=>`<input class="money" inputmode="decimal" placeholder="0,00" ${attrs} value="${v||v===0&&false?fmtN(v):''}">`;
