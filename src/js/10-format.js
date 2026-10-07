/* Formatação e leitura de valores (R$, escape de HTML, parseV) */
const fmtN=n=>Math.abs(n)<0.005&&!n?'':(+n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const R$=n=>(n<0?'-':'')+'R$ '+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const RP=n=>Math.abs(n)<0.005?R$(0):'-'+R$(Math.abs(n)); // a pagar: sempre com sinal negativo
const K=v=>Math.abs(v)>=1000?(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k':String(v);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function parseV(t){t=String(t).trim().replace(/R\$|\s/g,'');if(!t)return 0;const neg=t.startsWith('-');t=t.replace('-','');
  if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,'');
  const v=parseFloat(t);return isNaN(v)?0:(neg?-v:v)}
