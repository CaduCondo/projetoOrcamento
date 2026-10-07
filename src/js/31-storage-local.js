/* Armazenamento local (contas e dados neste navegador) */
/* ---------- CONTAS LOCAIS ---------- */
let user=null,S=null,loginMode='in';
const b64e=a=>btoa(String.fromCharCode(...a)),b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hashPw(pw,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  return b64e(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64d(salt),iterations:150000},k,256)))}
const users=()=>{try{return JSON.parse(localStorage.getItem('orc-users')||'{}')}catch{return{}}};
const setUsers=u=>localStorage.setItem('orc-users',JSON.stringify(u));
const dkey=e=>'orc-data-'+e;
function loadUser(e){try{const t=localStorage.getItem(dkey(e));if(t)return mig(JSON.parse(t))}catch{}return blank()}
let tt;function save(){if(CLOUD){clearTimeout(saveTimer);saveTimer=setTimeout(cloudFlush,700);status('Salvando…');return}try{localStorage.setItem(dkey(user),JSON.stringify(S))}catch{}
  const t=document.getElementById('toast');t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),900)}
function startSession(e,remember){user=e;S=loadUser(e);try{(remember?localStorage:sessionStorage).setItem('orc-sess',e)}catch{}
  selY=S.anos.includes(new Date().getFullYear())?new Date().getFullYear():S.anos[S.anos.length-1];selM=selY===new Date().getFullYear()?new Date().getMonth():0;tab='mes';render()}
function logout(){if(CLOUD){cloudFlush().then(()=>fbAuth.signOut());return}try{localStorage.removeItem('orc-sess');sessionStorage.removeItem('orc-sess')}catch{}user=null;S=null;render()}
