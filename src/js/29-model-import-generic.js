/* Importação de QUALQUER banco (além do layout do Itaú em 28-model-import.js):
   - OFX: formato padrão de extrato que a maioria dos bancos oferece ("exportar OFX/Money/Quicken");
   - CSV/planilha do banco: a pessoa diz qual coluna é a data, a descrição e o valor (o app tenta adivinhar);
   - PDF de outros bancos: modo "genérico" que procura linhas com data + descrição + valor (a pessoa confere antes).
   Tudo aqui é texto -> itens, sem tela. Os itens saem no mesmo formato do Itaú: {dia,mes,ano,desc,valor}
   (conta: valor com sinal, + entrou / − saiu; cartão: compra positiva, estorno negativo). */

const BANCOS=[['itau','Itaú'],['itaú','Itaú'],['bradesco','Bradesco'],['santander','Santander'],['banco do brasil','Banco do Brasil'],['bb.com','Banco do Brasil'],
  ['caixa economica','Caixa'],['caixa econômica','Caixa'],['nubank','Nubank'],['nu pagamentos','Nubank'],['banco inter','Inter'],['bancointer','Inter'],['c6 bank','C6 Bank'],['c6bank','C6 Bank'],
  ['btg','BTG Pactual'],['sicredi','Sicredi'],['sicoob','Sicoob'],['banco original','Original'],['banco pan','Pan'],['neon','Neon'],['picpay','PicPay'],['mercado pago','Mercado Pago'],
  ['xp investimentos','XP'],['porto seguro','Porto Seguro'],['will bank','Will Bank'],['digio','Digio'],['bmg','BMG'],['safra','Safra'],['banrisul','Banrisul'],['next','Next'],['agibank','Agibank'],['pagbank','PagBank'],['pagseguro','PagBank']];
/* nome do banco citado no arquivo (só para mensagens e para o registro de arquivos não lidos; nada de dados pessoais) */
function detectBank(text){const t=normName(String(text||'').slice(0,20000));for(const[k,n]of BANCOS)if(t.includes(normName(k)))return n;return null}

/* valor em qualquer formato comum: "R$ -1.234,56", "-1234.56", "1.234,56 D", "(123,45)", "1,234.56" */
function parseValor(s){let t=String(s??'').trim();if(!t)return null;
  let neg=/^\(.*\)$/.test(t)||/-/.test(t)||/\d\s?[dD]$/.test(t);t=t.replace(/[^\d.,]/g,'');if(!/\d/.test(t))return null;
  const lc=Math.max(t.lastIndexOf(','),t.lastIndexOf('.'));
  let n=lc>=0&&t.length-lc-1<=2?parseFloat(t.slice(0,lc).replace(/[.,]/g,'')+'.'+t.slice(lc+1)):parseFloat(t.replace(/[.,]/g,''));
  if(isNaN(n))return null;n=Math.round(n*100)/100;return neg?-n:n}
/* data: dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, aaaa-mm-dd, aaaammdd (OFX) ou dd/mm (sem ano) */
function parseData(s,anoPadrao=null){const t=String(s??'').trim();let m;
  if(m=/^(\d{4})-(\d{2})-(\d{2})/.exec(t))return{dia:+m[3],mes:+m[2],ano:+m[1]};
  if(m=/^(\d{4})(\d{2})(\d{2})/.exec(t))return{dia:+m[3],mes:+m[2],ano:+m[1]};
  if(m=/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(t)){let a=+m[3];if(a<100)a+=2000;return{dia:+m[1],mes:+m[2],ano:a}}
  if(m=/^(\d{1,2})\/(\d{1,2})\b/.exec(t))return{dia:+m[1],mes:+m[2],ano:anoPadrao};
  return null}
const dataOk=d=>d&&d.dia>=1&&d.dia<=31&&d.mes>=1&&d.mes<=12;
/* pagamento da fatura dentro do próprio arquivo do cartão (fica desmarcado: não é compra) */
const pagamentoDeFatura=desc=>/\bPAGAMENTO\b|\bPAGTO\b|PAGAMENTO RECEBIDO|PGTO FATURA/i.test(desc);

/* ---- OFX ---- */
function parseOFX(text){
  const t=String(text||''),cartao=/<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(t),itens=[];
  const tag=(b,n)=>{const m=new RegExp('<'+n+'>([^<\\r\\n]*)','i').exec(b);return m?m[1].trim():''};
  for(const b of t.split(/<STMTTRN>/i).slice(1)){const bloco=b.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0];
    const d=parseData(tag(bloco,'DTPOSTED')),v=parseValor(tag(bloco,'TRNAMT')),desc=(tag(bloco,'MEMO')||tag(bloco,'NAME')||'(sem descrição)').replace(/\s+/g,' ');
    if(!dataOk(d)||v==null)continue;
    if(cartao){if(v>0&&pagamentoDeFatura(desc))continue;itens.push({...d,desc,valor:-v})}       // cartão no OFX: compra vem negativa
    else itens.push({...d,desc,valor:v})}
  const org=tag(t,'ORG')||'';
  return{kind:cartao?'cartao':'conta',itens,banco:detectBank(org+' '+t.slice(0,3000))}}

/* ---- CSV/planilha de banco ---- */
const COL_DATA=/^(data|date|dt|dia)\b|data (da )?(compra|transa|lan[cç])/i,COL_DESC=/descri|hist[oó]rico|estabelecimento|lan[cç]amento|title|t[ií]tulo|memo|detalhe/i,
  COL_VALOR=[/^valor\b/i,/amount|value/i,/^quantia|^montante/i],COL_CRED=/^cr[eé]dito|^entrada/i,COL_DEB=/^d[eé]bito|^sa[ií]da/i;
/* adivinha as colunas pelo cabeçalho (ou pelo conteúdo da 1ª linha de dados) */
function csvGuess(rows){
  const hi=rows.findIndex(r=>r.filter(c=>String(c).trim()).length>=2);if(hi<0)return null;
  const h=rows[hi].map(c=>String(c).trim()),find=re=>h.findIndex(c=>re.test(c)),valor=COL_VALOR.map(find).find(i=>i>=0)??-1;
  let map={data:find(COL_DATA),desc:find(COL_DESC),valor,header:hi};
  if(map.valor<0&&map.data>=0){const cr=find(COL_CRED),db=find(COL_DEB);                  // colunas separadas de crédito e débito
    if(cr>=0&&db>=0)return{...map,valor:cr,cred:cr,deb:db,desc:map.desc>=0?map.desc:h.findIndex((_,i)=>![map.data,cr,db].includes(i))}}
  if(map.data<0||map.valor<0){const amostra=rows.slice(hi+1).find(r=>r.length>=2)||[];       // sem cabeçalho reconhecível: olha o conteúdo
    if(map.data<0)map.data=amostra.findIndex(c=>dataOk(parseData(c)));
    if(map.valor<0)map.valor=amostra.findIndex((c,i)=>i!==map.data&&parseValor(c)!=null&&/[.,]\d{2}\s*[dDcC]?$/.test(String(c).trim()));
    if(map.desc<0)map.desc=amostra.findIndex((c,i)=>i!==map.data&&i!==map.valor&&/[a-z]/i.test(c))}
  if(map.data<0||map.valor<0)return null;
  if(map.desc<0)map.desc=h.findIndex((_,i)=>i!==map.data&&i!==map.valor);
  return map}
/* linhas -> itens com o mapa escolhido. inverter = trocar o sinal (ex.: banco que mostra gasto positivo no extrato) */
function parseBankCsv(rows,map,{inverter=false,anoPadrao=null}={}){
  const itens=[];
  rows.slice(map.header+1).forEach(r=>{const d=parseData(r[map.data],anoPadrao);
    const v=map.cred!=null&&map.deb!=null?((parseValor(r[map.cred])||0)-Math.abs(parseValor(r[map.deb])||0))||null:parseValor(r[map.valor]);
    if(!dataOk(d)||v==null)return;
    const desc=String(r[map.desc]??'').replace(/\s+/g,' ').trim()||'(sem descrição)';if(/^saldo\b/i.test(desc))return;
    itens.push({...d,desc,valor:inverter?-v:v})});
  return itens}

/* ---- PDF de outros bancos: procura "data … descrição … valor" em cada linha ---- */
const reGen=/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+((?:R\$\s*)?-?\s?\(?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\)?(?:\s?[DC-])?)(?:\s+(?:R\$\s*)?-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?:\s?[DC])?)?$/;
function parseGenerico(lines,anoPadrao=null){
  const ano=(lines.join(' ').match(/\b(20\d{2})\b/)||[])[1],itens=[];
  for(const L of lines){const m=reGen.exec(L);if(!m)continue;const desc=m[2].replace(/\s+/g,' ').trim();
    if(/^(saldo|total|subtotal|limite|vencimento|pagamento m[ií]nimo)/i.test(desc))continue;
    const d=parseData(m[1],anoPadrao||(ano?+ano:null)),v=parseValor(m[3]);if(!dataOk(d)||v==null)continue;
    itens.push({...d,desc,valor:/[cC]$/.test(m[3].trim())?Math.abs(v):v})}
  return itens}
