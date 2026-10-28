/* Lançamentos e Automações.
   "Lançamentos" = todos os itens do mês numa lista só (de qualquer categoria), em ordem de dia.
   "Automação" = regra "quando o texto tiver X, vai para a categoria Y". Vale para os lançamentos que chegarem da importação
   (ou do banco) e para os que já estão "sem categoria". Sem tela: só dados (por isso é testável). */

const autos=()=>S.autos??=[];
/* texto de comparação: sem acento, sem data (dd/mm), sem número de parcela e sem símbolos */
const autoTxt=s=>normName(String(s||'')).replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g,' ').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();
const AUTO_MIN=3;                                           // menos que isso casaria com quase tudo
/* cria (ou troca o destino de) uma automação. nome = categoria de destino (acha pelo nome, sem acento/maiúscula) */
function addAuto(txt,tipo,nome){
  const t=autoTxt(txt);if(t.length<AUTO_MIN)throw new Error('Escreva pelo menos 3 letras do texto que se repete (ex.: o nome do estabelecimento).');
  if(!nome)throw new Error('Escolha a categoria.');
  const ex=autos().find(a=>a.txt===t&&a.tipo===tipo);if(ex){ex.nome=nome;return ex}
  const a={id:'a'+Math.random().toString(36).slice(2,8),txt:t,tipo,nome};autos().push(a);return a}
const delAuto=id=>{S.autos=autos().filter(a=>a.id!==id)};
/* qual automação serve para esta descrição (a de texto mais longo ganha, por ser mais específica) */
function autoFor(desc,tipo){const d=autoTxt(desc);if(!d)return null;
  return autos().filter(a=>a.tipo===tipo&&d.includes(a.txt)).sort((a,b)=>b.txt.length-a.txt.length)[0]||null}

/* ---- lista de lançamentos do mês ---- */
const diaDoItem=(i,c)=>{const x=/^(\d{2})\/\d{2}\b/.exec(i.d||'');return x?+x[1]:(c.dia||0)};
/* está "sem categoria"? = ainda na Movimentação da conta, ou item do cartão que ainda não foi levado para uma categoria */
function semCategoria(c,i){if(!i.imp||i.info||i.lock)return false;
  if(i.imp.startsWith('cartao|'))return !cardLinks(i).length;
  return normName(c.nome)===normName(MOV_CAT)}
/* categoria "de verdade" do lançamento (para o item do cartão levado a outra categoria, é o destino) */
function categoriaDe(c,i){if(i.imp&&i.imp.startsWith('cartao|')){const l=cardLinks(i)[0];if(l){const d=catById(parseKey(l.key).c);if(d)return d}}return c}
/* {cid,idx,c,cat,it,dia,sem,tipo,v} — v com sinal: entrada +, saída − (itens "só informativos" não entram: já estão no cartão) */
function lancamentos(y,m){const out=[];
  for(const c of S.cats){const cell=cellOf(c.id,y,m);if(!cell)continue;
    cell.items.forEach((it,idx)=>{if(it.info||it.lock)return;
      const sem=semCategoria(c,it),cat=categoriaDe(c,it);
      out.push({cid:c.id,idx,c,cat,it,dia:diaDoItem(it,c),sem,tipo:c.tipo,v:c.tipo==='receber'?it.v:-it.v})})}
  return out.sort((a,b)=>(a.dia||99)-(b.dia||99)||a.c.nome.localeCompare(b.c.nome))}
/* texto do item sem a data do começo (para mostrar) */
const descLimpa=i=>String(i.d||'').replace(/^\d{2}\/\d{2}\s+/,'').trim()||'(sem descrição)';

/* ---- mudar a categoria de um lançamento (qualquer tipo de item) ----
   dest: id de categoria ou {nome,tipo} para criar. Devolve a categoria de destino. */
function moveLancamento(cid,y,m,idx,dest){
  const cell=cellOf(cid,y,m),it=cell?.items[idx],origem=catById(cid);if(!it)throw new Error('Lançamento não encontrado.');
  if(it.imp&&it.imp.startsWith('cartao|')){
    if(cardLinks(it).length)unlinkCardItem(it);
    let c=typeof dest==='string'?catById(dest):null;
    if(dest&&dest.nome)c=createCat('pagar',{nome:dest.nome,dia:''},'lib',y,m);
    if(!c)throw new Error('Escolha uma categoria.');
    if(c.id===cid)return c;                                  // voltou para o próprio cartão: só desfez o vínculo
    return cardItemToExisting(cid,y,m,idx,c.id)}
  if(it.imp)return contaItemMove(cid,y,m,idx,dest);
  // lançamento digitado à mão: simplesmente muda de categoria
  let c=typeof dest==='string'?catById(dest):null;
  if(dest&&dest.nome)c=createCat(dest.tipo||origem.tipo,{nome:dest.nome,dia:''},'lib',y,m);
  if(!c)throw new Error('Escolha uma categoria.');if(c.id===cid)return c;
  useCatInMonth(c.id,y,m);cell.items.splice(idx,1);ens(c.id,y,m).items.push(it);return c}

/* aplica as automações aos lançamentos "sem categoria" (de todos os meses). Devolve quantos mudaram. */
function aplicarAutomacoes(){let n=0;
  const meses=[...new Set(Object.keys(S.data).map(k=>{const p=parseKey(k);return p.y+'|'+p.m}))];
  for(const ym of meses){const[y,m]=ym.split('|').map(Number);
    // dentro de cada categoria, do último item para o primeiro: mover um item muda os índices dos que vêm depois
    for(const l of lancamentos(y,m).filter(x=>x.sem).sort((a,b)=>a.cid<b.cid?-1:a.cid>b.cid?1:b.idx-a.idx)){
      const a=autoFor(l.it.d,l.tipo);                          // na Movimentação, o tipo da categoria já é entrada/saída; cartão é sempre despesa
      if(!a)continue;
      try{const d=ensureMonthCat(a.tipo,a.nome,y,m).cat;moveLancamento(l.cid,y,m,l.idx,d.id);n++}catch{}}}
  return n}

/* ---- ícone e cor da categoria (enfeite: ajuda a achar a linha de relance) ---- */
const ICONES=['🛒','🍽️','🏠','💡','🚗','⛽','🚌','💊','🩺','🎓','🎮','🎬','✈️','👕','🐶','🎁','📱','🌐','💳','💰','🧾','🏦','📈','🔧','☕','🍺','💇','🏋️','👶','❤️'];
const CORES=['#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#94a3b8'];
const ICONE_POR_PALAVRA=[[/mercado|supermerc|feira|padaria|acougue|hortifruti/,'🛒'],[/restaurante|lanche|ifood|delivery|refei/,'🍽️'],[/alug|moradia|condom|casa|financiamento/,'🏠'],[/luz|energia|agua|gas|conta/,'💡'],
  [/carro|veicul|ipva|seguro auto/,'🚗'],[/combust|gasolina|posto/,'⛽'],[/transporte|onibus|metro|uber|taxi|passagem/,'🚌'],[/farmac|remedio|saude|plano de saude|medic|dentista/,'💊'],
  [/escola|curso|faculdade|educa|mensalidade/,'🎓'],[/lazer|cinema|streaming|netflix|spotify|jogo|viagem/,'🎬'],[/internet|vivo|claro|tim\b|celular|telefone/,'🌐'],[/cartao|fatura|itau/,'💳'],
  [/salario|pagamento|renda|receita/,'💰'],[/rendimento|investimento|poupanca|aplicacao/,'📈'],[/pet|veterin|racao/,'🐶'],[/roupa|vestuario|calcado/,'👕'],[/presente|doacao/,'🎁'],[/academia|esporte/,'🏋️']];
const catIco=c=>c.ico||(ICONE_POR_PALAVRA.find(([r])=>r.test(normName(c.nome)))||[])[1]||'';
/* a "bolinha" da categoria: ícone sobre a cor escolhida (sem escolha: a cor do tipo e o ícone sugerido pelo nome) */
const catBadge=c=>{const i=catIco(c);return `<span class="cico ${c.cor?'':c.tipo}" ${c.cor?`style="background:${c.cor}"`:''}>${i||'<i></i>'}</span>`};
