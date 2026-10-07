/* Arquivo CSV (abre no Excel): o "arquivo local" do usuário.
   Um único arquivo com:
     1) RESUMO de cada ano, no desenho da tela Ano (só leitura humana: o app ignora ao carregar);
     2) as seções que o app lê para carregar TUDO sem perder nada: CATEGORIAS, DETALHE (um item por linha),
        SALDOS INICIAIS, ANOS e PATRIMONIO.
   Separador ";" e vírgula decimal (padrão brasileiro do Excel), UTF-8 com BOM, linhas CRLF. */
const CSV_VERSION=1;
const CSV_HEAD='Meu Orçamento';
const csvNum=n=>(+n).toFixed(2).replace('.',',');
const ymTxt=a=>a?`${a[0]}-${String(a[1]+1).padStart(2,'0')}`:'';
const ymPar=t=>{const m=/^(\d{4})-(\d{1,2})$/.exec((t||'').trim());return m?[+m[1],+m[2]-1]:null};
/* texto que começaria com = + - @ seria lido como fórmula pelo Excel: guarda um apóstrofo na frente (e tira ao ler) */
const csvTxt=t=>/^'*[=+\-@\t\r]/.test(t)?"'"+t:t;
const csvUntxt=t=>/^'+[=+\-@\t\r]/.test(t)?t.slice(1):t;
const csvCell=v=>{const t=String(v??'');return /[;"\n\r]|^\s|\s$/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
const csvLine=a=>a.map(csvCell).join(';');

/* gera o texto do CSV (sem BOM). Usa o estado s sem alterá-lo; atualizadoEm = data/hora ISO */
function stateToCsv(s,atualizadoEm=new Date().toISOString()){
  const prev=S;S=s;
  try{
    const L=[],num=csvNum;
    L.push([CSV_HEAD,'versão',CSV_VERSION,'atualizado em',atualizadoEm]);
    // ---- resumo por ano (como a tela Ano, valores realizados; a pagar em negativo) ----
    for(const y of s.anos){
      const st=catStats(),rows=t=>cats(t).filter(c=>yearHas(c,y));
      if(!rows('receber').length&&!rows('pagar').length)continue;
      L.push([],['RESUMO',y,'valores realizados (pagos/recebidos); a pagar em negativo'],['Categoria',...MC,'Total']);
      const bloco=(t,rot,sinal)=>{L.push([rot]);
        for(const c of rows(t)){const v=MC.map((_,m)=>sinal*V(c.id,y,m,'real'));L.push([csvTxt(c.nome),...v.map(num),num(v.reduce((a,b)=>a+b,0))])}
        const tot=MC.map((_,m)=>sinal*MT(t,y,m,'real'));L.push([t==='receber'?'Total a receber':'Total a pagar',...tot.map(num),num(tot.reduce((a,b)=>a+b,0))])};
      bloco('receber','A RECEBER',1);bloco('pagar','A PAGAR',-1);
      const sal=MC.map((_,m)=>SAL(y,m,'real'));
      L.push(['Saldo do mês',...sal.map(num),num(sal.reduce((a,b)=>a+b,0))],['Acumulado',...MC.map((_,m)=>num(acum(y,m,'real'))),'']);
    }
    // ---- seções que o app lê ao carregar ----
    L.push([],['CATEGORIAS'],['Id','Tipo','Nome','Dia','VigenciaDe','VigenciaAte','Encerrada','Anterior']);
    for(const c of s.cats)L.push([c.id,c.tipo,csvTxt(c.nome),c.dia??'',ymTxt(c.vis?.from),ymTxt(c.vis?.to),ymTxt(c.until),c.prevId||'']);
    L.push([],['DETALHE'],['Ano','Mes','Id','Tipo','Categoria','Descricao','Valor','Situacao']);
    const keys=Object.keys(s.data).filter(k=>s.data[k].items.length).sort((a,b)=>{const x=parseKey(a),y2=parseKey(b);return x.y-y2.y||x.m-y2.m||0});
    for(const k of keys){const{c,y,m}=parseKey(k),cat=s.cats.find(x=>x.id===c);if(!cat)continue;
      for(const i of s.data[k].items)L.push([y,m+1,c,cat.tipo,csvTxt(cat.nome),csvTxt(i.d||''),num(i.v),i.info?'cartao':i.ok?'realizado':'previsto'])}
    L.push([],['SALDOS INICIAIS'],['Ano','Valor']);
    for(const[y,v]of Object.entries(s.saldoIni))L.push([y,num(v)]);
    L.push([],['ANOS'],['Ano']);for(const y of s.anos)L.push([y]);
    L.push([],['PATRIMONIO'],['Grupo','Nome','Valor']);
    for(const g of['saldos','dividas','bens'])for(const i of s[g]||[])L.push([g,csvTxt(i.nome||''),num(i.valor||0)]);
    return L.map(csvLine).join('\r\n')+'\r\n'
  }finally{S=prev}}
const csvFileText=(s,at)=>'﻿'+stateToCsv(s,at);

/* ---- leitura ---- */
function parseCsv(text){
  const first=text.split(/\r?\n/,1)[0],sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
    else if(ch==='"')q=true;
    else if(ch===sep){row.push(cur);cur=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}
    else cur+=ch}
  if(cur!==''||row.length){row.push(cur);rows.push(row)}
  return rows}
const csvBlank=r=>!r.length||r.every(c=>String(c).trim()==='');

/* lê o texto do CSV e devolve {state, atualizadoEm}. Falha com mensagem clara se não for um arquivo do Meu Orçamento */
function csvToState(text){
  const rows=parseCsv(text.replace(/^﻿/,''));
  const head=rows[0]||[];
  if(String(head[0]||'').trim()!==CSV_HEAD)throw new Error('Este arquivo não parece ser do Meu Orçamento (a primeira linha deveria começar com “Meu Orçamento”).');
  const atualizadoEm=head[4]||'';
  const st={anos:[],saldoIni:{},saldos:[],dividas:[],bens:[],data:{},cats:[]};
  const SEC=['RESUMO','CATEGORIAS','DETALHE','SALDOS INICIAIS','ANOS','PATRIMONIO'];
  let sec=null,skipHeader=false;const anos=new Set();
  for(const r of rows.slice(1)){
    if(csvBlank(r)){sec=null;continue}
    const a=String(r[0]).trim();
    if(sec===null&&SEC.includes(a.toUpperCase())){sec=a.toUpperCase();skipHeader=true;continue}
    if(skipHeader){skipHeader=false;continue}
    if(sec==='CATEGORIAS'){const[id,tipo,nome,dia,de,ate,enc,ant]=r;if(!id||!nome)continue;
      const c={id:id.trim(),tipo:tipo.trim()==='pagar'?'pagar':'receber',nome:csvUntxt(nome),dia:dia===''||dia==null?null:+dia};
      const f=ymPar(de);if(f)c.vis={from:f,to:ymPar(ate)};const u=ymPar(enc);if(u)c.until=u;if(ant)c.prevId=ant.trim();st.cats.push(c)}
    else if(sec==='DETALHE'){const[ano,mes,id,,,desc,valor,sit]=r;const y=+ano,m=+mes-1;if(!id||!(y>0)||!(m>=0&&m<12))continue;
      const k=`${id.trim()}|${y}|${m}`;const item={v:parseV(valor),d:csvUntxt(desc||''),ok:sit!=='previsto'};if(sit==='cartao')item.info=true;
      (st.data[k]??={items:[]}).items.push(item);anos.add(y)}
    else if(sec==='SALDOS INICIAIS'){const y=+r[0];if(y>0)st.saldoIni[y]=parseV(r[1])}
    else if(sec==='ANOS'){const y=+r[0];if(y>0)anos.add(y)}
    else if(sec==='PATRIMONIO'){const[g,nome,valor]=r;if(['saldos','dividas','bens'].includes(g))st[g].push({nome:csvUntxt(nome||''),valor:parseV(valor)})}
  }
  if(!st.cats.length&&!Object.keys(st.data).length)throw new Error('Não encontrei categorias nem lançamentos neste arquivo.');
  st.anos=[...anos].sort((x,y)=>x-y);if(!st.anos.length)st.anos=[new Date().getFullYear()];
  // lançamentos que apontam para categoria inexistente seriam invisíveis: descarta
  const ids=new Set(st.cats.map(c=>c.id));for(const k of Object.keys(st.data))if(!ids.has(k.split('|')[0]))delete st.data[k];
  return{state:mig(st),atualizadoEm}}
