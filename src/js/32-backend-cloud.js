/* Backend NUVEM: login e cadastro (perfil) no Firebase; os lançamentos vão para o armazém escolhido pela pessoa:
   FirestoreStore (banco de dados) ou DeviceStore (arquivo no aparelho — nunca toca no banco).
   Grava com pequena espera (debounce) para agrupar edições. */
const AUTHMSG={'auth/password-does-not-meet-requirements':'A senha não atende às regras de segurança: use maiúscula, minúscula, números e um caractere especial (mínimo 6).','auth/email-already-in-use':'Este e-mail já tem conta.','auth/weak-password':'Senha fraca: use ao menos 6 caracteres.','auth/invalid-email':'E-mail inválido.',
  'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
  'auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente de novo.','auth/network-request-failed':'Sem conexão com a internet.'};
const PWDMSG={'auth/password-does-not-meet-requirements':'A senha não atende às regras de segurança: use maiúscula, minúscula, números e um caractere especial (mínimo 6).','auth/wrong-password':'A senha atual está incorreta.','auth/invalid-credential':'A senha atual está incorreta.','auth/weak-password':'Senha fraca: use ao menos 6 caracteres.',
  'auth/requires-recent-login':'Por segurança, saia, entre de novo e tente outra vez.','auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente de novo.','auth/network-request-failed':'Sem conexão com a internet.'};

class CloudBackend {
  constructor(){firebase.initializeApp(FBCFG);this.auth=firebase.auth();this.db=firebase.firestore();
    this.uid=null;this.store=null;this.timer=null;this.chain=Promise.resolve()}

  /* ---- textos e comportamentos que as telas consultam ---- */
  get isCloud(){return true}
  get showRemember(){return false}
  get resetNeedsPassword(){return false}
  get resetTitle(){return 'Redefinir senha'}
  get resetButton(){return 'Enviar link por e-mail'}
  get isAdmin(){return !!this.admin}
  get storageChoice(){return true}                       // a tela de perfil oferece a escolha nuvem × aparelho
  get backupHint(){return storesInCloud(profile||defaultProfile())?'Seus dados ficam salvos na sua conta online. Mesmo assim, baixe um backup de vez em quando.':'Seus dados ficam só neste aparelho (arquivo CSV). Baixe o arquivo de vez em quando e guarde uma cópia.'}
  loginNote(){return 'Seu cadastro fica salvo na sua conta. Onde guardar seus lançamentos (nuvem ou só no aparelho) você escolhe no seu perfil.'}
  canImportLegacy(){return false}

  /* ---- perfil (cadastro) ---- */
  profileDoc(uid){return this.db.collection('profiles').doc(uid||this.uid)}
  async loadProfile(){const d=await this.profileDoc().get();return d.exists?d.data():null}
  async saveProfile(p){await this.profileDoc().set({...p,email:user})}
  async changePassword(atual,nova){const u=this.auth.currentUser;
    try{await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email,atual));await u.updatePassword(nova)}
    catch(e){throw new Error(PWDMSG[e.code]||'Erro: '+(e.code||e.message))}}

  /* ---- administrador (somente leitura; quem é admin é definido no banco, à mão) ---- */
  async checkAdmin(){try{return (await this.db.collection('admins').doc(this.uid).get()).exists}catch{return false}}
  async listProfiles(){const r=await this.db.collection('profiles').get(),o=[];r.forEach(d=>o.push({uid:d.id,...d.data()}));return o}

  /* ---- escolher o armazém conforme o perfil ---- */
  makeStore(){return storesInCloud(profile)?new FirestoreStore(this.db,this.uid):new DeviceStore(this.uid)}

  /* ---- gravação ---- */
  save(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),700);status('Salvando…')}
  flush(){clearTimeout(this.timer);this.timer=null;if(!this.uid||!S||!this.store||readOnly)return this.chain;this.chain=this.chain.then(()=>this.write());return this.chain}
  async write(){if(!this.uid||!S||!this.store||readOnly)return;const store=this.store;     // nunca grava enquanto o administrador só olha os dados de outra pessoa
    status('Salvando…');
    try{const r=await store.write(S);
      if(store instanceof DeviceStore){
        if(r.arquivo==='ok'||r.arquivo==='sem-arquivo'){status(r.arquivo==='ok'?'Salvo no arquivo ✓':'Salvo neste aparelho ✓');if(r.arquivo==='ok')noticeClear('arquivo')}
        else{status('Salvo neste aparelho ✓ (arquivo não atualizado)');setNotice(r.arquivo==='permissao'?'permissao':r.arquivo==='nao-lido'?'arquivo-nao-lido':'arquivo-erro')}
        if(!r.copia)status('Não consegui salvar neste aparelho — baixe o CSV agora',true)}
      else status('Salvo ✓')
    }catch(e){console.error(e);status('Erro ao salvar — verifique a conexão',true)}}

  /* ---- carregar os dados de quem entrou ---- */
  async start(u){this.uid=u.uid;user=u.email;
    try{
      let salvo=null,perfilOk=true;
      try{salvo=await this.loadProfile()}catch(e){perfilOk=false;console.error('perfil:',e)}      // regras do banco desatualizadas? abre mesmo assim e avisa
      const novo=perfilOk&&!salvo;profile=normProfile(salvo);if(novo)profile.criadoEm=new Date().toISOString();
      this.store=this.makeStore();noticeClear();this.admin=await this.checkAdmin();
      let st=null;
      if(this.store instanceof DeviceStore){const r=await this.store.load();st=r.state;noticeFromLoad(r)}
      else st=await this.store.read();
      S=st||blank();
      if(perfilOk){
        if(profilePending(profile,true))profile.lembretes=(profile.lembretes||0)+1;
        if(novo||profilePending(profile,true)){try{await this.saveProfile(profile)}catch(e){perfilOk=false;console.error('perfil:',e)}}}
      if(!perfilOk)setNotice('regras');
      else if(shouldRemind(profile,true)&&!notice)setNotice('perfil');
      loginMode='in';initSelection();render();
      if(!st&&this.store instanceof FirestoreStore)this.flush()      // 1º acesso na nuvem: cria os documentos iniciais
    }catch(e){console.error(e);S=null;
      document.getElementById('app').innerHTML=`<div class="login"><h2>Não foi possível carregar</h2><p class="sub">${esc(e.code||e.message)}</p><p class="sub">Verifique a internet e as regras do Firestore.</p><button class="btn" onclick="location.reload()">Tentar de novo</button> <button class="btn dan" style="margin-top:8px" onclick="backend.auth.signOut()">Sair</button></div>`}}

  /* ---- sessão ---- */
  logout(){if(readOnly)Viewer.reset();this.flush().then(()=>this.auth.signOut())}
  boot(){document.getElementById('app').innerHTML='<p class="hint" style="padding:60px 0;text-align:center">Carregando…</p>';
    addEventListener('visibilitychange',()=>{if(document.hidden)this.flush()});addEventListener('pagehide',()=>this.flush());
    this.auth.onAuthStateChanged(u=>{if(u){if(!S||this.uid!==u.uid)this.start(u)}else{this.uid=null;this.store=null;this.admin=false;user=null;S=null;profile=null;readOnly=false;viewing=null;noticeClear();loginMode='in';render()}})}

  /* entrar / criar conta / redefinir senha (lê os campos da tela de login) */
  async login(){const e=el('lem').value.trim().toLowerCase(),p=el('lpw')?.value||'',
      err=(t,ok)=>{const x=el('lerr');x.style.color=ok?'var(--pos)':'';x.textContent=t};
    try{
      if(loginMode==='reset'){await this.auth.sendPasswordResetEmail(e);return err('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.',true)}
      if(loginMode==='up'){const pb=passwordProblem(p,el('lpw2').value);if(pb)return err(pb);await this.auth.createUserWithEmailAndPassword(e,p)}
      else await this.auth.signInWithEmailAndPassword(e,p)
    }catch(x){err(AUTHMSG[x.code]||'Erro: '+(x.code||x.message))}}
}
