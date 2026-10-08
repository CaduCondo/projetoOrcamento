/* Tela do perfil (cadastro): foto, nome, nascimento, profissão, senha e onde guardar os dados. */
const FOTO_PX=256;
const Photo={
  /* reduz a imagem para um quadrado pequeno (JPEG) e devolve como texto (data URL) */
  fromFile(file){return new Promise((ok,no)=>{const fr=new FileReader();
    fr.onerror=()=>no(new Error('Não consegui ler o arquivo.'));
    fr.onload=()=>{const img=new Image();img.onerror=()=>no(new Error('Não consegui abrir essa imagem.'));
      img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement('canvas');c.width=c.height=FOTO_PX;
        c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,FOTO_PX,FOTO_PX);ok(c.toDataURL('image/jpeg',0.8))};
      img.src=fr.result};
    fr.readAsDataURL(file)})}};
const avatar=(p,email,cls='')=>p&&p.foto?`<img class="avatar ${cls}" src="${p.foto}" alt="Foto de perfil">`:`<span class="avatar ${cls}" aria-hidden="true">${esc(profileInitial(p||{},email))}</span>`;

const TXT_NUVEM='Seus dados ficam guardados com segurança na sua conta e aparecem em qualquer aparelho onde você entrar com seu e-mail e senha. Só você e o administrador do sistema (que apenas visualiza, nunca altera, e só para dar suporte) conseguem vê-los.';
const TXT_LOCAL='Seus lançamentos não vão para a nuvem: ficam num arquivo CSV (abre no Excel) neste aparelho. Ninguém do sistema consegue ver esses dados — guardamos só o seu cadastro (e-mail, nome e esta escolha). Você só vê seus dados nos aparelhos onde tiver o arquivo; para usar em outro lugar, leve o arquivo e carregue em Ajustes → Carregar arquivo (.csv).';

function storageCard(){const local=profile.storage==='local',cloud=profile.storage==='cloud',fs=DeviceStore.fsSupported();   // sem escolha ainda: nenhuma das duas fica marcada
  return `<div class="panel full"><h2>Onde guardar meus dados</h2><div class="pbody">
    ${profile.storage?'':`<p class="warnbox">Você ainda não escolheu. Por enquanto seus dados estão guardados <b>na nuvem</b>.</p>`}
    <div class="stg">
     <label class="stgopt ${cloud?'on':''}"><input type="radio" name="stg" value="cloud" ${cloud?'checked':''}>
      <div><b>No banco de dados (nuvem)</b> <span class="info" title="${esc(TXT_NUVEM)}">ⓘ</span>
       <p>Seus dados ficam guardados com segurança na sua conta e aparecem em <b>qualquer aparelho</b> onde você entrar com seu e-mail e senha.</p>
       <p class="sub">Protegidos por regras de segurança: <b>só você</b> e o <b>administrador do sistema</b> conseguem vê-los — e o administrador apenas visualiza (nunca altera), só para dar suporte.</p></div></label>
     <label class="stgopt ${local?'on':''}"><input type="radio" name="stg" value="local" ${local?'checked':''}>
      <div><b>Neste aparelho (arquivo CSV)</b> <span class="info" title="${esc(TXT_LOCAL)}">ⓘ</span>
       <p>Seus lançamentos <b>não vão para a nuvem</b>: ficam num arquivo CSV (abre no Excel) neste aparelho. <b>Ninguém do sistema</b> consegue ver esses dados — guardamos só o seu cadastro (e-mail, nome e esta escolha).</p>
       <p class="sub">Atenção: você só vê seus dados nos aparelhos onde tiver o arquivo. Para usar em outro lugar, leve o arquivo e carregue em <b>Ajustes → Carregar arquivo (.csv)</b>. Se perder o arquivo e este aparelho, não há como recuperar.</p></div></label>
    </div>
    ${local?`<div class="devbox"><div id="dvstatus" class="sub">Verificando…</div>
      <div class="row">${fs?'<button type="button" class="btn sec sm" data-dv="pick">Escolher / trocar o arquivo (computador)</button>':''}
       <button type="button" class="btn sec sm" data-dv="download">Baixar CSV agora</button>
       <label class="btn sec sm">Carregar arquivo (.csv)<input type="file" id="csvin" accept=".csv,text/csv" hidden></label></div>
      <p class="hint">${fs?'No computador (Chrome ou Edge) você escolhe onde o arquivo fica e o sistema lembra. O navegador pode pedir sua autorização ao abrir de novo.':'Neste navegador não dá para escolher a pasta do arquivo: o sistema guarda uma cópia aqui e você usa “Baixar CSV” para levar seus dados para outro aparelho.'}</p></div>`:''}
  </div></div>`}

function vPerfil(){const p=profile,mail=viewing?viewing.email:user,hoje=new Date().toISOString().slice(0,10);
  return `<div class="pgrid">
   <div class="panel"><h2>Meu cadastro</h2><div class="pbody">
    <div class="prow-photo">${avatar(p,mail,'lg')}<div class="col">
      <label class="btn sec sm">Escolher foto<input type="file" id="pff" accept="image/*" hidden></label>
      ${p.foto?'<button type="button" class="btn dan sm" data-pf="foto-remover">Remover foto</button>':''}
      <span class="hint">A foto aparece no topo, no lugar do e-mail.</span></div></div>
    <label class="f">E-mail<input id="pfe" value="${esc(mail)}" readonly></label>
    <label class="f">Nome<input id="pfn" maxlength="80" autocomplete="name" value="${esc(p.nome)}" placeholder="Como você quer ser chamado"></label>
    <label class="f">Data de nascimento<input id="pfb" type="date" max="${hoje}" value="${esc(p.nascimento)}"></label>
    <label class="f">Profissão<input id="pfp" maxlength="60" value="${esc(p.profissao)}" placeholder="ex.: analista de sistemas"></label>
    <div class="err" id="pferr" role="alert"></div><div class="okmsg" id="pfok"></div>
    <button type="button" class="btn" data-pf="salvar">Salvar cadastro</button>
   </div></div>
   <div class="panel"><h2>Trocar senha</h2><div class="pbody">
    <label class="f">Senha atual<input id="pwa" type="password" autocomplete="current-password"></label>
    <label class="f">Nova senha<input id="pwn" type="password" autocomplete="new-password"></label>
    <label class="f">Repita a nova senha<input id="pwc" type="password" autocomplete="new-password"></label>
    ${PasswordRules.html('pwr-perfil')}
    <div class="err" id="pwerr" role="alert"></div><div class="okmsg" id="pwok"></div>
    <button type="button" class="btn" data-pw="trocar" disabled>Trocar senha</button>
   </div></div>
   ${backend.storageChoice?storageCard():`<div class="panel full"><h2>Onde ficam meus dados</h2><div class="pbody"><p class="hint">Neste modo (sem nuvem) seus dados ficam sempre neste navegador. Use Ajustes para baixar o arquivo e levar para outro lugar.</p></div></div>`}
  </div>`}

/* texto de "como está o arquivo" na caixa do modo aparelho */
async function fillDeviceStatus(){const box=el('dvstatus'),ds=backend.store;if(!box||readOnly||!(ds instanceof DeviceStore))return;
  const nome=await ds.fileName(),copia=ds.readCopy(),quando=copia?new Date(copia.at).toLocaleString('pt-BR'):null;
  box.innerHTML=(nome?`Arquivo escolhido: <b>${esc(nome)}</b> — ${ds.fileSynced?'conectado ✓':'precisa da sua autorização para abrir (use o aviso no topo ou “Escolher / trocar o arquivo”)'}.`
    :DeviceStore.fsSupported()?'Nenhum arquivo escolhido ainda: por enquanto os dados ficam numa cópia neste navegador. Clique em “Escolher / trocar o arquivo”.':'Os dados ficam numa cópia neste navegador (e você baixa o CSV quando quiser).')
    +(quando?` Última gravação neste aparelho: ${quando}.`:'')}

/* ---- eventos da tela de perfil ---- */
const showMsg=(id,t)=>{const e=el(id);if(e)e.textContent=t};
async function saveProfileForm(){
  const p=cleanProfile({...profile,nome:el('pfn').value,nascimento:el('pfb').value,profissao:el('pfp').value});
  const err=validateProfile(p);showMsg('pfok','');if(err)return showMsg('pferr',err);showMsg('pferr','');
  try{profile=p;await backend.saveProfile(profile)}catch(e){return showMsg('pferr','Não consegui salvar: '+(e.code||e.message))}
  if(!profilePending(profile,backend.isCloud))noticeClear('perfil');
  chrome();showMsg('pfok','Cadastro salvo ✓')}
async function changePasswordForm(){
  const a=el('pwa').value,n=el('pwn').value,c=el('pwc').value,err=validateNewPassword(a,n,c);showMsg('pwok','');
  if(err)return showMsg('pwerr',err);showMsg('pwerr','');
  try{await backend.changePassword(a,n)}catch(e){return showMsg('pwerr',e.message)}
  el('pwa').value=el('pwn').value=el('pwc').value='';syncPasswordUi();showMsg('pwok','Senha alterada ✓')}
async function setPhoto(file){
  try{const url=await Photo.fromFile(file),p={...profile,foto:url},err=validateProfile(p);if(err)return showMsg('pferr',err);
    profile=p;await backend.saveProfile(profile);render()}catch(e){showMsg('pferr',e.message)}}
app.addEventListener('click',async e=>{const b=e.target.closest('[data-pf],[data-pw],[data-dv]');if(!b)return;
  if(b.dataset.pf==='salvar')saveProfileForm();
  else if(b.dataset.pf==='foto-remover'){profile={...profile,foto:''};await backend.saveProfile(profile);render()}
  else if(b.dataset.pw==='trocar')changePasswordForm();
  else if(b.dataset.dv==='pick'){const ds=backend.store;if(ds instanceof DeviceStore&&await ds.pickFile()){await backend.flush();await ds.write(S);noticeClear('arquivo');noticeClear('permissao');fillDeviceStatus();snackbar('Arquivo escolhido. A partir de agora o sistema grava nele a cada mudança.')}}
  else if(b.dataset.dv==='download'){const ds=backend.store;(ds instanceof DeviceStore?ds:new DeviceStore('x')).downloadCsv(S)}});
app.addEventListener('change',e=>{const t=e.target;
  if(t.id==='pff'&&t.files[0])setPhoto(t.files[0]);
  else if(t.name==='stg')StorageSwitch.request(t.value);
  else if(t.id==='csvin'&&t.files[0])importCsvFile(t.files[0],t)});
