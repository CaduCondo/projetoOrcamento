/* Lista de regras da senha na tela: cada linha começa com X vermelho e vira V verde quando a regra é atendida.
   O botão de salvar só habilita quando TODAS estiverem verdes. */
const PasswordRules={
  /* HTML da lista (todas começam com X vermelho) */
  html(id){return `<ul class="pwrules" id="${id}" aria-live="polite">${PASSWORD_RULES.map(r=>`<li data-r="${r.id}" class="bad" aria-label="Falta: ${esc(r.texto)}"><b aria-hidden="true">X</b><span>${esc(r.texto)}</span></li>`).join('')}</ul>`},
  /* atualiza as cores e os X/V; devolve verdadeiro se todas as regras estão atendidas */
  update(id,senha,confirma){const ul=el(id);if(!ul)return false;const res=passwordChecks(senha,confirma);
    for(const r of res){const li=ul.querySelector(`[data-r="${r.id}"]`);if(!li)continue;
      li.classList.toggle('ok',r.ok);li.classList.toggle('bad',!r.ok);li.querySelector('b').textContent=r.ok?'V':'X';
      li.setAttribute('aria-label',(r.ok?'Atendido: ':'Falta: ')+r.texto)}
    return res.every(r=>r.ok)},
  /* liga os campos à lista e ao botão: fieldSenha/fieldConfirma = ids dos campos, botao = seletor do botão */
  sync(listaId,fieldSenha,fieldConfirma,botao){const ok=PasswordRules.update(listaId,el(fieldSenha)?.value||'',el(fieldConfirma)?.value||'');
    const b=document.querySelector(botao);if(b)b.disabled=!ok;return ok},
};
/* digitou (ou o navegador preencheu a senha): atualiza a lista certa */
function syncPasswordUi(){
  if(el('pwr-login'))PasswordRules.sync('pwr-login','lpw','lpw2','#lbtn');
  if(el('pwr-perfil'))PasswordRules.sync('pwr-perfil','pwn','pwc','[data-pw="trocar"]')}
for(const ev of['input','change'])document.addEventListener(ev,e=>{if(['lpw','lpw2','pwn','pwc'].includes(e.target.id))syncPasswordUi()});
