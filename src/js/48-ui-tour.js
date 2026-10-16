/* Tour guiado ("manual de primeira vez"): destaca um botão/campo por vez, escurece o resto da tela e explica.
   Abre sozinho na primeira vez que a pessoa entra em cada tela (por aparelho) e de novo pelo botão "?" do topo.
   Cada passo: sel (o que destacar; sem sel = explicação no meio da tela), t (título), x (texto). Passo cujo elemento não existe é pulado. */
const TOURS={
  mes:[
    {t:'Bem-vindo ao Meu Orçamento 👋',x:'Vou mostrar rapidinho como esta tela funciona. Dá para rever quando quiser no botão “?” lá em cima.'},
    {sel:'#app .chips',t:'Escolha o mês',x:'Toque num mês para ver as contas dele. No celular, arraste para o lado para ver os outros meses.'},
    {sel:'#app .cards .card:nth-child(3)',t:'Saldo do mês',x:'Quanto sobrou: o que entrou menos o que saiu. Só conta o que já está confirmado; o “previsto” inclui o que ainda vai acontecer.'},
    {sel:'#app .panel.pm.receber',t:'Receitas',x:'Tudo o que entra (salário, freelas…). Embaixo fica o total.'},
    {sel:'#app .panel.pm.pagar',t:'Despesas',x:'Tudo o que sai. Uma conta com o dia de hoje e ainda não paga ganha o destaque ⏰ “vence hoje”.'},
    {sel:'#app table.mes .val',t:'Lançar um valor',x:'Toque no valor (ou em “＋ Lançar”) para abrir os itens da categoria: adicionar, marcar como pago ✓ ou como “já está no cartão” 💳.'},
    {sel:'#app table.mes th[data-sort$="|dia"]',t:'Ordenar',x:'Toque nos títulos (Categoria, Dia, Valor) para ordenar. A tela abre por dia, para você acompanhar os vencimentos.'},
    {sel:'#app [data-usecat="pagar"]',t:'Incluir uma categoria no mês',x:'Digite parte do nome e escolha uma categoria que já existe. Criar, mudar e excluir categorias fica na aba Categorias.'},
    {sel:'#app [data-import]',t:'Importar',x:'Traga a fatura do cartão ou o extrato da conta (PDF do Itaú), uma planilha ou um backup. O app descobre sozinho o tipo.'},
    {sel:'[data-help]',t:'Ajuda',x:'Ficou alguma dúvida? Toque aqui em qualquer tela para ver a explicação dela de novo.'},
  ],
  ano:[
    {sel:'#app .grid',t:'O ano inteiro',x:'Cada linha é uma categoria e cada coluna um mês. Toque num valor para ver e editar os itens.'},
    {sel:'#app .seg',t:'Realizado ou previsto',x:'“Realizado” mostra só o que já foi pago/recebido. “Previsto” mostra tudo o que foi lançado.'},
    {sel:'#app tr.secr th[data-sort]',t:'Ordenar e reorganizar',x:'Toque em Dia, no nome do grupo ou em Total para ordenar. No computador, arraste uma linha para mudar a ordem dentro do grupo.'},
  ],
  graf:[
    {sel:'#per',t:'Período',x:'Escolha o período que os gráficos vão mostrar.'},
    {sel:'#app .cbox',t:'Gráficos',x:'Passe o mouse (ou toque) nas barras e linhas para ver os valores.'},
  ],
  pat:[
    {sel:'#app .panel',t:'Patrimônio',x:'Anote saldos de contas, investimentos, bens e dívidas para acompanhar quanto você tem de verdade.'},
  ],
  cat:[
    {sel:'#app [data-newcat="receber"]',t:'Criar categorias',x:'Crie aqui suas receitas e despesas. Marque “Fixa” para as que aparecem todo mês (aluguel, salário).'},
    {sel:'#cq',t:'Buscar',x:'Digite parte do nome para achar uma categoria.'},
    {sel:'#cl .cr.hd',t:'Ordenar a lista',x:'Toque nos títulos para ordenar por nome, dia, onde aparece, último uso ou quantidade de lançamentos.'},
    {sel:'#cl button.cr',t:'Editar, mesclar ou excluir',x:'Toque numa categoria para mudar nome, dia ou “fixa”. Mudanças de nome valem do mês atual em diante; os meses anteriores ficam como estavam.'},
  ],
  aj:[
    {sel:'#si',t:'Saldo inicial do ano',x:'Quanto você tinha no começo do ano. Em branco, o app continua de onde o ano anterior terminou.'},
    {sel:'#app [data-import]',t:'Importar',x:'Um botão só para tudo: PDF do Itaú, planilha CSV ou backup.'},
    {sel:'#csv',t:'Baixar',x:'Baixe uma planilha para abrir no Excel ou um backup completo para guardar.'},
  ],
  perfil:[
    {sel:'#pfn',t:'Seu cadastro',x:'Complete nome, nascimento e profissão. A foto aparece no topo.'},
    {sel:'#app .stg',t:'Onde ficam seus dados',x:'Escolha entre guardar na nuvem (aparece em qualquer aparelho) ou só neste aparelho.'},
  ],
};
const Tour={
  on:false,i:0,steps:[],tab:null,
  key:t=>`orc-tour-${user||'?'}-${t}`,
  visto(t){try{return localStorage.getItem(Tour.key(t))==='1'}catch{return true}},
  marcar(t){try{localStorage.setItem(Tour.key(t),'1')}catch{}},
  /* primeira vez nesta tela: abre sozinho (um pouco depois, para a tela terminar de aparecer) */
  auto(t){if(!user||readOnly||window.__noTour||!TOURS[t]||Tour.on||Tour.visto(t))return;
    setTimeout(()=>{if(tab===t&&!Tour.on&&!document.querySelector('dialog[open]'))Tour.start(t)},500)},
  start(t){const steps=(TOURS[t]||[]).filter(s=>!s.sel||document.querySelector(s.sel));if(!steps.length)return false;
    Object.assign(Tour,{on:true,tab:t,steps,i:0});Tour.marcar(t);tip.style.display='none';
    const o=document.createElement('div');o.id='tour';o.innerHTML=`<div class="tour-spot"></div><div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourt">
      <div class="tour-n"></div><h4 id="tourt"></h4><p class="tour-x"></p>
      <div class="tour-b"><button type="button" class="btn dan sm" data-tskip>Pular</button><span></span><button type="button" class="btn sec sm" data-tprev>Voltar</button><button type="button" class="btn sm" data-tnext>Próximo</button></div></div>`;
    document.body.append(o);document.body.classList.add('touring');Tour.show();return true},
  show(){const s=Tour.steps[Tour.i],o=el('tour');if(!o||!s)return;
    o.querySelector('.tour-n').textContent=`${Tour.i+1} de ${Tour.steps.length}`;o.querySelector('#tourt').textContent=s.t;o.querySelector('.tour-x').textContent=s.x;
    o.querySelector('[data-tprev]').hidden=Tour.i===0;o.querySelector('[data-tnext]').textContent=Tour.i===Tour.steps.length-1?'Entendi ✓':'Próximo →';
    const alvo=s.sel?document.querySelector(s.sel):null;if(alvo)alvo.scrollIntoView({block:'center',inline:'nearest'});
    Tour.place(alvo);o.querySelector('[data-tnext]').focus()},
  /* coloca o "buraco" de luz sobre o elemento e o balão embaixo (ou em cima, se não couber) */
  place(alvo){const o=el('tour');if(!o)return;const spot=o.querySelector('.tour-spot'),box=o.querySelector('.tour-tip'),W=innerWidth,H=innerHeight,pad=6;
    if(!alvo){spot.style.cssText='left:50%;top:50%;width:0;height:0';box.style.cssText=`left:${Math.max(12,(W-Math.min(360,W-24))/2)}px;top:${Math.max(12,H/2-110)}px`;return}
    const r=alvo.getBoundingClientRect(),x=Math.max(4,r.left-pad),y=Math.max(4,r.top-pad),w=Math.min(W-8,r.width+pad*2),h=Math.min(H-8,r.height+pad*2);
    spot.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const bw=Math.min(360,W-24),bh=box.offsetHeight||170,left=Math.min(Math.max(12,x+w/2-bw/2),W-bw-12);
    let top=y+h+12;if(top+bh>H-12)top=y-bh-12;if(top<12)top=Math.min(H-bh-12,Math.max(12,y+h/2-bh/2));
    box.style.cssText=`left:${left}px;top:${top}px;width:${bw}px`},
  next(){if(Tour.i<Tour.steps.length-1){Tour.i++;Tour.show()}else Tour.end()},
  prev(){if(Tour.i>0){Tour.i--;Tour.show()}},
  end(){el('tour')?.remove();document.body.classList.remove('touring');Tour.on=false},
};
document.addEventListener('click',e=>{if(!Tour.on||!e.target.closest('#tour'))return;e.preventDefault();e.stopPropagation();
  if(e.target.closest('[data-tnext]'))Tour.next();else if(e.target.closest('[data-tprev]'))Tour.prev();else if(e.target.closest('[data-tskip]'))Tour.end()},true);
document.addEventListener('keydown',e=>{if(!Tour.on)return;
  if(e.key==='Escape')Tour.end();else if(e.key==='ArrowRight')Tour.next();else if(e.key==='ArrowLeft')Tour.prev()});
addEventListener('resize',()=>{if(Tour.on){const s=Tour.steps[Tour.i];Tour.place(s.sel?document.querySelector(s.sel):null)}});
addEventListener('scroll',()=>{if(Tour.on){const s=Tour.steps[Tour.i];Tour.place(s.sel?document.querySelector(s.sel):null)}},{passive:true});
