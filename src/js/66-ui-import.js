/* Importar fatura do cartão / extrato da conta (PDF do Itaú).
   O PDF é lido aqui no aparelho (nada sai do navegador). Mostra o que foi encontrado, a pessoa confere e confirma.
   Depois da importação, cada item pode virar uma categoria ou um lançamento (botões na janela de itens da categoria). */

const PdfReader={
  /* carrega o leitor de PDF só quando precisa (ele vem embutido no arquivo, mas não é executado no início) */
  async load(){
    if(window.pdfjsLib)return;const lib=el('pdflib')?.textContent,wk=el('pdfworker')?.textContent;
    if(!lib||!wk)throw new Error('Esta versão do app não tem o leitor de PDF.');
    const s=document.createElement('script');s.textContent=lib;document.head.append(s);
    pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([wk],{type:'text/javascript'}))},
  /* PDF -> linhas de texto na ordem em que o banco escreveu (cada quebra de linha do PDF vira uma linha) */
  /* PDF com senha: pergunta (a senha só é usada para abrir o arquivo; não é guardada em lugar nenhum) */
  askPassword(reason){return askText('Este PDF tem senha','Senha do PDF','',{senha:true,aviso:reason===2?'Senha incorreta. Tente de novo.':''})},
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

const ImportDialog={
  kind:null,all:[],sel:new Set(),y:0,m:0,fatura:null,nome:'',erro:'',
  open(){Object.assign(this,{kind:null,all:[],sel:new Set(),y:selY,m:selM,fatura:null,nome:'',erro:''});this.draw();dlg3.showModal()},
  /* recebe as linhas do PDF (também usado pelos testes) */
  setLines(lines,nome=''){this.nome=nome;this.erro='';const k=detectStatement(lines);
    if(!k){this.kind=null;this.all=[];this.erro='Não reconheci este arquivo como fatura de cartão nem extrato de conta do Itaú.';return this.draw()}
    this.kind=k;
    if(k==='cartao'){this.fatura=parseFatura(lines);this.all=this.fatura.itens}
    else{this.fatura=null;this.all=parseExtrato(lines).itens;
      const meses=extratoMeses(this.all);if(meses.length&&!meses.includes(ym(this.y,this.m))){const t=meses[meses.length-1];this.y=Math.floor(t/12);this.m=t%12}}   // mês sem dados no extrato: vai para o último que tem
    this.pick();this.draw()},
  /* itens do mês escolhido (fatura: todos; extrato: só o mês) e o que vem marcado */
  itens(){return this.kind==='conta'?extratoParaImportar(this.all,this.y,this.m):this.all},
  /* já importado (e sem novidade)? Rendimentos com valor novo contam como "atualizar", não como repetido */
  jaFoi(it,k,ja){return ja.has(k)&&!rendDiferente(it,k,this.y,this.m)},
  pick(){const its=this.itens(),ks=impKeys(this.kind,its),ja=chavesImportadas();this.sel=new Set();
    its.forEach((it,n)=>{if(!this.jaFoi(it,ks[n],ja)&&!(this.kind==='conta'&&pareceFatura(it.desc)))this.sel.add(n)})},
  draw(){const k=this.kind,its=this.itens(),ks=k?impKeys(k,its):[],ja=chavesImportadas(),cartao=k==='cartao';
    const anos=S.anos.includes(this.y)?S.anos:[...S.anos,this.y].sort((a,b)=>a-b);
    const fmt=n=>fmtN(Math.abs(n)),cls=n=>k==='conta'?(n<0?'neg':'pos'):(n<0?'pos':''),selItens=its.filter((_,n)=>this.sel.has(n));
    let resumo='';
    if(k){const soma=selItens.reduce((s,i)=>s+i.valor,0),fa=this.fatura;
      resumo=cartao
        ?`<p class="hint"><b>${its.length}</b> lançamentos encontrados · soma <b>R$ ${fmtN(Math.round(its.reduce((s,i)=>s+i.valor,0)*100)/100)}</b> · total da fatura <b>R$ ${fmtN(fa.total??0)}</b> ${fa.confere?'<span class="pos">✓ confere</span>':'<span class="warn">⚠ não bate: confira antes de importar</span>'}</p>
          <p class="hint">Entram só “compras e saques” e “internacionais” (e o repasse de IOF, que faz parte do total). Compras parceladas das próximas faturas ficam de fora. Vão para a categoria <b>${esc(CARTAO_CAT)}</b> como <b>previstos</b>; depois você marca o que foi pago.</p>`
        :`<p class="hint">O extrato traz dias de outros meses; aqui entram só as movimentações de <b>${MESES[this.m].toLowerCase()}/${this.y}</b>: <b>${its.length}</b> linha(s) (${this.all.length-extratoDoMes(this.all,this.y,this.m).length} de outros meses ficam de fora; os “REND PAGO APLIC AUT MAIS” viram um só lançamento com a soma). <b>Entradas</b> vão para <b>${esc(MOV_CAT)}</b> em <b>Receitas</b> e <b>saídas</b> para a de <b>Despesas</b>, como realizadas; depois você leva cada uma para a categoria certa.</p>
          <p class="hint">A linha do pagamento da fatura vem desmarcada porque o cartão já está na categoria <b>${esc(CARTAO_CAT)}</b> (marcar de novo contaria em dobro).</p>`;
      if(selItens.length!==its.length)resumo+=`<p class="hint">${its.filter((it,n)=>this.jaFoi(it,ks[n],ja)).length?`${its.filter((it,n)=>this.jaFoi(it,ks[n],ja)).length} já importado(s) antes ficam de fora. `:''}Marcados: <b>${selItens.length}</b> de ${its.length}${cartao?'':` · saldo dos marcados R$ ${fmtN(Math.round(soma*100)/100)}`}.</p>`}
    dlg3.innerHTML=`<form id="imf" novalidate>
     <div class="dh"><div><h3>📥 Importar arquivo</h3><div class="sub">O arquivo é lido aqui no seu aparelho; nada é enviado para fora.</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">
      <label class="f">Arquivo: PDF do Itaú (fatura ou extrato), planilha CSV ou backup (.json)<input type="file" id="imfile" accept=".pdf,.csv,.json,application/pdf,text/csv,application/json"></label>
      <div class="row"><label class="f">Mês em que vai entrar (para PDF)<select id="imm">${MESES.map((n,i)=>`<option value="${i}" ${i===this.m?'selected':''}>${n}</option>`).join('')}</select></label>
       <label class="f">Ano<select id="imy">${anos.map(a=>`<option ${a===this.y?'selected':''}>${a}</option>`).join('')}</select></label></div>
      <div class="err" id="imerr" role="alert">${esc(this.erro)}</div>
      ${k?`<div class="sub"><b>${cartao?'Fatura do cartão':'Extrato da conta'}</b>${this.nome?' · '+esc(this.nome):''}</div>${resumo}
       <div class="imlist">${its.map((it,n)=>`<label class="imrow ${this.jaFoi(it,ks[n],ja)?'ja':''}"><input type="checkbox" data-imsel="${n}" ${this.sel.has(n)?'checked':''} ${this.jaFoi(it,ks[n],ja)?'disabled':''}>
          <span class="imd">${it.dia?String(it.dia).padStart(2,'0')+'/'+String(it.mes).padStart(2,'0'):''}</span><span class="imn">${esc(it.desc)}${this.jaFoi(it,ks[n],ja)?' <i>(já importado)</i>':it.rend&&ja.has(ks[n])?' <i>(atualiza a soma já importada)</i>':!cartao&&pareceFatura(it.desc)?' <i>(pagamento da fatura)</i>':''}</span>
          <span class="imv ${cls(it.valor)}">${it.valor<0?'-':''}${fmt(it.valor)}</span></label>`).join('')||'<p class="hint">Nada deste mês neste arquivo.</p>'}</div>`:''}
     </div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button type="button" class="btn" data-imgo ${k&&selItens.length?'':'disabled'}>Importar ${selItens.length||''} ${selItens.length===1?'item':'itens'}</button></div></form>`},
  go(){const its=this.itens().filter((_,n)=>this.sel.has(n));if(!its.length)return;
    const antes=this.kind==='cartao'?(cellOf(ensureMonthCatPeek(this.kind,this.y,this.m),this.y,this.m)?.items.filter(i=>!i.imp).length||0):0;
    const r=importStatement(this.kind,its,this.y,this.m);save();dlg3.close();
    snackbar(`${r.novos} item(ns) importado(s) em “${r.cats.map(c=>c.nome+(this.kind==='conta'?(c.tipo==='receber'?' (Receitas)':' (Despesas)'):'')).join(' e ')}” (${MESES[this.m].toLowerCase()}/${this.y})${r.atualizados?`; rendimentos atualizados`:''}${r.repetidos?`; ${r.repetidos} já existiam`:''}${antes?`. Atenção: já havia ${antes} item(ns) lançado(s) à mão nesta categoria, que continuam somando`:''}.`,null,null,14000)}
};
/* só para o aviso de "já havia itens à mão": a categoria do destino, sem criar nada */
function ensureMonthCatPeek(kind,y,m){const n=normName(kind==='cartao'?CARTAO_CAT:MOV_CAT);return S.cats.find(c=>c.tipo==='pagar'&&normName(c.nome)===n)?.id}

dlg3.addEventListener('change',async e=>{const t=e.target;if(!t.closest('#imf'))return;
  if(t.id==='imfile'&&t.files[0]){const f=t.files[0],nome=(f.name||'').toLowerCase();
    if(nome.endsWith('.csv')){dlg3.close();return importCsvFile(f,t)}          // planilha do próprio app
    if(nome.endsWith('.json')){dlg3.close();return importJsonFile(f,t)}       // backup
    try{ImportDialog.setLines(await PdfReader.lines(f),f.name)}catch(x){ImportDialog.erro=x.message;ImportDialog.draw()}}
  else if(t.id==='imm'||t.id==='imy'){ImportDialog.m=+el('imm').value;ImportDialog.y=+el('imy').value;if(ImportDialog.kind){ImportDialog.pick()}ImportDialog.draw()}
  else if(t.dataset.imsel!==undefined){t.checked?ImportDialog.sel.add(+t.dataset.imsel):ImportDialog.sel.delete(+t.dataset.imsel);ImportDialog.draw()}});
dlg3.addEventListener('click',e=>{if(e.target.closest('[data-imgo]'))ImportDialog.go()});
dlg3.addEventListener('submit',e=>{if(e.target.id==='imf')e.preventDefault()});
