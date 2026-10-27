/* "Buscar do banco": traz extrato e fatura direto do banco (Open Finance via Meu Pluggy), pelo "porteiro" no Cloudflare.
   Só o dono do app usa (o porteiro confere o login). Os dados caem na MESMA tela de conferência da importação de arquivo. */
const BankSync={
  urlKey:'orc-bank-url',
  url(){try{return localStorage.getItem(this.urlKey)||''}catch{return''}},
  setUrl(u){try{localStorage.setItem(this.urlKey,u.trim())}catch{}},
  /* pede ao porteiro os lançamentos do período (aaaa-mm-dd) */
  async buscar(de,ate){
    const url=this.url();if(!/^https:\/\//.test(url))throw new Error('Cole o endereço do porteiro (começa com https://).');
    const u=backend.auth?.currentUser;if(!u?.getIdToken)throw new Error('Entre com a sua conta para usar esta função.');
    let r;try{r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await u.getIdToken()},body:JSON.stringify({de,ate})})}
    catch{throw new Error('Não consegui falar com o porteiro. Confira o endereço e a internet.')}
    let j=null;try{j=await r.json()}catch{}
    if(!r.ok||!j?.ok)throw new Error(j?.erro||`O porteiro respondeu com erro (${r.status}).`);
    return j}
};
const isoDia=d=>d.toISOString().slice(0,10);

const BankDialog={
  dados:null,conta:null,mes:0,ano:0,erro:'',carregando:false,meses:6,
  open(){this.dados=null;this.conta=null;this.erro='';this.mes=selM;this.ano=selY;this.draw();dlg3.showModal()},
  async carregar(){this.erro='';this.carregando=true;this.draw();
    try{const ate=new Date(),de=new Date(Date.now()-this.meses*30.5*864e5);this.dados=await BankSync.buscar(isoDia(de),isoDia(ate));
      const cs=this.dados.contas||[];this.conta=(cs.find(c=>!contaCartao(c))||cs[0]||{}).id||null;
      if(!cs.length)this.erro='O banco não devolveu nenhuma conta. Atualize a conexão no Meu Pluggy e tente de novo.'}
    catch(e){this.erro=e.message;ErrorLog.report('banco',e.message,{etapa:'buscar'})}
    this.carregando=false;this.draw()},
  cc(){return(this.dados?.contas||[]).find(c=>c.id===this.conta)},
  draw(){const d=this.dados,c=d?this.cc():null,cartao=contaCartao(c),fs=cartao?faturasOrdenadas(d.faturas?.[c.id]):[];
    const anos=S.anos.includes(this.ano)?S.anos:[...S.anos,this.ano].sort((a,b)=>a-b);
    dlg3.innerHTML=`<form id="bkf" novalidate>
     <div class="dh"><div><h3>🏦 Buscar do banco</h3><div class="sub">Open Finance via Meu Pluggy · somente leitura</div></div><button type="button" class="btn sec" data-cclose>Fechar</button></div>
     <div class="db">
      <label class="f">Endereço do porteiro (Cloudflare)<input id="bkurl" value="${esc(BankSync.url())}" placeholder="https://orcamento-banco.seunome.workers.dev" autocomplete="off"></label>
      <div class="row"><label class="f">Trazer os últimos<select id="bkmeses">${[3,6,12].map(n=>`<option value="${n}" ${n===this.meses?'selected':''}>${n} meses</option>`).join('')}</select></label>
       <button type="button" class="btn sec" data-bkload ${this.carregando?'disabled':''}>${this.carregando?'Buscando…':d?'Buscar de novo':'Conectar e listar contas'}</button></div>
      <div class="err" id="bkerr" role="alert">${esc(this.erro)}</div>
      ${d&&d.contas?.length?`<div class="bkaccs">${d.contas.map(x=>`<label class="radio"><input type="radio" name="bkc" value="${esc(x.id)}" ${x.id===this.conta?'checked':''}> <span><b>${esc(nomeConta(x))}</b> <span class="sub">${contaCartao(x)?'cartão de crédito':'conta corrente'} · saldo R$ ${fmtN(x.balance??0)}</span></span></label>`).join('')}</div>
       ${cartao?(fs.length?`<label class="f">Qual fatura?<select id="bkbill">${fs.map(f=>`<option value="${esc(f.id)}">${esc(rotuloFatura(f))}</option>`).join('')}</select></label>
          <p class="hint">A fatura traz os lançamentos que o banco ligou a ela; o app confere a soma com o total da fatura.</p>`
          :'<p class="hint">Nenhuma fatura encontrada para este cartão.</p>')
         :`<div class="row"><label class="f">Mês do extrato<select id="bkm">${MESES.map((n,i)=>`<option value="${i}" ${i===this.mes?'selected':''}>${n}</option>`).join('')}</select></label>
          <label class="f">Ano<select id="bky">${anos.map(a=>`<option ${a===this.ano?'selected':''}>${a}</option>`).join('')}</select></label></div>`}`:''}
     </div>
     <div class="df"><button type="button" class="btn dan" data-cclose>Cancelar</button><button type="button" class="btn" data-bkgo ${d&&c&&(!cartao||fs.length)?'':'disabled'}>Ver lançamentos para conferir</button></div></form>`},
  ver(){const d=this.dados,c=this.cc();if(!d||!c)return;const trans=d.lancamentos?.[c.id]||[],cartao=contaCartao(c),itens=pluggyItens(trans,cartao);
    if(cartao){const f=faturasOrdenadas(d.faturas?.[c.id]).find(x=>x.id===(el('bkbill')?.value||''));if(!f)return;
      const r=itensDaFatura(itens,f);
      if(!r.itens.length){this.erro='O banco não ligou nenhum lançamento a esta fatura ainda.';return this.draw()}
      ImportDialog.setBank({kind:'cartao',itens:r.itens,banco:'Itaú',nome:`${nomeConta(c)} · fatura ${rotuloFatura(f)}`,fatura:{total:r.total,confere:r.confere},y:selY,m:selM})}
    else ImportDialog.setBank({kind:'conta',itens,banco:'Itaú',nome:nomeConta(c),fatura:null,y:this.ano,m:this.mes})}
};
dlg3.addEventListener('change',e=>{const t=e.target;if(!t.closest('#bkf'))return;
  if(t.id==='bkurl')BankSync.setUrl(t.value);
  else if(t.id==='bkmeses')BankDialog.meses=+t.value;
  else if(t.name==='bkc'){BankDialog.conta=t.value;BankDialog.draw()}
  else if(t.id==='bkm')BankDialog.mes=+t.value;else if(t.id==='bky')BankDialog.ano=+t.value});
dlg3.addEventListener('click',e=>{if(!e.target.closest('#bkf'))return;
  if(e.target.closest('[data-bkload]')){BankSync.setUrl(el('bkurl').value);BankDialog.carregar()}
  else if(e.target.closest('[data-bkgo]'))BankDialog.ver()});
dlg3.addEventListener('submit',e=>{if(e.target.id==='bkf')e.preventDefault()});
