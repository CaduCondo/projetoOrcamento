/* Janela genérica de escolha (substitui confirm() quando há mais de duas opções, e funciona bem no celular).
   askChoice({titulo, texto (HTML nosso), opcoes:[{id, label, cls}]}) devolve o id escolhido, ou null se fechou/cancelou. */
const dlg4=el('dlg4');
let choiceResolve=null;
function askChoice({titulo,texto,opcoes}){
  return new Promise(res=>{choiceResolve=res;
    dlg4.innerHTML=`<div class="dh"><h3>${esc(titulo)}</h3></div><div class="db"><div class="txt">${texto}</div></div>
      <div class="df stack">${opcoes.map(o=>`<button type="button" class="btn ${o.cls||'sec'}" data-ch="${o.id??''}">${esc(o.label)}</button>`).join('')}</div>`;
    dlg4.showModal()})}
const confirmAsync=(texto,sim='Sim',nao='Cancelar')=>askChoice({titulo:'Confirmar',texto:esc(texto),opcoes:[{id:'sim',label:sim,cls:''},{id:'',label:nao,cls:'dan'}]}).then(r=>r==='sim');
dlg4.addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(!b)return;const id=b.dataset.ch||null;const r=choiceResolve;choiceResolve=null;dlg4.close();r&&r(id)});
dlg4.addEventListener('close',()=>{const r=choiceResolve;choiceResolve=null;r&&r(null)});
