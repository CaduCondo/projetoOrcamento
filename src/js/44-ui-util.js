/* Utilidades de tela: baixar arquivo e ler arquivo JSON escolhido pelo usuário */
const download=(name,content,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click()};
/* lê o arquivo, converte de JSON e confere com isValid; falha (rejeita) se algo estiver errado */
const readJsonFile=(file,isValid)=>file.text().then(x=>{const o=JSON.parse(x);if(!isValid(o))throw new Error('inválido');return o});
/* aviso temporário com um botão de ação (ex.: "Desfazer") */
let snackTimer;
function snackbar(msg,label,onClick,ms=9000){const s=el('snack');s.innerHTML=`<span>${esc(msg)}</span>${label?`<button type="button" class="btn sec sm">${esc(label)}</button>`:''}`;s.hidden=false;
  if(label)s.querySelector('button').onclick=()=>{s.hidden=true;clearTimeout(snackTimer);onClick()};
  clearTimeout(snackTimer);snackTimer=setTimeout(()=>{s.hidden=true},ms)}
