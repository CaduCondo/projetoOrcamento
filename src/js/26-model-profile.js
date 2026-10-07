/* Perfil (cadastro) do usuário: nome, nascimento, profissão, foto e onde guardar os dados.
   storage: null (ainda não escolheu; por enquanto os dados ficam na nuvem) · 'cloud' (banco de dados) · 'local' (arquivo no aparelho) */
const MAX_LEMBRETES=3;                       // quantas vezes lembrar de completar o cadastro
const MAX_FOTO=120000;                       // tamanho máximo da foto (texto) guardada no cadastro
let profile=null;                            // perfil de quem está logado

const defaultProfile=()=>({nome:'',nascimento:'',profissao:'',foto:'',storage:null,lembretes:0,criadoEm:null});
const normProfile=p=>({...defaultProfile(),...(p||{})});
const profileComplete=p=>!!(p.nome&&p.nascimento&&p.profissao);
/* falta preencher o cadastro ou escolher onde guardar os dados */
const profilePending=(p,cloud=true)=>!profileComplete(p)||(cloud&&!p.storage);   // sem nuvem não há o que escolher
/* o lembrete aparece nos primeiros logins, e só enquanto houver pendência */
const shouldRemind=(p,cloud=true)=>profilePending(p,cloud)&&p.lembretes<=MAX_LEMBRETES;
/* o dado fica na nuvem? (quem ainda não escolheu usa a nuvem, como sempre foi) */
const storesInCloud=p=>p.storage!=='local';
const profileInitial=(p,email)=>String(p.nome||email||'?').trim().charAt(0).toUpperCase()||'?';
const profileLabel=(p,email)=>p.nome?p.nome.trim().split(/\s+/)[0]:email;

/* devolve a mensagem de erro (texto) ou null */
function validateProfile(p,hoje=new Date()){
  const nome=(p.nome||'').trim(),prof=(p.profissao||'').trim();
  if(nome.length>80)return'O nome pode ter até 80 letras.';
  if(prof.length>60)return'A profissão pode ter até 60 letras.';
  if(p.nascimento){const d=new Date(p.nascimento+'T00:00:00');
    if(isNaN(d)||!/^\d{4}-\d{2}-\d{2}$/.test(p.nascimento))return'Data de nascimento inválida.';
    if(d>hoje)return'A data de nascimento não pode ser no futuro.';
    if(d.getFullYear()<1900)return'Data de nascimento inválida.'}
  if(p.foto&&p.foto.length>MAX_FOTO)return'A foto ficou grande demais. Escolha outra imagem.';
  return null}
const cleanProfile=p=>({...p,nome:(p.nome||'').trim().replace(/\s+/g,' '),profissao:(p.profissao||'').trim().replace(/\s+/g,' ')});

/* validação de nova senha (exibida na tela de perfil) */
function validateNewPassword(atual,nova,confirma){
  if(!atual)return'Digite sua senha atual.';
  if((nova||'').length<6)return'A nova senha precisa ter ao menos 6 caracteres.';
  if(nova!==confirma)return'A confirmação não confere com a nova senha.';
  if(nova===atual)return'A nova senha precisa ser diferente da atual.';
  return null}
