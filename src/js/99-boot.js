/* Inicialização */
/* ---------- BOOT ---------- */
(function(){if(CLOUD){document.getElementById('app').innerHTML='<p class="hint" style="padding:60px 0;text-align:center">Carregando…</p>';
  fbAuth.onAuthStateChanged(u=>{if(u){if(!S||uid!==u.uid)cloudStart(u)}else{uid=null;user=null;S=null;render()}});return}
  let e=null;try{e=sessionStorage.getItem('orc-sess')||localStorage.getItem('orc-sess')}catch{}
  if(e&&users()[e])startSession(e,!!localStorage.getItem('orc-sess'));else render()})();
