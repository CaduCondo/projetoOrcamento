/* Eventos da tela: um ouvinte por tipo de evento, que reconhece o botão/campo pelos atributos data-* */
const app=document.getElementById('app');

/* ---- ações usadas pelos eventos ---- */
const hideTip=()=>{tip.style.display='none'};
function addYear(){const def=Math.max(...S.anos)+1,v=parseInt(prompt('Qual ano deseja adicionar?',def));
  if(v>=1990&&v<=2100){if(!S.anos.includes(v)){S.anos.push(v);S.anos.sort((a,b)=>a-b);save()}selY=v;selM=0;render()}}
function confirmDeleteCat(id){const c=catById(id),nl=catStats()[id]?.n||0;
  if(confirm(nl?`Excluir “${c.nome}” e os ${nl} lançamentos dela (em todos os anos)? Para juntar com outra categoria, use Mesclar.`:`Excluir “${c.nome}”?`)){deleteCat(id);save();render()}}
function createCatFromPanel(){const input=document.getElementById('ncn'),n=input.value.trim().replace(/\s+/g,' ');if(!n){input.focus();return}
  addCat(document.getElementById('nct').value,n);save();catUI.q=n;catUI.filtro='ativas';render()}
function quickAdd(){const c=Combobox.get('qc'),v=parseV(el('qv').value),d=el('qd').value.trim();
  if(!c){el('qcin').focus();return}if(!v){el('qv').focus();return}
  ens(c,selY,selM).items.push({v,d,ok:el('qk').checked});save();render();el('qcin').focus()}
function exportBackup(){download(`orcamento-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S,null,1),'application/json')}
function exportCsv(){const rows=[['Ano','Tipo','Categoria',...MESES,'Total']],num=x=>x.toFixed(2).replace('.',',');
  S.anos.forEach(y=>S.cats.forEach(c=>{const v=MESES.map((_,m)=>V(c.id,y,m,'real'));rows.push([y,c.tipo,c.nome,...v.map(num),num(v.reduce((a,b)=>a+b,0))])}));
  download('orcamento.csv','﻿'+rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n'),'text/csv')}
function mergeImport(o){const clash=importClashYears(o);
  if(clash.length&&!confirm(`Os anos ${clash.join(', ')} já têm lançamentos e serão SUBSTITUÍDOS pelos do arquivo. Continuar?`))return;
  applyImport(o);save();render();alert(`Importado: anos ${o.anos.join(', ')}.`)}
function importFile(file,input){readJsonFile(file,o=>o.cats&&o.data&&o.anos).then(mergeImport).catch(()=>alert('Arquivo de importação inválido.')).finally(()=>{input.value=''})}
function restoreFile(file){readJsonFile(file,s=>s.cats&&s.data).then(s=>{S=mig(s);if(!S.anos.includes(selY))selY=S.anos[S.anos.length-1];save();render()}).catch(()=>alert('Arquivo de backup inválido.'))}

/* ---- menu e cabeçalho ---- */
document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}});
document.getElementById('hr').addEventListener('click',e=>{
  if(e.target.closest('[data-logout]'))logout();
  else if(e.target.closest('[data-addyear]'))addYear()});
document.getElementById('hr').addEventListener('change',e=>{if(e.target.id==='ysel'){selY=+e.target.value;render()}});

/* ---- busca de categorias (Ajustes) e escolha no combobox ---- */
document.addEventListener('input',e=>{if(e.target.id==='cq'){catUI.q=e.target.value;catUI.lim=40;renderCatList()}});
document.addEventListener('cbpick',e=>{const{id,cid}=e.detail;
  if(id==='qc')document.getElementById('qv')?.focus();
  else if(id==='cs'){catSel=cid;render()}
  else if(id==='mg')MergeDialog.picked(cid)});

/* ---- arrastar linhas da tela Mês para reordenar ---- */
let dragId=null;
const dragRow=e=>e.target.closest?.('tr[data-cat]');
app.addEventListener('dragstart',e=>{const r=dragRow(e);if(!r)return;dragId=r.dataset.cat;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);r.classList.add('dragging');hideTip()});
app.addEventListener('dragover',e=>{const r=dragRow(e);if(!r||!dragId)return;
  if(catById(dragId).tipo!==r.dataset.tipo)return;e.preventDefault();app.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));r.classList.add('over')});
app.addEventListener('drop',e=>{const r=dragRow(e);if(!r||!dragId||r.dataset.cat===dragId)return;e.preventDefault();
  reorderCats(dragId,r.dataset.cat);dragId=null;save();render()});
app.addEventListener('dragend',()=>{dragId=null;app.querySelectorAll('.dragging,.over').forEach(x=>x.classList.remove('dragging','over'))});

/* ---- cliques ---- */
app.addEventListener('click',e=>{const t=e.target;let b;
  if(b=t.closest('[data-lm]')){loginMode=b.dataset.lm;render()}
  else if(b=t.closest('[data-modo]')){modo=b.dataset.modo;render()}
  else if(b=t.closest('[data-m]')){selM=+b.dataset.m;render()}
  else if(b=t.closest('[data-open]')){const{c,y,m}=parseKey(b.dataset.open);hideTip();openCell(c,y,m)}
  else if(b=t.closest('[data-la]')){S[b.dataset.la].push({nome:'Novo item',valor:0});save();render()}
  else if(b=t.closest('[data-ld]')){const[k,i]=b.dataset.ld.split('|');S[k].splice(+i,1);save();render()}
  else if(b=t.closest('[data-sc]')){Combobox.set('qc',b.dataset.sc);document.getElementById('qv').focus()}
  else if(b=t.closest('[data-cf]')){const[k,v]=b.dataset.cf.split('|');catUI[k]=v;catUI.lim=40;render()}
  else if(t.closest('[data-cmore]')){catUI.lim+=40;renderCatList()}
  else if(b=t.closest('[data-cmerge]'))MergeDialog.open(b.dataset.cmerge)
  else if(t.closest('[data-cnew]'))createCatFromPanel()
  else if(b=t.closest('[data-cdel]'))confirmDeleteCat(b.dataset.cdel)
  else if(t.id==='bk')exportBackup()
  else if(t.id==='csv')exportCsv()});

/* ---- formulários ---- */
app.addEventListener('submit',e=>{e.preventDefault();
  if(e.target.id==='lf')doLogin();
  else if(e.target.id==='qf')quickAdd()});

/* ---- campos alterados ---- */
app.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(t.id==='per'){period=t.value;render()}
  else if(t.id==='si'){if(t.value.trim()==='')delete S.saldoIni[selY];else S.saldoIni[selY]=parseV(t.value);save()}
  else if(d.ln){const[k,i]=d.ln.split('|');S[k][i].nome=t.value;save()}
  else if(d.lv){const[k,i]=d.lv.split('|');S[k][i].valor=parseV(t.value);save();render()}
  else if(d.cn){catById(d.cn).nome=t.value;save()}
  else if(d.cd){catById(d.cd).dia=parseInt(t.value)||null;save()}
  else if(t.id==='imp'&&t.files[0])importFile(t.files[0],t)
  else if(t.id==='rs'&&t.files[0])restoreFile(t.files[0])});
