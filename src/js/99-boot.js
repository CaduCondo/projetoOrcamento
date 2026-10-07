/* Inicialização: mostra a faixa de teste no ambiente DEV e deixa o backend decidir o que exibir (login ou dados) */
if(ENV==='dev')document.getElementById('envbar').hidden=false;
backend.boot();
/* PWA: permite instalar na tela inicial e abrir mesmo com internet ruim (só em sites de verdade, não no arquivo local) */
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
