/* Utilidades de tela: baixar arquivo e ler arquivo JSON escolhido pelo usuário */
const download=(name,content,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click()};
/* lê o arquivo, converte de JSON e confere com isValid; falha (rejeita) se algo estiver errado */
const readJsonFile=(file,isValid)=>file.text().then(x=>{const o=JSON.parse(x);if(!isValid(o))throw new Error('inválido');return o});
