/* Inicialização: mostra a faixa de teste no ambiente DEV e deixa o backend decidir o que exibir (login ou dados) */
if(ENV==='dev')document.getElementById('envbar').hidden=false;
backend.boot();
