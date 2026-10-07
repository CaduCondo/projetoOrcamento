/* Escolha do backend: nuvem quando há configuração do Firebase (e o SDK carregou); senão, local. */
const backend=(FBCFG&&typeof firebase!=='undefined')?new CloudBackend():new LocalBackend();
