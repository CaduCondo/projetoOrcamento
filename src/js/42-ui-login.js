/* Tela de login, cadastro e recuperação de senha */
/* ---------- LOGIN ---------- */
function vLogin(){const first=!CLOUD&&!Object.keys(users()).length,up=loginMode==='up',rs=loginMode==='reset',hasSeed=!!SEED,pw=!(CLOUD&&rs);
  return `<form class="login" id="lf"><h2>💰 Meu Orçamento</h2><div class="sub">${up?'Criar conta':rs?(CLOUD?'Redefinir senha':'Definir nova senha'):'Entrar'}</div>
  <label>E-mail<input type="email" id="lem" required autocomplete="username"></label>
  ${pw?`<label>${rs?'Nova senha':'Senha'}<input type="password" id="lpw" required minlength="6" autocomplete="${up||rs?'new-password':'current-password'}"></label>`:''}
  ${(up||rs)&&pw?`<label>Confirmar senha<input type="password" id="lpw2" required minlength="6" autocomplete="new-password"></label>`:''}
  ${up&&first&&(hasSeed||localStorage.getItem(LEGACY))?`<label class="row" style="flex-direction:row;align-items:center;color:var(--ink)"><input type="checkbox" id="limp" checked class="ok"> Trazer os dados que já estão preenchidos (planilha 2026 e o que você lançou)</label>`:''}
  ${CLOUD?'':`<label class="row" style="flex-direction:row;align-items:center;color:var(--ink)"><input type="checkbox" id="lrem" class="ok"> Manter conectado neste navegador</label>`}
  <div class="err" id="lerr"></div><button class="btn">${up?'Criar conta':rs?(CLOUD?'Enviar link por e-mail':'Salvar nova senha e entrar'):'Entrar'}</button>
  <p class="sub" style="margin-top:14px">${up||rs?'<a data-lm="in">Voltar para entrar</a>':'Primeira vez? <a data-lm="up">Criar conta</a> · <a data-lm="reset">Esqueci minha senha</a>'}</p>
  <p class="sub">${CLOUD?'Seus dados ficam salvos na sua conta e acompanham você em qualquer aparelho.':rs?'A nova senha vale para a conta deste e-mail <b>neste navegador</b> e os dados são mantidos. Atenção: como não há servidor, isto não é uma proteção forte — qualquer pessoa com acesso a este navegador pode redefinir.':'Contas ficam só neste navegador. Faça backup em Ajustes.'}</p></form>`}
const AUTHMSG={'auth/email-already-in-use':'Este e-mail já tem conta.','auth/weak-password':'Senha fraca: use ao menos 6 caracteres.','auth/invalid-email':'E-mail inválido.','auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.','auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente de novo.','auth/network-request-failed':'Sem conexão com a internet.'};
async function doCloudLogin(){const e=document.getElementById('lem').value.trim().toLowerCase(),p=document.getElementById('lpw')?.value||'',err=(t,ok)=>{const x=document.getElementById('lerr');x.style.color=ok?'var(--pos)':'';x.textContent=t};
  try{
    if(loginMode==='reset'){await fbAuth.sendPasswordResetEmail(e);return err('Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.',true)}
    if(loginMode==='up'){if(p!==document.getElementById('lpw2').value)return err('As senhas não conferem.');await fbAuth.createUserWithEmailAndPassword(e,p)}
    else await fbAuth.signInWithEmailAndPassword(e,p)
  }catch(x){err(AUTHMSG[x.code]||'Erro: '+(x.code||x.message))}}
async function doLogin(){if(CLOUD)return doCloudLogin();const e=lem.value.trim().toLowerCase(),p=lpw.value,err=t=>lerr.textContent=t,us=users();
  if(!crypto?.subtle)return err('Este navegador não suporta a criptografia necessária.');
  if(loginMode==='up'){if(us[e])return err('Este e-mail já tem conta neste navegador.');if(p!==lpw2.value)return err('As senhas não conferem.');
    const salt=b64e(crypto.getRandomValues(new Uint8Array(16)));us[e]={salt,hash:await hashPw(p,salt)};setUsers(us);
    const first=Object.keys(us).length===1;
    if(first&&document.getElementById('limp')?.checked){let st=null;try{const t=localStorage.getItem(LEGACY);if(t)st=JSON.parse(t)}catch{}
      localStorage.setItem(dkey(e),JSON.stringify(mig(st||(SEED?structuredClone(SEED):blank()))))}
    else localStorage.setItem(dkey(e),JSON.stringify(blank()))}
  else if(loginMode==='reset'){if(!us[e])return err('Não existe conta com este e-mail neste navegador.');if(p!==lpw2.value)return err('As senhas não conferem.');
    const salt=b64e(crypto.getRandomValues(new Uint8Array(16)));us[e]={salt,hash:await hashPw(p,salt)};setUsers(us)}
  else{const u=us[e];if(!u||await hashPw(p,u.salt)!==u.hash)return err(u?'Senha incorreta.':'Não existe conta com este e-mail neste navegador.')}
  startSession(e,lrem.checked)}
