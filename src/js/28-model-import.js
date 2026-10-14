/* Leitura de extrato da conta e fatura do cartão (PDF do Itaú), já convertidos em LINHAS de texto.
   Aqui não há tela nem PDF: só a interpretação das linhas, por isso é testável. (Quem lê o PDF e monta as linhas é 66-ui-import.js.)
   Também fica aqui o que acontece com os itens depois de importados: levar para uma categoria ou para um lançamento. */

const NUMBR='-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+,\\d{2}';
const brNum=s=>Math.round(parseFloat(String(s).replace(/\./g,'').replace(',','.'))*100)/100;
const reFat=new RegExp('^(\\d{2})/(\\d{2}) (.+?) ('+NUMBR+')$'),reExt=new RegExp('^(\\d{2})/(\\d{2})/(\\d{4}) (.+?) ('+NUMBR+')$'),reUltimo=new RegExp('('+NUMBR+')$');

/* "cartao", "conta" ou null (não parece um extrato/fatura do Itaú) */
function detectStatement(lines){
  if(lines.some(l=>/^Lançamentos: compras e saques/i.test(l)))return'cartao';
  if(lines.some(l=>/^extrato conta/i.test(l)))return'conta';
  return null}

/* Fatura do cartão: só entram "Lançamentos: compras e saques" e "Lançamentos internacionais" (+ repasse de IOF, que faz parte do total).
   Ficam de fora: pagamentos, compras parceladas das PRÓXIMAS faturas, encargos e simulações. */
function parseFatura(lines){
  let sec=null,total=null,iof=null;const itens=[];
  for(const L of lines){
    if(/^Lançamentos: compras e saques/i.test(L)){sec='compras';continue}
    if(/^Lançamentos internacionais/i.test(L)){sec='intl';continue}
    if(/^(Pagamentos efetuados|Compras parceladas|Lançamentos no cartão|Total dos pagamentos)/i.test(L)){sec=null;continue}
    let x=/^Total dos lançamentos atuais\s+(.+)$/i.exec(L);if(x&&reUltimo.test(x[1])){total=brNum(reUltimo.exec(x[1])[1]);sec=null;continue}
    x=/^Repasse de IOF em R\$\s*(.+)$/i.exec(L);if(x&&reUltimo.test(x[1])){iof=brNum(reUltimo.exec(x[1])[1]);continue}
    if(!sec)continue;
    const m=reFat.exec(L);if(m)itens.push({dia:+m[1],mes:+m[2],desc:m[3].replace(/\s+/g,' ').trim(),valor:brNum(m[4]),intl:sec==='intl'})}
  if(iof)itens.push({dia:null,mes:null,desc:'Repasse de IOF (compras internacionais)',valor:iof,intl:true});
  if(total==null){const t=lines.map(l=>/Total desta fatura\s+(.+)$/i.exec(l)).find(Boolean);if(t&&reUltimo.test(t[1]))total=brNum(reUltimo.exec(t[1])[1])}
  const soma=Math.round(itens.reduce((s,i)=>s+i.valor,0)*100)/100;
  return{kind:'cartao',itens,total,soma,confere:total!=null&&Math.abs(total-soma)<0.005}}

/* Extrato da conta: uma linha por movimentação (valor com sinal: + entrou, − saiu). "SALDO DO DIA" não é movimentação. */
function parseExtrato(lines){
  const itens=[];
  for(const L of lines){const m=reExt.exec(L);if(!m)continue;const desc=m[4].replace(/\s+/g,' ').trim();
    if(/^SALDO (DO DIA|ANTERIOR|FINAL)/i.test(desc))continue;
    itens.push({dia:+m[1],mes:+m[2],ano:+m[3],desc,valor:brNum(m[5])})}
  return{kind:'conta',itens}}

/* quais meses o extrato traz (o extrato vem com dias a mais: o app só usa o mês escolhido) */
const extratoMeses=itens=>[...new Set(itens.map(i=>i.ano*12+i.mes-1))].sort((a,b)=>a-b);
const extratoDoMes=(itens,y,m)=>itens.filter(i=>i.ano===y&&i.mes-1===m);

/* movimentações que normalmente NÃO devem ser importadas: o pagamento da fatura já está na categoria do cartão */
const pareceFatura=desc=>/\bFATURA\b.*\b(ITAU|CARTAO)\b|\bPAGAMENTO (DE )?FATURA\b|\bITAU UNICLASS\b/i.test(desc);

/* ---- importar para o mês ---- */
const CARTAO_CAT='CC Itaú',MOV_CAT='Movimentação CC Itaú';
/* acha a categoria de despesa pelo nome (sem acento/maiúscula) que esteja disponível no mês; senão cria uma "só sob demanda" e inclui no mês */
function ensureMonthCat(tipo,nome,y,m){
  const n=normName(nome),c=S.cats.find(x=>x.tipo===tipo&&normName(x.nome)===n&&!S.cats.some(z=>z.prevId===x.id)&&(aliveFrom(x,y,m)||showsInMonth(x,y,m,catStats())))
    ||S.cats.find(x=>x.tipo===tipo&&normName(x.nome)===n&&!S.cats.some(z=>z.prevId===x.id));
  const cat=c||createCat(tipo,{nome,dia:''},'lib',y,m);useCatInMonth(cat.id,y,m);return{cat,criada:!c}}
const dataTxt=i=>i.dia?`${String(i.dia).padStart(2,'0')}/${String(i.mes).padStart(2,'0')} `:'';
/* chave estável do item importado (para não importar duas vezes o mesmo arquivo); repetidos idênticos ganham contador */
function impKeys(kind,itens){const seen={};return itens.map(i=>{const k=`${kind}|${i.ano||''}|${i.mes||''}|${i.dia||''}|${normName(i.desc)}|${i.valor}`;seen[k]=(seen[k]||0)+1;return k+'|'+seen[k]})}
/* chaves de tudo o que já veio de importação (no cartão, na movimentação ou depois de levado para outra categoria) */
function chavesImportadas(){const s=new Set();for(const v of Object.values(S.data))for(const i of v.items){if(i.imp)s.add(i.imp);if(i.moved)s.add(i.moved)}return s}
/* grava os itens escolhidos. cartão: tudo em "CC Itaú" como previsto; conta: tudo em "Movimentação CC Itaú" já realizado.
   Retorna {cat, novos, repetidos, criada}. */
function importStatement(kind,itens,y,m){
  const cartao=kind==='cartao',{cat,criada}=ensureMonthCat('pagar',cartao?CARTAO_CAT:MOV_CAT,y,m),cell=ens(cat.id,y,m),keys=impKeys(kind,itens),have=chavesImportadas();
  let novos=0,repetidos=0;
  itens.forEach((it,n)=>{const k=keys[n];if(have.has(k)){repetidos++;return}
    // despesa: valor positivo = gasto. Extrato: saiu (−) vira +, entrou (+) vira − (reduz a despesa).
    const v=cartao?it.valor:-it.valor;cell.items.push({v,d:(dataTxt(it)+it.desc).trim(),ok:!cartao,imp:k});novos++});
  return{cat,novos,repetidos,criada}}

/* ---- depois de importado ---- */
const itemsLinked=ref=>{const r=[];for(const[k,v]of Object.entries(S.data))v.items.forEach((i,n)=>{if(i.ref===ref)r.push({key:k,n,item:i})});return r};
/* onde o item do cartão já foi usado (cópias só informativas) */
const cardLinks=item=>item.imp?itemsLinked(item.imp):[];

/* cartão → vira UMA CATEGORIA do mês (só informativa: aparece na tabela com o 💳 e não soma). O item continua no cartão. */
function cardItemToCategory(cid,y,m,idx,nome){
  const it=(cellOf(cid,y,m)?.items||[])[idx];if(!it||!it.imp)throw new Error('Este item não veio de uma importação.');
  if(cardLinks(it).length)throw new Error('Este item já foi levado para outro lugar.');
  const c=createCat('pagar',{nome,dia:''},'lib',y,m);useCatInMonth(c.id,y,m);
  ens(c.id,y,m).items.push({v:it.v,d:it.d,ok:true,info:true,lock:true,ref:it.imp});return c}
/* cartão → vira um LANÇAMENTO (com 💳, não soma) numa categoria que já existe. O item continua no cartão. */
function cardItemToExisting(cid,y,m,idx,destId){
  const it=(cellOf(cid,y,m)?.items||[])[idx],dest=catById(destId);if(!it||!it.imp)throw new Error('Este item não veio de uma importação.');
  if(!dest)throw new Error('Escolha uma categoria.');if(dest.id===cid)throw new Error('Escolha outra categoria que não seja o próprio cartão.');
  if(cardLinks(it).length)throw new Error('Este item já foi levado para outro lugar.');
  useCatInMonth(dest.id,y,m);ens(dest.id,y,m).items.push({v:it.v,d:it.d,ok:true,info:true,lock:true,ref:it.imp});return dest}
/* desfaz a ligação: apaga as cópias informativas do item do cartão */
function unlinkCardItem(item){for(const l of cardLinks(item).reverse())S.data[l.key].items.splice(l.n,1)}

/* conta → o item SAI da "Movimentação" e vai para outra categoria (a movimentação diminui, o destino aumenta).
   O sinal se ajusta ao tipo do destino: despesa guarda gasto como positivo, receita guarda entrada como positivo. */
const valorNoTipo=(it,tipo)=>tipo==='pagar'?it.v:-it.v;      // it.v está no sinal de "despesa" (a Movimentação é despesa)
function contaItemMove(cid,y,m,idx,dest){
  const cell=cellOf(cid,y,m),it=(cell?.items||[])[idx];if(!it||!it.imp)throw new Error('Este item não veio de uma importação.');
  let c=typeof dest==='string'?catById(dest):null;
  if(dest&&dest.nome){const tipo=dest.tipo||(it.v>0?'pagar':'receber');c=createCat(tipo,{nome:dest.nome,dia:''},'lib',y,m)}
  if(!c)throw new Error('Escolha uma categoria.');if(c.id===cid)throw new Error('Escolha outra categoria.');
  useCatInMonth(c.id,y,m);cell.items.splice(idx,1);
  ens(c.id,y,m).items.push({v:valorNoTipo(it,c.tipo),d:it.d,ok:true,moved:it.imp});return c}
