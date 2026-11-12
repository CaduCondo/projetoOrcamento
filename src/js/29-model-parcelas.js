/* Parcelas futuras: compra parcelada no cartão ("LOJA 03/08") = valor que ainda vai cair nos próximos meses.
   Lê os itens que vieram da fatura do cartão (importação) e projeta as parcelas que faltam, sem somar duas vezes a mesma compra. */
const PARC_RE=/\s(\d{1,2})\/(\d{1,2})\s*$/;
function parcelaDe(desc){const x=PARC_RE.exec(String(desc||''));if(!x)return null;const n=+x[1],t=+x[2];
  return t>=2&&t<=60&&n>=1&&n<=t?{n,t,base:String(desc).slice(0,x.index).replace(/^\d{2}\/\d{2}\s+/,'').trim()}:null}
/* compras parceladas em andamento depois do mês (y,m): cada uma com a parcela mais recente que o app conhece */
function comprasParceladas(y,m){const ref=ym(y,m),ult={};
  for(const[k,v]of Object.entries(S.data)){const p=parseKey(k),cat=catById(p.c);if(!cat)continue;
    for(const it of v.items||[]){if(!it.imp||!String(it.imp).startsWith('cartao|')||it.info)continue;
      const pc=parcelaDe(it.d);if(!pc)continue;const i=ym(p.y,p.m),ch=normName(pc.base)+'|'+pc.t;
      if(!ult[ch]||i>ult[ch].i||(i===ult[ch].i&&pc.n>ult[ch].n))ult[ch]={base:pc.base,v:it.v,n:pc.n,t:pc.t,i}}}
  return Object.values(ult).map(c=>({...c,fim:c.i+(c.t-c.n),faltam:c.t-c.n})).filter(c=>c.fim>ref&&c.faltam>0)
    .sort((a,b)=>b.faltam-a.faltam||b.v-a.v)}
/* total que cada mês seguinte já tem comprometido por parcelas (até "meses" à frente) */
function parcelasPorMes(y,m,meses=12){const ref=ym(y,m),compras=comprasParceladas(y,m),out=[];
  for(let k=1;k<=meses;k++){const i=ref+k,itens=compras.filter(c=>i>c.i&&i<=c.fim).map(c=>({base:c.base,v:c.v,n:c.n+(i-c.i),t:c.t}));
    if(itens.length)out.push({idx:i,y:Math.floor(i/12),m:i%12,total:Math.round(itens.reduce((s,x)=>s+x.v,0)*100)/100,itens})}
  return out}
