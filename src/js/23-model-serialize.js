/* Serialização: como os dados viram documentos na nuvem e voltam.
   Estrutura: 1 documento "meta" (categorias, anos, patrimônio) + 1 documento por ano (os lançamentos). */
function serializeState(s){
  const years={};
  for(const[k,v]of Object.entries(s.data)){const{c,y,m}=parseKey(k);(years[y]??={})[c+'|'+m]=v}
  return{meta:JSON.stringify({cats:s.cats,anos:s.anos,saldoIni:s.saldoIni,saldos:s.saldos,dividas:s.dividas,bens:s.bens}),
         years:Object.fromEntries(Object.entries(years).map(([y,v])=>[y,JSON.stringify(v)]))}}
/* yearJsons: {"2026": "<json>", ...} */
function deserializeState(metaJson,yearJsons){
  const st=JSON.parse(metaJson);st.data={};
  for(const[y,j]of Object.entries(yearJsons))for(const[k,v]of Object.entries(JSON.parse(j))){const[c,m]=k.split('|');st.data[`${c}|${y}|${m}`]=v}
  return mig(st)}
