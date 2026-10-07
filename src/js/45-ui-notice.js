/* Avisos no topo da tela (faixa colorida): completar o cadastro, arquivo não encontrado, permissão do arquivo...
   Um aviso por vez. As ações dos botões são tratadas aqui (data-na="..."). */
let notice=null;

const NOTICES={
  perfil:()=>({cls:'info',acoes:[['Abrir meu cadastro','perfil'],['Agora não','dismiss']],
    html:`<b>Complete seu cadastro.</b> Falta preencher seu nome, data de nascimento e profissão${backend.isCloud&&profile&&!profile.storage?' e escolher onde guardar seus dados':''}. É rápido.`}),
  naoachou:()=>({cls:'warn',acoes:[['Ir para Ajustes','ajustes'],['Entendi','dismiss']],
    html:`<b>Não encontramos seus dados neste aparelho.</b> Você escolheu guardar seus dados em arquivo, e o arquivo não está aqui — talvez você o tenha salvo em outro aparelho (computador ou celular).
      <br>Para carregar agora: <b>1)</b> abra <b>Ajustes</b>, <b>2)</b> clique em <b>Carregar arquivo (.csv)</b>, <b>3)</b> escolha o arquivo. Pronto!`}),
  regras:()=>({cls:'warn',acoes:[['Entendi','dismiss']],
    html:`<b>As regras de segurança do banco estão desatualizadas.</b> Você consegue usar o sistema, mas o seu cadastro (nome, foto e a escolha de onde guardar os dados) ainda não pode ser salvo. Quem administra o sistema precisa publicar o arquivo <b>firestore.rules</b> no Firebase (veja docs/PASSO-A-PASSO.md, procedimento 2).`}),
  permissao:()=>({cls:'warn',acoes:[['Permitir acesso ao arquivo','autorizar'],['Depois','dismiss']],
    html:`<b>O navegador precisa da sua autorização</b> para ler e gravar o seu arquivo de dados. Enquanto isso, seus lançamentos ficam guardados nesta cópia do navegador.`}),
  'arquivo-nao-lido':()=>({cls:'warn',acoes:[['Permitir e carregar o arquivo','autorizar'],['Depois','dismiss']],
    html:`<b>Seu arquivo ainda não foi carregado nesta sessão.</b> Para não apagar o que já está nele, não gravei nada nele. Clique para carregar.`}),
  'arquivo-erro':()=>({cls:'warn',acoes:[['Baixar CSV agora','baixar'],['Entendi','dismiss']],
    html:`<b>Não consegui gravar no arquivo.</b> Seus dados estão guardados nesta cópia do navegador. Baixe o CSV para garantir uma cópia.`}),
  'erro-arquivo':()=>({cls:'warn',acoes:[['Ir para Ajustes','ajustes'],['Entendi','dismiss']],
    html:`<b>Não consegui ler o seu arquivo.</b> ${esc(notice?.extra||'')} Você pode carregar outro arquivo em <b>Ajustes → Carregar arquivo (.csv)</b>.`}),
};
function setNotice(tipo,extra){notice={tipo,extra};renderNotice()}
/* limpa o aviso atual (ou só se o tipo começar com prefix) */
function noticeClear(prefix){if(!notice||(prefix&&!notice.tipo.startsWith(prefix)))return;notice=null;renderNotice()}
/* converte o resultado de DeviceStore.load() no aviso certo */
function noticeFromLoad(r){
  if(r.aviso==='naoachou')setNotice('naoachou');
  else if(r.aviso==='permissao')setNotice('permissao');
  else if(r.aviso==='erro-arquivo')setNotice('erro-arquivo',r.detalhe)}
function renderNotice(){const box=el('notice');if(!box)return;
  if(!notice||!user||readOnly||!NOTICES[notice.tipo]){box.innerHTML='';return}
  const n=NOTICES[notice.tipo]();
  box.innerHTML=`<div class="notice ${n.cls}" role="status"><div class="nt">${n.html}</div><div class="na">${n.acoes.map(([l,a],i)=>`<button type="button" class="btn ${i?'sec':''} sm" data-na="${a}">${esc(l)}</button>`).join('')}</div></div>`}

/* carrega o arquivo escolhido depois de a pessoa autorizar (e só então libera a gravação nele).
   Vale sempre o dado MAIS NOVO: se a cópia deste aparelho é mais nova, mantém os dados em uso e atualiza o arquivo;
   se o arquivo é mais novo (alguém o alterou depois), carrega o arquivo — perguntando antes se houver o que perder. */
async function authorizeFile(){const ds=backend.store;if(!(ds instanceof DeviceStore))return;
  if(!(await ds.authorize()))return;
  const r=await ds.load();
  if(r.fonte==='arquivo'){
    if(!Object.keys(S.data).length||await confirmAsync('O arquivo é mais novo que os dados deste aparelho. Carregar o arquivo? O que você digitou desde que entrou será substituído.')){S=r.state;initSelection()}
    else return}
  else if(!r.state){noticeFromLoad(r);render();return}
  if(ds.fileSynced)await ds.write(S);
  noticeClear('permissao');noticeClear('arquivo');render();snackbar('Arquivo conectado.')}

document.addEventListener('click',e=>{const b=e.target.closest?.('[data-na]');if(!b)return;const a=b.dataset.na;
  if(a==='dismiss')noticeClear();
  else if(a==='perfil'){noticeClear();tab='perfil';render()}
  else if(a==='ajustes'){noticeClear();tab='aj';render()}
  else if(a==='autorizar')authorizeFile();
  else if(a==='baixar'){const ds=backend.store;(ds instanceof DeviceStore?ds:new DeviceStore('x')).downloadCsv(S)}});
