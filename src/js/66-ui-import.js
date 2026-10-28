/* Importar arquivo: PDF (Itaú com leitura exata; outros bancos no modo genérico), OFX de qualquer banco,
   CSV/planilha de qualquer banco (a pessoa confirma as colunas), planilha CSV do próprio app e backup .json.
   O arquivo é lido aqui no aparelho (nada sai do navegador). Mostra o que foi encontrado, a pessoa confere e confirma.
   Se não der para ler, explica o que fazer e registra (só tipo do arquivo e banco, sem dados) para o administrador.
   Depois da importação, cada item pode virar uma categoria ou um lançamento (botões na janela de itens da categoria). */

const PdfReader={
  /* carrega o leitor de PDF só quando precisa (ele vem embutido no arquivo, mas não é executado no início) */
  async load(){
    if(window.pdfjsLib)return;const lib=el('pdflib')?.textContent,wk=el('pdfworker')?.textContent;
    if(!lib||!wk)throw new Error('Esta versão do app não tem o leitor de PDF.');
    const s=document.createElement('script');s.textContent=lib;document.head.append(s);
    pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([wk],{type:'text/javascript'}))},
  /* PDF com senha: pergunta (a senha só é usada para abrir o arquivo; não é guardada em lugar nenhum) */
  askPassword(reason){return askText('Este PDF tem senha','Senha do PDF','',{senha:true,aviso:reason===2?'Senha incorreta. Tente de novo.':''})},
  /* PDF -> linhas de texto na ordem em que o banco escreveu (cada quebra de linha do PDF vira uma linha) */
  async lines(file){
    await PdfReader.load();let doc,cancelou=false;
    try{const task=pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())});
      task.onPassword=(update,reason)=>{PdfReader.askPassword(reason).then(p=>{if(p==null){cancelou=true;task.destroy().catch(()=>{})}else update(p)})};
      doc=await task.promise}
    catch(e){throw new Error(cancelou?'Importação cancelada: o PDF precisa da senha.':'Não consegui abrir este PDF.')}
    const L=[];let buf='';
    for(let p=1;p<=doc.numPages;p++){const tc=await(await doc.getPage(p)).getTextContent();
      for(const i of tc.items){buf+=i.str;if(i.hasEOL){L.push(buf.replace(/\s+/g,' ').trim());buf=''}}
      if(buf.trim()){L.push(buf.replace(/\s+/g,' ').trim());buf=''}}
    return L.filter(Boolean)}
};
/* texto do arquivo em UTF-8 ou, se não for, no padrão antigo do Windows (muitos OFX/CSV de banco vêm assim) */
async function readTextSmart(f){
  if(!f.arrayBuffer)return f.text();
  const b=await f.arrayBuffer();try{return new TextDecoder('utf-8',{fatal:true}).decode(b)}catch{return new TextDecoder('windows-1252').decode(b)}}

const ImportDialog={
  kind:null,all:[],sel:new Set(),y:0,m:0,fatura:null,nome:'',erro:'',fonte:null,banco:null,kindFixo:true,csv:null,falha:null,
  open(){this.reset();this.y=selY;this.m=selM;this.draw();dlg3.showModal()},
  reset(){Object.assign(this,{kind:null,all:[],sel:new Set(),fatura:null,nome:'',erro:'',fonte:null,banco:null,kindFixo:true,csv:null,falha:null})},
  /* PDF já em linhas (também usado pelos testes): Itaú com leitura exata; outros bancos no modo genérico */
  setLines(lines,nome=''){const y=this.y,m=this.m;this.reset();Object.assign(this,{y,m,nome});
    const k=detectStatement(lines),banco=detectBank(lines.join(' '));
    if(k){this.fonte='itau';this.banco='Itaú';this.kind=k;
      if(k==='cartao'){this.fatura=parseFatura(lines);this.all=this.fatura.itens}else this.all=parseExtrato(lines).itens}
    else{const itens=parseGenerico(lines,this.y);
      if(itens.length<2)return this.fail('pdf',banco,'Não encontrei lançamentos (data, descrição e valor) neste PDF.',{paginasTexto:lines.length});
      const tx=normName(lines.slice(0,60).join(' '));
      Object.assign(this,{fonte:'generico',banco,kindFixo:false,all:itens,kind:/fatura|cartao de credito/.test(tx)&&!/extrato de conta|conta corrente/.test(tx)?'cartao':'conta'})}
    this.ajustaMes();this.pick();this.draw()},
  /* direto do banco (Meu Pluggy): os itens já vêm prontos; cai na mesma tela de conferência */
  setBank({kind,itens,banco,nome,fatura,y,m}){this.reset();Object.assign(this,{y,m,nome,fonte:'pluggy',banco,kind,all:itens,fatura});this.ajustaMes();this.pick();this.draw()},
  /* OFX de qualquer banco */
  setOfx(text,nome=''){const y=this.y,m=this.m;this.reset();Object.assign(this,{y,m,nome});
    const r=parseOFX(text);if(!r.itens.length)return this.fail('ofx',r.banco,'O arquivo OFX não tem lançamentos que eu consiga ler.',{tamanho:text.length});
    Object.assign(this,{fonte:'ofx',banco:r.banco,kind:r.kind,all:r.itens});this.ajustaMes();this.pick();this.draw()},
  /* CSV/planilha de banco: o app adivinha as colunas e a pessoa confirma */
  setCsv(rows,nome=''){const y=this.y,m=this.m;this.reset();Object.assign(this,{y,m,nome});
    const banco=detectBank(rows.slice(0,15).map(r=>r.join(' ')).join(' ')),map=csvGuess(rows);
    if(!map)return this.fail('csv',banco,'Não encontrei colunas de data e valor nesta planilha.',{colunas:(rows[0]||[]).length,linhas:rows.length});
    const cab=normName((rows[map.header]||[]).join(' ')+' '+nome);
    this.csv={rows,map,inverter:false};Object.assign(this,{fonte:'csv',banco,kindFixo:false,kind:/fatura|cartao|card|credit/.test(cab)?'cartao':'conta'});
    this.recalcCsv(true)},
  recalcCsv(primeira=false){const c=this.csv;this.all=parseBankCsv(c.rows,c.map,{inverter:c.inverter,anoPadrao:this.y});
    if(primeira&&this.kind==='cartao'&&this.all.length&&this.all.filter(i=>i.valor<0).length>this.all.length/2){c.inverter=true;this.all=parseBankCsv(c.rows,c.map,{inverter:true,anoPadrao:this.y})}   // fatura com compras negativas: inverte
    this.ajustaMes();this.pick();this.draw()},
  /* extrato sem nada no mês escolhido: vai para o último mês que o arquivo tem */
  ajustaMes(){if(this.kind!=='conta')return;const meses=extratoMeses(this.all.filter(i=>i.ano));if(meses.length&&!meses.includes(ym(this.y,this.m))){const t=meses[meses.length-1];this.y=Math.floor(t/12);this.m=t%12}},
  /* não conseguiu ler: mensagem amigável + registro para o administrador (só tipo de arquivo e banco) */
  fail(tipo,banco,motivo,extra={}){this.reset();this.falha={tipo,banco,motivo,info:{arquivo:tipo,banco:banco||'não identificado',motivo,...extra},avisado:false};
    ErrorLog.report('importacao',`Não leu ${tipo.toUpperCase()}${banco?' de '+banco:''}: ${motivo}`,this.falha.info).then(ok=>{if(ok&&this.falha){this.falha.avisado=true;this.draw()}});
    this.draw()},
  async avisar(){if(!this.falha)return;const ok=await ErrorLog.report('importacao',`Não leu ${this.falha.tipo.toUpperCase()}${this.falha.banco?' de '+this.falha.banco:''}: ${this.falha.motivo}`,this.falha.info,true);
    this.falha.avisado=ok||this.falha.avisado;this.draw()},
  /* itens do mês escolhido (fatura: todos; extrato: só o mês) e o que vem marcado */
  itens(){return this.kind==='conta'?extratoParaImportar(this.all,this.y,this.m):this.all},
  /* já importado (e sem novidade)? Rendimentos com valor novo contam como "atualizar", não como repetido */
  jaFoi(it,k,ja){return ja.has(k)&&!rendDiferente(it,k,this.y,this.m)},
  fora(it){return this.kind==='conta'?pareceFatura(it.desc):this.fonte!=='itau'&&pagamentoDeFatura(it.desc)},
  pick(){const its=this.itens(),ks=impKeys(this.kind,its),ja=chavesImportadas();this.sel=new Set();
    its.forEach((it,n)=>{if(!this.jaFoi(it,ks[n],ja)&&!this.fora(it))this.sel.add(n)})},
  falhaHtml(){const f=this.falha,b=f.banco;
    return`<div class="imfail"><div class="imfail-t">😕 Ainda não consigo ler este arquivo${b?` do <b>${esc(b)}</b>`:''}.</div>
      <p class="hint" style="margin:6px 0">${esc(f.motivo)}</p>
      <p class="hint" style="margin:6px 0"><b>O que você pode tentar:</b></p>
      <ol class="hint imfail-l"><li>No internet banking, procure <b>Exportar</b> e escolha <b>OFX</b> (às vezes aparece como “Money” ou “Quicken”). O OFX funciona com qualquer banco.</li>
        <li>Ou baixe em <b>CSV</b> / <b>Excel</b> (se vier .xlsx, abra no Excel e salve como CSV).</li><li>Se o banco só oferecer PDF, use esse mesmo PDF: o administrador vai ver que este banco ainda não é lido e pode incluir.</li></ol>
      ${f.avisado?'<p class="okmsg">✓ O administrador foi avisado (só o tipo do arquivo e o nome do banco; nenhum dado seu).</p>'
        :'<button type="button" class="btn sec sm" data-imrep>📨 Avisar o administrador (sem enviar seus dados)</button>'}</div>`},
  draw(){const k=this.kind,its=k?this.itens():[],ks=k?impKeys(k,its):[],ja=chavesImportadas(),cartao=k==='cartao',itau=this.fonte==='itau';
    const anos=S.anos.includes(this.y)?S.anos:[...S.anos,this.y].sort((a,b)=>a-b);
    const fmt=n=>fmtN(Math.abs(n)),cls=n=>k==='conta'?(n<0?'neg':'pos'):(n<0?'pos':''),selItens=its.filter((_,n)=>this.sel.has(n));
    const fonteTxt={itau:'PDF do Itaú',ofx:'OFX',csv:'planilha CSV',generico:'PDF (leitura genérica)',pluggy:'direto do banco (Meu Pluggy)'}[this.fonte]||'';
    let resumo='';
    if(k){const soma=selItens.reduce((s,i)=>s+i.valor,0),fa=this.fatura,somaTudo=Math.round(its.reduce((s,i)=>s+i.valor,0)*100)/100;
      resumo=cartao
        ?(this.fatura?`<p class="hint"><b>${its.length}</b> lançamentos encontrados · soma <b>R$ ${fmtN(somaTudo)}</b> · total da fatura <b>R$ ${fmtN(fa.total??0)}</b> ${fa.confere?'<span class="pos">✓ confere</span>':'<span class="warn">⚠ não bate: confira antes de importar</span>'}</p>
          <p class="hint">Entram só “compras e saques” e “internacionais” (e o repasse de IOF, que faz parte do total). Compras parceladas das próximas faturas ficam de fora.</p>`
              :`<p class="hint"><b>${its.length}</b> lançamentos · soma <b>R$ ${fmtN(somaTudo)}</b>. <b>Confira com o total da sua fatura</b> antes de importar. Pagamentos da fatura anterior vêm desmarcados.</p>`)
          +`<p class="hint">Vão para a categoria <b>${esc(CARTAO_CAT)}</b> como <b>previstos</b>; depois você marca o que foi pago.</p>`
        :`<p class="hint">Entram só as movimentações de <b>${MESES[this.m].toLowerCase()}/${this.y}</b>: <b>${its.length}</b> linha(s) (${this.all.length-extratoDoMes(this.all,this.y,this.m).length} de outros meses ficam de fora; rendimentos automáticos do saldo viram um só lançamento). <b>Entradas</b> vão para <b>${esc(MOV_CAT)}</b> em <b>Receitas</b> e <b>saídas</b> para a de <b>Despesas</b>, como realizadas; depois você leva cada uma para a categoria certa.</p>
          <p class="hint">O pagamento da fatura do cartão vem desmarcado porque o cartão já está na categoria <b>${esc(CARTAO_CAT)}</b> (marcar de novo contaria em dobro).</p>`;
      if(selItens.length!==its.length)resumo+=`<p class="hint">${its.filter((it,n)=>this.jaFoi(it,ks[n],ja)).length?`${its.filter((it,n)=>this.jaFoi(it,ks[n],ja)).length} já importado(s) antes ficam de fora. `:''}Marcados: <b>${selItens.length}</b> de ${its.length}${cartao?'':` · saldo dos marcados R$ ${fmtN(Math.round(soma*100)/100)}`}.</p>`}
    const c=this.csv,cab=c?(c.rows[c.map.header]||[]):[],colOpt=sel=>cab.map((h,i)=>`<option value="${i}" ${i===sel?'selected':''}>${esc(String(h).trim()||'Coluna '+(i+1))}</option>`).join('');
    dlg3.innerHTML=`<form id="imf" novalidate>
     <div class="dh"><div><h3>📥 Importar arquivo</h3><div class="sub">O arquivo é lido aqui no seu aparelho; nada é enviado para fora.</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">
      <label class="f">Extrato ou fatura de qualquer banco (OFX, CSV ou PDF), planilha do app ou backup (.json)<input type="file" id="imfile" accept=".pdf,.ofx,.qfx,.csv,.txt,.json,application/pdf,text/csv,application/json,application/x-ofx"></label>
      <div class="row"><label class="f">Mês em que vai entrar<select id="imm">${MESES.map((n,i)=>`<option value="${i}" ${i===this.m?'selected':''}>${n}</option>`).join('')}</select></label>
       <label class="f">Ano<select id="imy">${anos.map(a=>`<option ${a===this.y?'selected':''}>${a}</option>`).join('')}</select></label></div>
      <div class="err" id="imerr" role="alert">${esc(this.erro)}</div>
      ${this.falha?this.falhaHtml():''}
      ${k?`<div class="sub"><b>${cartao?'Fatura do cartão':'Extrato da conta'}</b>${this.banco?' · '+esc(this.banco):''}${fonteTxt?' · '+fonteTxt:''}${this.nome?' · '+esc(this.nome):''}</div>
       ${this.kindFixo?'':`<div class="row imk"><span class="sub">Este arquivo é:</span><label class="radio"><input type="radio" name="imk" value="conta" ${k==='conta'?'checked':''}> Extrato da conta</label><label class="radio"><input type="radio" name="imk" value="cartao" ${cartao?'checked':''}> Fatura do cartão</label></div>`}
       ${c?`<div class="immap"><span class="sub">Confira as colunas:</span>
          <label class="f">Data<select id="imcd">${colOpt(c.map.data)}</select></label><label class="f">Descrição<select id="imcs">${colOpt(c.map.desc)}</select></label><label class="f">Valor<select id="imcv">${colOpt(c.map.valor)}</select></label>
          <label class="radio"><input type="checkbox" id="iminv" ${c.inverter?'checked':''}> Inverter sinais (${cartao?'compras aparecem negativas no arquivo':'gastos aparecem positivos no arquivo'})</label></div>`:''}
       ${this.fonte==='generico'?'<p class="hint warn">Leitura genérica: este banco ainda não tem leitura própria. Confira cada linha antes de importar e desmarque o que não for lançamento.</p>':''}
       ${resumo}
       <div class="imlist">${its.map((it,n)=>`<label class="imrow ${this.jaFoi(it,ks[n],ja)?'ja':''}"><input type="checkbox" data-imsel="${n}" ${this.sel.has(n)?'checked':''} ${this.jaFoi(it,ks[n],ja)?'disabled':''}>
          <span class="imd">${it.dia?String(it.dia).padStart(2,'0')+'/'+String(it.mes).padStart(2,'0'):''}</span><span class="imn">${esc(it.desc)}${this.jaFoi(it,ks[n],ja)?' <i>(já importado)</i>':it.rend&&ja.has(ks[n])?' <i>(atualiza a soma já importada)</i>':this.fora(it)?' <i>(pagamento da fatura)</i>':''}</span>
          <span class="imv ${cls(it.valor)}">${it.valor<0?'-':''}${fmt(it.valor)}</span></label>`).join('')||'<p class="hint">Nada deste mês neste arquivo.</p>'}</div>`:''}
     </div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button type="button" class="btn" data-imgo ${k&&selItens.length?'':'disabled'}>Importar ${selItens.length||''} ${selItens.length===1?'item':'itens'}</button></div></form>`},
  go(){const its=this.itens().filter((_,n)=>this.sel.has(n));if(!its.length)return;
    const antes=this.kind==='cartao'?(cellOf(ensureMonthCatPeek(this.kind,this.y,this.m),this.y,this.m)?.items.filter(i=>!i.imp).length||0):0;
    const r=importStatement(this.kind,its,this.y,this.m);save();dlg3.close();
    snackbar(`${r.novos} item(ns) importado(s) em “${r.cats.map(c=>c.nome+(this.kind==='conta'?(c.tipo==='receber'?' (Receitas)':' (Despesas)'):'')).join(' e ')}” (${MESES[this.m].toLowerCase()}/${this.y})${r.atualizados?`; rendimentos atualizados`:''}${r.auto?`; ${r.auto} já foram para a categoria certa pelas suas automações`:''}${r.repetidos?`; ${r.repetidos} já existiam`:''}${antes?`. Atenção: já havia ${antes} item(ns) lançado(s) à mão nesta categoria, que continuam somando`:''}.`,null,null,14000)},
  /* abre o arquivo escolhido conforme o tipo */
  async arquivo(f,input){const nome=(f.name||'').toLowerCase();
    try{
      if(nome.endsWith('.json')){dlg3.close();return importJsonFile(f,input)}                                  // backup
      if(/\.(xlsx?|ods)$/.test(nome))return this.fail('excel',null,'Arquivo do Excel (.xls/.xlsx) não é lido direto. Abra no Excel e use “Salvar como” → CSV.',{});
      if(/\.(ofx|qfx)$/.test(nome))return this.setOfx(await readTextSmart(f),f.name);
      if(/\.(csv|txt)$/.test(nome)){const t=await readTextSmart(f);
        if(t.replace(/^﻿/,'').startsWith(CSV_HEAD)){dlg3.close();return importCsvFile(f,input)}            // planilha do próprio app
        if(/<OFX>|OFXHEADER/i.test(t))return this.setOfx(t,f.name);
        return this.setCsv(parseCsv(t.replace(/^﻿/,'')),f.name)}
      if(nome.endsWith('.pdf')||f.type==='application/pdf')return this.setLines(await PdfReader.lines(f),f.name);
      return this.fail('outro',null,'Tipo de arquivo não reconhecido. Use OFX, CSV, PDF ou o backup (.json).',{extensao:nome.split('.').pop()})}
    catch(x){if(/cancelada/.test(x.message)){this.erro=x.message;return this.draw()}
      this.fail(nome.split('.').pop()||'arquivo',null,x.message,{})}}
};
/* só para o aviso de "já havia itens à mão": a categoria do destino, sem criar nada */
function ensureMonthCatPeek(kind,y,m){const n=normName(kind==='cartao'?CARTAO_CAT:MOV_CAT);return S.cats.find(c=>c.tipo==='pagar'&&normName(c.nome)===n)?.id}

dlg3.addEventListener('change',async e=>{const t=e.target,D=ImportDialog;if(!t.closest('#imf'))return;
  if(t.id==='imfile'&&t.files[0])await D.arquivo(t.files[0],t);
  else if(t.id==='imm'||t.id==='imy'){D.m=+el('imm').value;D.y=+el('imy').value;if(D.csv)return D.recalcCsv();if(D.kind)D.pick();D.draw()}
  else if(t.name==='imk'){D.kind=t.value;if(D.csv)return D.recalcCsv();D.ajustaMes();D.pick();D.draw()}
  else if(['imcd','imcs','imcv'].includes(t.id)){D.csv.map={...D.csv.map,[{imcd:'data',imcs:'desc',imcv:'valor'}[t.id]]:+t.value};D.recalcCsv()}
  else if(t.id==='iminv'){D.csv.inverter=t.checked;D.recalcCsv()}
  else if(t.dataset.imsel!==undefined){t.checked?D.sel.add(+t.dataset.imsel):D.sel.delete(+t.dataset.imsel);D.draw()}});
dlg3.addEventListener('click',e=>{if(e.target.closest('[data-imgo]'))ImportDialog.go();else if(e.target.closest('[data-imrep]'))ImportDialog.avisar()});
dlg3.addEventListener('submit',e=>{if(e.target.id==='imf')e.preventDefault()});
