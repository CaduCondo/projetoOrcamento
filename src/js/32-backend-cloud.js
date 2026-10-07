/* Backend NUVEM: login com Firebase Auth e dados no Firestore (users/{uid}/meta e users/{uid}/years/{ano}).
   Grava só os documentos que mudaram, com pequena espera (debounce) para agrupar edições. */
const AUTHMSG={'auth/email-already-in-use':'Este e-mail já tem conta.','auth/weak-password':'Senha fraca: use ao menos 6 caracteres.','auth/invalid-email':'E-mail inválido.',
  'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
  'auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente de novo.','auth/network-request-failed':'Sem conexão com a internet.'};

class CloudBackend {
  constructor(){firebase.initializeApp(FBCFG);this.auth=firebase.auth();this.db=firebase.firestore();
    this.uid=null;this.timer=null;this.chain=Promise.resolve();this.snap={meta:'',years:{}}}

  /* ---- textos e comportamentos que a tela de login consulta ---- */
  get isCloud(){return true}
  get showRemember(){return false}
  get resetNeedsPassword(){return false}
  get resetTitle(){return 'Redefinir senha'}
  get resetButton(){return 'Enviar link por e-mail'}
  get backupHint(){return 'Seus dados ficam salvos na sua conta online. Mesmo assim, baixe um backup de vez em quando.'}
  loginNote(){return 'Seus dados ficam salvos na sua conta e acompanham você em qualquer aparelho.'}
  canImportLegacy(){return false}

  /* ---- gravação ---- */
  userDoc(){return this.db.collection('users').doc(this.uid)}
  save(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),700);status('Salvando…')}
  flush(){clearTimeout(this.timer);this.timer=null;if(!this.uid||!S)return this.chain;this.chain=this.chain.then(()=>this.write());return this.chain}
  async write(){if(!this.uid||!S)return;
    const base=this.userDoc(),batch=this.db.batch(),cur=serializeState(S);let n=0;
    if(cur.meta!==this.snap.meta){batch.set(base.collection('meta').doc('main'),{json:cur.meta});n++}
    for(const y of Object.keys(cur.years))if(this.snap.years[y]!==cur.years[y]){batch.set(base.collection('years').doc(y),{json:cur.years[y]});n++}
    for(const y of Object.keys(this.snap.years))if(!(y in cur.years)){batch.delete(base.collection('years').doc(y));n++}
    if(!n){status('Salvo ✓');return}
    status('Salvando…');
    try{await batch.commit();this.snap=cur;status('Salvo ✓')}catch(e){console.error(e);status('Erro ao salvar — verifique a conexão',true)}}

  /* ---- carregar os dados do usuário que entrou ---- */
  async start(u){this.uid=u.uid;user=u.email;const base=this.userDoc();
    try{const[m,ys]=await Promise.all([base.collection('meta').doc('main').get(),base.collection('years').get()]);
      if(m.exists){const yj={};ys.forEach(d=>yj[d.id]=d.data().json);S=deserializeState(m.data().json,yj);this.snap=serializeState(S)}
      else{S=blank();this.snap={meta:'',years:{}}}
      loginMode='in';initSelection();render();if(!m.exists)this.flush()
    }catch(e){console.error(e);S=null;
      document.getElementById('app').innerHTML=`<div class="login"><h2>Não foi possível carregar</h2><p class="sub">${esc(e.code||e.message)}</p><p class="sub">Verifique a internet e as regras do Firestore.</p><button class="btn" onclick="location.reload()">Tentar de novo</button> <button class="btn dan" style="margin-top:8px" onclick="backend.auth.signOut()">Sair</button></div>`}}

  /* ---- sessão ---- */
  logout(){this.flush().then(()=>this.auth.signOut())}
  boot(){document.getElementById('app').innerHTML='<p class="hint" style="padding:60px 0;text-align:center">Carregando…</p>';
    addEventListener('visibilitychange',()=>{if(document.hidden)this.flush()});addEventListener('pagehide',()=>this.flush());
    this.auth.onAuthStateChanged(u=>{if(u){if(!S||this.uid!==u.uid)this.start(u)}else{this.uid=null;user=null;S=null;loginMode='in';render()}})}

  /* entrar / criar conta / redefinir senha (lê os campos da tela de login) */
  async login(){const e=document.getElementById('lem').value.trim().toLowerCase(),p=document.getElementById('lpw')?.value||'',
      err=(t,ok)=>{const x=document.getElementById('lerr');x.style.color=ok?'var(--pos)':'';x.textContent=t};
    try{
      if(loginMode==='reset'){await this.auth.sendPasswordResetEmail(e);return err('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.',true)}
      if(loginMode==='up'){if(p!==document.getElementById('lpw2').value)return err('As senhas não conferem.');await this.auth.createUserWithEmailAndPassword(e,p)}
      else await this.auth.signInWithEmailAndPassword(e,p)
    }catch(x){err(AUTHMSG[x.code]||'Erro: '+(x.code||x.message))}}
}
