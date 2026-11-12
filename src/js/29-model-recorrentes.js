/* Assinaturas e contas recorrentes: despesas que se repetem todo mês com valor parecido (Netflix, internet, academia…).
   Olha os últimos meses; ignora compras parceladas. */
function recorrentes(y,m,meses=6){const mapa={},ref=ym(y,m);
  for(let k=0;k<meses;k++){const i=ref-k,yy=Math.floor(i/12),mm=i%12;
    for(const l of lancamentos(yy,mm)){if(l.v>=0||parcelaDe(l.it.d))continue;
      const nome=descLimpa(l.it),txt=autoTxt(nome);if(txt.length<3)continue;
      (mapa[txt]??={txt,nome,itens:[]}).itens.push({i,v:-l.v,cat:l.sem?'':l.cat?.nome||''})}}
  return Object.values(mapa).map(x=>{const ms=[...new Set(x.itens.map(a=>a.i))].sort((a,b)=>b-a);if(ms.length<3)return null;
    const vs=x.itens.map(a=>a.v),min=Math.min(...vs),max=Math.max(...vs);if(max>min*1.3)return null;           // valor muito diferente: não é assinatura
    const ult=x.itens.find(a=>a.i===ms[0]);
    return{txt:x.txt,nome:x.nome,v:ult.v,n:ms.length,ultimo:ms[0],cat:ult.cat,noMes:ms[0]===ref}}).filter(Boolean).sort((a,b)=>b.v-a.v)}
