/* Área do ADMINISTRADOR: escolher um usuário e ver os dados dele em modo SOMENTE LEITURA.
   Quem é administrador é decidido pelo banco (documento admins/{uid}, criado à mão no console) — as regras do Firestore impedem qualquer outra pessoa.
   Travas para NUNCA alterar nada por engano (e nunca misturar os dados de duas pessoas):
     1) o banco só deixa o administrador LER os dados dos outros (testado em tests/rules);
     2) save() e as gravações do backend não fazem nada em modo leitura;
     3) todos os botões e campos que alteram dados ficam desabilitados (lockUi);
     4) antes de entrar, grava o que estava pendente do próprio administrador. */
const dlg5=el('dlg5');
const SVG='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const EYE_ON=`${SVG}<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF=`${SVG}<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const myProfile=()=>readOnly&&Viewer.real?Viewer.real.profile:profile;       // o perfil de quem está logado (não o da pessoa vista)

/* desabilita tudo que altera dados; só deixa navegar, olhar e fechar */
function lockUi(root){if(!readOnly||!root)return;
  const livre='[data-tab],[data-m],[data-modo],#per,#ysel,#csin,[data-open],[data-close],[data-na],[data-adm],[data-logout],[data-ro-ok]';
  root.querySelectorAll('input,select,textarea,button').forEach(e=>{if(!e.matches(livre)&&!e.closest('[data-tipcell]'))e.disabled=true});
  root.querySelectorAll('[draggable]').forEach(e=>{e.draggable=false});
  root.querySelectorAll('label.btn').forEach(l=>l.classList.add('off'))}

const Viewer={
  real:null,list:[],
  async openPicker(){
    dlg5.innerHTML='<div class="dh"><h3>Ver dados de um usuário</h3><button type="button" class="btn sec" data-adm-close>Fechar</button></div><div class="db"><p class="hint">Carregando…</p></div>';
    dlg5.showModal();
    try{this.list=(await backend.listProfiles()).filter(p=>p.uid!==backend.uid);this.draw('')}
    catch(e){dlg5.querySelector('.db').innerHTML=`<p class="err">Não consegui carregar a lista: ${esc(e.code||e.message)}</p>`}},
  draw(q,msg=''){const nq=normName(q||''),rows=this.list.filter(p=>!nq||normName((p.nome||'')+' '+(p.email||'')).includes(nq))
      .sort((a,b)=>normName(a.nome||a.email||'').localeCompare(normName(b.nome||b.email||'')));
    dlg5.innerHTML=`<div class="dh"><div><h3>Ver dados de um usuário</h3><div class="sub">Somente leitura: nada do que você vir aqui pode ser alterado.</div></div><button type="button" class="btn sec" data-adm-close>Fechar</button></div>
     <div class="db"><input id="admq" type="search" placeholder="🔍 Buscar por nome ou e-mail…" value="${esc(q||'')}" autocomplete="off">
      <div class="legend sub"><span class="eye on">${EYE_ON}</span> dados na nuvem (você pode ver) &nbsp; <span class="eye off">${EYE_OFF}</span> dados só no aparelho da pessoa (não existem no sistema)</div>
      <div class="ulist" role="list">${rows.map(p=>{const nuvem=p.storage!=='local';
        return `<button type="button" class="urow ${nuvem?'':'dim'}" data-adm-user="${esc(p.uid)}" role="listitem" title="${nuvem?'Dados na nuvem — clique para ver':'Dados só no aparelho — não dá para ver'}">
          <span class="eye ${nuvem?'on':'off'}">${nuvem?EYE_ON:EYE_OFF}</span>
          <span class="un"><b>${esc(p.nome||p.email||p.uid)}</b>${p.nome?`<span class="sub">${esc(p.email||'')}</span>`:''}</span></button>`}).join('')||'<p class="hint">Nenhum usuário encontrado.</p>'}</div>
      <p class="err" id="admmsg" role="alert">${esc(msg)}</p></div>`;
    const i=el('admq');if(i&&q){i.focus();i.setSelectionRange(q.length,q.length)}},
  async enter(uid){const p=this.list.find(x=>x.uid===uid);if(!p)return;
    if(p.storage==='local')return this.draw(el('admq')?.value||'',`${p.nome||p.email} guarda os dados só no aparelho dela(e). Eles não existem no sistema, então não há o que visualizar.`);
    try{
      await backend.flush();                                                 // antes de trocar, grava o que era do próprio administrador
      const st=await new FirestoreStore(backend.db,uid).read();
      if(!st)return this.draw(el('admq')?.value||'',`${p.nome||p.email} ainda não tem lançamentos.`);
      this.real={S,profile,selY,selM,tab,modo,period,catSel};
      S=st;profile=normProfile(p);viewing={uid,email:p.email,nome:p.nome};readOnly=true;modo='real';period='ano';catSel='';
      initSelection();dlg5.close();noticeClear();render()
    }catch(e){this.draw(el('admq')?.value||'',`Não consegui abrir: ${e.code||e.message}`)}},
  exit(){if(!readOnly)return;this.reset();render()},
  reset(){if(this.real){({S,profile,selY,selM,tab,modo,period,catSel}=this.real)}this.real=null;readOnly=false;viewing=null}
};
function renderRoBar(){const b=el('robar');if(!b)return;
  b.innerHTML=readOnly&&viewing?`<div class="robar" role="status"><div>${EYE_ON.replace('width="20" height="20"','width="18" height="18"')} <b>Modo somente leitura</b> — você está vendo os dados de <b>${esc(viewing.nome||viewing.email)}</b>${viewing.nome?` (${esc(viewing.email)})`:''}. Nada pode ser alterado.</div><button type="button" class="btn sm" data-adm="sair">Voltar aos meus dados</button></div>`:''}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-adm="abrir"]'))Viewer.openPicker();
  else if(e.target.closest('[data-adm="sair"]'))Viewer.exit();
  else if(e.target.closest('[data-adm-close]'))dlg5.close();
  else{const u=e.target.closest('[data-adm-user]');if(u)Viewer.enter(u.dataset.admUser)}});
document.addEventListener('input',e=>{if(e.target.id==='admq')Viewer.draw(e.target.value)});
/* última barreira: em modo leitura nenhum formulário é enviado */
document.addEventListener('submit',e=>{if(readOnly)e.preventDefault()},true);
