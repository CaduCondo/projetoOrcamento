/* Registro de erros importantes, para o administrador ver em Ajustes e corrigir depois.
   O que é guardado: tipo do erro, a mensagem técnica e detalhes como "tipo do arquivo" e "banco" — NUNCA lançamentos, valores ou textos de extrato.
   Quem guarda os dados na nuvem: o registro vai automático. Quem guarda só no aparelho: só se apertar "Avisar o administrador". */
const ErrorLog={
  enviados:0,vistos:new Set(),
  /* consentido = a própria pessoa pediu para avisar (botão) */
  async report(tipo,msg,info={},consentido=false){
    try{if(readOnly||!user)return false;if(!consentido&&!backend.autoReportErrors)return false;
      msg=String(msg||'').slice(0,500);const k=tipo+'|'+msg;if(this.vistos.has(k)||this.enviados>=20)return false;this.vistos.add(k);this.enviados++;
      await backend.logError({quando:new Date().toISOString(),tipo:String(tipo).slice(0,40),msg,info:JSON.stringify(info).slice(0,1500),env:ENV,
        tela:typeof tab==='string'?tab:'',agente:(navigator.userAgent||'').slice(0,160)});return true}
    catch{return false}}
};
/* erros inesperados do programa (bugs) */
addEventListener('error',e=>{ErrorLog.report('erro-programa',e.message,{onde:`${String(e.filename||'').split('/').pop()}:${e.lineno||''}`})});
addEventListener('unhandledrejection',e=>{const r=e.reason;ErrorLog.report('erro-programa',r?.message||r?.code||String(r),{onde:'promessa'})});
