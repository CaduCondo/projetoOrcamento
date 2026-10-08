/* Tela de login, cadastro e recuperação de senha.
   O que muda entre "local" e "nuvem" (textos, campos) vem do objeto backend. */
function vLogin(){const up=loginMode==='up',rs=loginMode==='reset',pw=!(rs&&!backend.resetNeedsPassword);
  return `<form class="login" id="lf"><h2>💰 Meu Orçamento</h2><div class="sub">${up?'Criar conta':rs?backend.resetTitle:'Entrar'}</div>
  <label>E-mail<input type="email" id="lem" required autocomplete="username"></label>
  ${pw?`<label>${rs?'Nova senha':'Senha'}<input type="password" id="lpw" required autocomplete="${up||rs?'new-password':'current-password'}"></label>`:''}
  ${(up||rs)&&pw?`<label>Confirmar senha<input type="password" id="lpw2" required autocomplete="new-password"></label>${PasswordRules.html('pwr-login')}`:''}
  ${up&&backend.canImportLegacy()?`<label class="row" style="flex-direction:row;align-items:center;color:var(--ink)"><input type="checkbox" id="limp" checked class="ok"> Trazer os dados que já estão preenchidos (planilha 2026 e o que você lançou)</label>`:''}
  ${backend.showRemember?`<label class="row" style="flex-direction:row;align-items:center;color:var(--ink)"><input type="checkbox" id="lrem" class="ok"> Manter conectado neste navegador</label>`:''}
  <div class="err" id="lerr"></div><button class="btn" id="lbtn"${(up||rs)&&pw?' disabled':''}>${up?'Criar conta':rs?backend.resetButton:'Entrar'}</button>
  <p class="sub" style="margin-top:14px">${up||rs?'<a data-lm="in">Voltar para entrar</a>':'Primeira vez? <a data-lm="up">Criar conta</a> · <a data-lm="reset">Esqueci minha senha</a>'}</p>
  <p class="sub">${backend.loginNote(loginMode)}</p></form>`}
