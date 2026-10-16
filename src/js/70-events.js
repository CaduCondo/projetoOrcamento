/* Eventos da tela: um ouvinte por tipo de evento, que reconhece o botão/campo pelos atributos data-* */

/* ---- ações usadas pelos eventos ---- */
const hideTip=()=>{tip.style.display='none'};
function addYear(){const def=Math.max(...S.anos)+1,v=parseInt(prompt('Qual ano deseja adicionar?',def));
  if(v>=1990&&v<=2100){if(!S.anos.includes(v)){S.anos.push(v);S.anos.sort((a,b)=>a-b);save()}selY=v;selM=0;render()}}
function confirmDeleteCat(id){const c=catById(id),nl=catStats()[id]?.n||0;
  if(confirm(nl?`Excluir “${c.nome}” e os ${nl} lançamentos dela (em todos os anos)? Para juntar com outra categoria, use Mesclar.`:`Excluir “${c.nome}”?`)){deleteCat(id);save();render()}}
function exportBackup(){download(`orcamento-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S,null,1),'application/json')}
function exportCsv(){download(`meu-orcamento-${new Date().toISOString().slice(0,10)}.csv`,csvFileText(S),'text/csv;charset=utf-8')}
/* carrega um CSV do Meu Orçamento: substitui tudo ou junta os anos do arquivo */
async function importCsvFile(file,input){
  try{const{state}=csvToState(await file.text());
    const ch=await askChoice({titulo:'Carregar este arquivo',texto:`<p>O arquivo tem lançamentos de <b>${state.anos.join(', ')}</b>.</p>`,
      opcoes:[{id:'substituir',label:'Substituir todos os meus dados pelos do arquivo',cls:''},{id:'juntar',label:'Juntar: os anos do arquivo substituem os mesmos anos daqui',cls:'sec'},{id:'',label:'Cancelar',cls:'dan'}]});
    if(ch==='substituir'){S=state;initSelection();if(backend.store instanceof DeviceStore)backend.store.fileSynced=true;save();render();snackbar('Arquivo carregado.')}
    else if(ch==='juntar'){applyImport({anos:state.anos,saldoIni:state.saldoIni,cats:state.cats,data:state.data});save();render();snackbar('Anos do arquivo juntados aos seus dados.')}
  }catch(e){alert(e.message)}finally{input.value=''}}
function mergeImport(o){const clash=importClashYears(o);
  if(clash.length&&!confirm(`Os anos ${clash.join(', ')} já têm lançamentos e serão SUBSTITUÍDOS pelos do arquivo. Continuar?`))return;
  applyImport(o);save();render();alert(`Importado: anos ${o.anos.join(', ')}.`)}
/* backup (.json) ou arquivo de anos anteriores: substituir tudo ou juntar os anos do arquivo */
async function importJsonFile(file,input){
  try{let o;try{o=JSON.parse(await file.text())}catch{o=null}
    if(!o||!o.cats||!o.data)return alert('Este arquivo .json não é um backup do Meu Orçamento.');
    const anos=o.anos||[...new Set(Object.keys(o.data).map(k=>parseKey(k).y))].sort(),clash=importClashYears({...o,anos});
    const ch=await askChoice({titulo:'Carregar este backup',texto:`<p>O arquivo tem dados de <b>${anos.join(', ')||'—'}</b>.</p>${clash.length?`<p class="hint">Se juntar: ${clash.join(', ')} já têm lançamentos aqui e serão substituídos pelos do arquivo.</p>`:''}`,
      opcoes:[{id:'substituir',label:'Substituir todos os meus dados pelos do arquivo',cls:''},{id:'juntar',label:'Juntar: os anos do arquivo substituem os mesmos anos daqui',cls:'sec'},{id:'',label:'Cancelar',cls:'dan'}]});
    if(ch==='substituir'){S=mig(o);initSelection();if(backend.store instanceof DeviceStore)backend.store.fileSynced=true;save();render();snackbar('Backup carregado.')}
    else if(ch==='juntar'){applyImport({anos,saldoIni:o.saldoIni||{},cats:o.cats,data:o.data});save();render();snackbar('Anos do arquivo juntados aos seus dados.')}
  }finally{if(input)input.value=''}}

/* ---- menu e cabeçalho ---- */
document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}});
document.getElementById('hr').addEventListener('click',e=>{
  const tb=e.target.closest('[data-tab]');if(tb){tab=tb.dataset.tab;render();return}
  if(e.target.closest('[data-help]')){Tour.end();Tour.start(tab)}
  else if(e.target.closest('[data-logout]'))logout();
  else if(e.target.closest('[data-addyear]'))addYear()});
document.getElementById('hr').addEventListener('change',e=>{if(e.target.id==='ysel'){selY=+e.target.value;render()}});

/* ---- busca de categorias (Ajustes) e escolha no combobox ---- */
document.addEventListener('input',e=>{if(e.target.id==='cq'){catUI.q=e.target.value;catUI.lim=40;renderCatList()}});
document.addEventListener('cbpick',e=>{const{id,cid}=e.detail;
  if(id==='cs'){catSel=cid;render()}
  else if(id==='mg')MergeDialog.picked(cid)});

/* ---- arrastar linhas da tela Mês para reordenar ---- */
let dragId=null;
const dragRow=e=>e.target.closest?.('tr[data-cat]');
app.addEventListener('dragstart',e=>{const r=dragRow(e);if(!r)return;dragId=r.dataset.cat;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);r.classList.add('dragging');hideTip()});
app.addEventListener('dragover',e=>{const r=dragRow(e);if(!r||!dragId)return;
  if(catById(dragId).tipo!==r.dataset.tipo)return;e.preventDefault();app.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));r.classList.add('over')});
app.addEventListener('drop',e=>{const r=dragRow(e);if(!r||!dragId||r.dataset.cat===dragId)return;e.preventDefault();
  /* arrastar numa tabela ordenada: a ordem que está na tela vira a ordem manual e a linha muda de lugar dentro do seu grupo */
  const tipo=catById(dragId).tipo,ids=[...r.closest('table').querySelectorAll(`tr[data-cat][data-tipo="${tipo}"]`)].map(x=>x.dataset.cat);
  const fi=ids.indexOf(dragId),ti=ids.indexOf(r.dataset.cat);ids.splice(fi,1);ids.splice(ti,0,dragId);      // para baixo cai depois da linha alvo; para cima, antes
  applyOrder(tipo,ids);mesSort[tipo].col='manual';mesSort[tipo].dir=1;dragId=null;save();render()});
app.addEventListener('dragend',()=>{dragId=null;app.querySelectorAll('.dragging,.over').forEach(x=>x.classList.remove('dragging','over'))});

/* ---- cliques ---- */
app.addEventListener('click',e=>{const t=e.target;let b;
  if(b=t.closest('[data-lm]')){loginMode=b.dataset.lm;render()}
  else if(b=t.closest('[data-modo]')){modo=b.dataset.modo;render()}
  else if(b=t.closest('[data-m]')){selM=+b.dataset.m;render()}
  else if(b=t.closest('[data-open]')){const{c,y,m}=parseKey(b.dataset.open);hideTip();openCell(c,y,m)}
  else if(b=t.closest('[data-la]')){S[b.dataset.la].push({nome:'Novo item',valor:0});save();render()}
  else if(b=t.closest('[data-ld]')){const[k,i]=b.dataset.ld.split('|');S[k].splice(+i,1);save();render()}
  else if(b=t.closest('[data-cf]')){const[k,v]=b.dataset.cf.split('|');catUI[k]=v;catUI.lim=40;render()}
  else if(t.closest('[data-cmore]')){catUI.lim+=40;renderCatList()}
  else if(b=t.closest('[data-cmerge]'))MergeDialog.open(b.dataset.cmerge)
  else if(b=t.closest('[data-newcat]'))CategoryDialog.openNew(b.dataset.newcat)
  else if(b=t.closest('[data-csort]')){const col=b.dataset.csort;
    if(catUI.col!==col){catUI.col=col;catUI.dir=col==='uso'||col==='n'?-1:1}else if(catUI.dir===(col==='uso'||col==='n'?-1:1))catUI.dir=-catUI.dir;else{catUI.col='uso';catUI.dir=-1}
    renderCatList()}
  else if(b=t.closest('[data-sort]')){const[tp,col]=b.dataset.sort.split('|'),o=mesSort[tp];
    if(o.col!==col){o.col=col;o.dir=1}else if(o.dir===1)o.dir=-1;else{o.col='manual';o.dir=1}render()}
  else if(t.closest('[data-import]'))ImportDialog.open()
  else if(b=t.closest('[data-errdel]')){backend.deleteError(b.dataset.errdel).then(fillErrors).catch(e=>alert(e.message))}
  else if(t.closest('[data-errclear]')){if(confirm('Apagar todos os registros de erro?'))backend.listErrors().then(l=>Promise.all(l.map(e=>backend.deleteError(e.id)))).then(fillErrors).catch(e=>alert(e.message))}
  else if(b=t.closest('[data-usecat]'))UseCategoryDialog.open(b.dataset.usecat)
  else if(b=t.closest('[data-cedit]'))CategoryDialog.openEdit(b.dataset.cedit)
  else if(b=t.closest('[data-cdel]'))confirmDeleteCat(b.dataset.cdel)
  else if(t.id==='bk')exportBackup()
  else if(t.id==='csv')exportCsv()});

/* ---- formulários ---- */
app.addEventListener('submit',e=>{e.preventDefault();
  if(e.target.id==='lf')doLogin();
  });

/* ---- campos alterados ---- */
app.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(t.id==='per'){period=t.value;render()}
  else if(t.id==='si'){if(t.value.trim()==='')delete S.saldoIni[selY];else S.saldoIni[selY]=parseV(t.value);save()}
  else if(d.ln){const[k,i]=d.ln.split('|');S[k][i].nome=t.value;save()}
  else if(d.lv){const[k,i]=d.lv.split('|');S[k][i].valor=parseV(t.value);save();render()}
  });
/* o título das colunas também ordena pelo teclado */
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('th[data-sort]')){e.preventDefault();e.target.click()}});
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('[data-csort]')){e.preventDefault();e.target.click()}});
