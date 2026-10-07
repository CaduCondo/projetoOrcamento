/* Armazenamento na nuvem (Firebase Auth + Firestore) */
/* ---------- NUVEM (Firebase) — ativa só quando há configuração ---------- */
const CLOUD=!!FBCFG&&typeof firebase!=='undefined';
let fbAuth=null,fbDb=null,uid=null,saveTimer=null,flushP=Promise.resolve(),snap={meta:'',years:{}};
if(CLOUD){firebase.initializeApp(FBCFG);fbAuth=firebase.auth();fbDb=firebase.firestore()}
const metaOf=s=>({cats:s.cats,anos:s.anos,saldoIni:s.saldoIni,saldos:s.saldos,dividas:s.dividas,bens:s.bens});
const yearsOf=s=>{const y={};for(const[k,v]of Object.entries(s.data)){const[c,yy,m]=k.split('|');(y[yy]??={})[c+'|'+m]=v}return y};
const strYears=ys=>Object.fromEntries(Object.entries(ys).map(([y,v])=>[y,JSON.stringify(v)]));
function status(t,err){const el=document.getElementById('toast');el.textContent=t;el.style.background=err?'#c2410c':'';el.style.color=err?'#fff':'';el.classList.add('on');clearTimeout(tt);if(!err&&t!=='Salvando…')tt=setTimeout(()=>el.classList.remove('on'),900)}
function cloudFlush(){clearTimeout(saveTimer);saveTimer=null;if(!CLOUD||!uid||!S)return flushP;flushP=flushP.then(doFlush);return flushP}
async function doFlush(){if(!uid||!S)return;
  const base=fbDb.collection('users').doc(uid),batch=fbDb.batch(),meta=JSON.stringify(metaOf(S)),ys=yearsOf(S),cur=strYears(ys);let n=0;
  if(meta!==snap.meta){batch.set(base.collection('meta').doc('main'),{json:meta});n++}
  for(const y of Object.keys(cur))if(snap.years[y]!==cur[y]){batch.set(base.collection('years').doc(y),{json:cur[y]});n++}
  for(const y of Object.keys(snap.years))if(!(y in cur)){batch.delete(base.collection('years').doc(y));n++}
  if(!n){status('Salvo ✓');return}
  status('Salvando…');
  try{await batch.commit();snap={meta,years:cur};status('Salvo ✓')}catch(e){console.error(e);status('Erro ao salvar — verifique a conexão',true)}}
async function cloudStart(u){uid=u.uid;user=u.email;
  const base=fbDb.collection('users').doc(uid);
  try{const[m,ys]=await Promise.all([base.collection('meta').doc('main').get(),base.collection('years').get()]);
    let st;if(m.exists){st=JSON.parse(m.data().json);st.data={};ys.forEach(d=>{const o=JSON.parse(d.data().json);for(const[k,v]of Object.entries(o)){const[c,mm]=k.split('|');st.data[`${c}|${d.id}|${mm}`]=v}});st=mig(st)}else st=blank();
    S=st;snap={meta:m.exists?JSON.stringify(metaOf(S)):'',years:m.exists?strYears(yearsOf(S)):{}};
    const cy=new Date().getFullYear();selY=S.anos.includes(cy)?cy:S.anos[S.anos.length-1];selM=selY===cy?new Date().getMonth():0;tab='mes';render();
    if(!m.exists)cloudFlush()
  }catch(e){console.error(e);S=null;document.getElementById('app').innerHTML=`<div class="login"><h2>Não foi possível carregar</h2><p class="sub">${esc(e.code||e.message)}</p><p class="sub">Verifique a internet e as regras do Firestore.</p><button class="btn" onclick="location.reload()">Tentar de novo</button> <button class="btn dan" style="margin-top:8px" onclick="fbAuth.signOut()">Sair</button></div>`}}
addEventListener('visibilitychange',()=>{if(document.hidden)cloudFlush()});addEventListener('pagehide',()=>cloudFlush());
