/* Armazenamento: o aviso "Salvo" e os pontos de entrada save / logout / doLogin.
   O trabalho de verdade é feito pelo "backend" escolhido em 36-backend.js
   (LocalBackend = neste navegador, CloudBackend = Firebase). */
let tt;
function status(t,err){const el=document.getElementById('toast');el.textContent=t;el.style.background=err?'#c2410c':'';el.style.color=err?'#fff':'';
  el.classList.add('on');clearTimeout(tt);if(!err&&t!=='Salvando…')tt=setTimeout(()=>el.classList.remove('on'),900)}
const save=()=>{if(readOnly)return;backend.save()};   // em modo leitura nada é gravado
const logout=()=>backend.logout();
const doLogin=()=>backend.login();
