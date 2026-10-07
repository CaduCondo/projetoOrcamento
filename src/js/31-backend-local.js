/* Backend LOCAL: contas e dados ficam só neste navegador (localStorage).
   Usado quando não há Firebase (build --env local). Senhas guardadas como hash PBKDF2. */
const b64e=a=>btoa(String.fromCharCode(...a)),b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

class LocalBackend {
  /* ---- textos e comportamentos que a tela de login consulta ---- */
  get isCloud(){return false}
  get showRemember(){return true}
  get isAdmin(){return false}
  get storageChoice(){return false}                     // sem nuvem: os dados ficam sempre neste navegador
  get resetNeedsPassword(){return true}
  get resetTitle(){return 'Definir nova senha'}
  get resetButton(){return 'Salvar nova senha e entrar'}
  get backupHint(){return 'Seus dados ficam guardados neste navegador, na sua conta. Baixe um backup de vez em quando.'}
  loginNote(mode){return mode==='reset'
    ?'A nova senha vale para a conta deste e-mail <b>neste navegador</b> e os dados são mantidos. Atenção: como não há servidor, isto não é uma proteção forte — qualquer pessoa com acesso a este navegador pode redefinir.'
    :'Contas ficam só neste navegador. Faça backup em Ajustes.'}
  /* a 1ª conta pode trazer dados já existentes (planilha embutida ou versão anterior do app) */
  canImportLegacy(){return !Object.keys(this.users()).length&&(!!SEED||!!localStorage.getItem(LEGACY))}

  /* ---- contas ---- */
  users(){try{return JSON.parse(localStorage.getItem('orc-users')||'{}')}catch{return{}}}
  setUsers(u){localStorage.setItem('orc-users',JSON.stringify(u))}
  dkey(email){return 'orc-data-'+email}
  async hash(pw,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    return b64e(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:b64d(salt),iterations:150000},k,256)))}
  async credential(pw){const salt=b64e(crypto.getRandomValues(new Uint8Array(16)));return{salt,hash:await this.hash(pw,salt)}}

  /* ---- cadastro (perfil) e senha ---- */
  readProfile(email){try{return JSON.parse(localStorage.getItem('orc-profile-'+email))}catch{return null}}
  async loadProfile(){return this.readProfile(user)}
  async saveProfile(p){localStorage.setItem('orc-profile-'+user,JSON.stringify(p))}
  async changePassword(atual,nova){const us=this.users(),u=us[user];
    if(!u||await this.hash(atual,u.salt)!==u.hash)throw new Error('A senha atual está incorreta.');
    us[user]=await this.credential(nova);this.setUsers(us)}

  /* ---- dados ---- */
  loadUser(email){try{const t=localStorage.getItem(this.dkey(email));if(t)return mig(JSON.parse(t))}catch{}return blank()}
  save(){try{localStorage.setItem(this.dkey(user),JSON.stringify(S))}catch{}status('Salvo ✓')}

  /* ---- sessão ---- */
  startSession(email,remember){user=email;S=this.loadUser(email);
    try{(remember?localStorage:sessionStorage).setItem('orc-sess',email)}catch{}
    profile=normProfile(this.readProfile(email));if(profilePending(profile,false)){profile.lembretes=(profile.lembretes||0)+1;localStorage.setItem('orc-profile-'+email,JSON.stringify(profile))}
    noticeClear();if(shouldRemind(profile,false))setNotice('perfil');
    loginMode='in';initSelection();render()}
  logout(){try{localStorage.removeItem('orc-sess');sessionStorage.removeItem('orc-sess')}catch{}user=null;S=null;profile=null;noticeClear();loginMode='in';render()}
  boot(){let e=null;try{e=sessionStorage.getItem('orc-sess')||localStorage.getItem('orc-sess')}catch{}
    if(e&&this.users()[e])this.startSession(e,!!localStorage.getItem('orc-sess'));else render()}

  /* entrar / criar conta / redefinir senha (lê os campos da tela de login) */
  async login(){
    const e=el('lem').value.trim().toLowerCase(),p=el('lpw').value,err=t=>el('lerr').textContent=t,us=this.users();
    if(!crypto?.subtle)return err('Este navegador não suporta a criptografia necessária.');
    if(loginMode==='up'){
      if(us[e])return err('Este e-mail já tem conta neste navegador.');if(p!==el('lpw2').value)return err('As senhas não conferem.');
      us[e]=await this.credential(p);this.setUsers(us);
      const first=Object.keys(us).length===1;
      if(first&&el('limp')?.checked){let st=null;try{const t=localStorage.getItem(LEGACY);if(t)st=JSON.parse(t)}catch{}
        localStorage.setItem(this.dkey(e),JSON.stringify(mig(st||(SEED?structuredClone(SEED):blank()))))}
      else localStorage.setItem(this.dkey(e),JSON.stringify(blank()))}
    else if(loginMode==='reset'){
      if(!us[e])return err('Não existe conta com este e-mail neste navegador.');if(p!==el('lpw2').value)return err('As senhas não conferem.');
      us[e]=await this.credential(p);this.setUsers(us)}
    else{const u=us[e];if(!u||await this.hash(p,u.salt)!==u.hash)return err(u?'Senha incorreta.':'Não existe conta com este e-mail neste navegador.')}
    this.startSession(e,el('lrem').checked)}
}
