/* Importação de anos (mescla categorias e lançamentos) */
function normName(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function mergeImport(o){const hasY=y=>Object.keys(S.data).some(k=>k.split('|')[1]==y&&S.data[k].items.length);
  const clash=o.anos.filter(hasY);
  if(clash.length&&!confirm(`Os anos ${clash.join(', ')} já têm lançamentos e serão SUBSTITUÍDOS pelos do arquivo. Continuar?`))return;
  const map={};o.cats.forEach(c=>{let ex=S.cats.find(x=>x.tipo===c.tipo&&normName(x.nome)===normName(c.nome));
    if(!ex){ex={id:'c'+Math.random().toString(36).slice(2,9),tipo:c.tipo,nome:c.nome,dia:c.dia};S.cats.push(ex)}else if(!ex.dia&&c.dia)ex.dia=c.dia;map[c.id]=ex.id});
  Object.keys(S.data).filter(k=>o.anos.includes(+k.split('|')[1])).forEach(k=>delete S.data[k]);
  for(const[k,v]of Object.entries(o.data)){const[c,y,m]=k.split('|');S.data[`${map[c]}|${y}|${m}`]=v}
  o.anos.forEach(y=>{if(!S.anos.includes(y))S.anos.push(y)});S.anos.sort((a,b)=>a-b);
  Object.entries(o.saldoIni||{}).forEach(([y,v])=>S.saldoIni[y]=v);
  save();render();alert(`Importado: anos ${o.anos.join(', ')}.`)}
