/* Trocar de nuvem para aparelho (e de volta) com segurança: primeiro garante o destino, só depois muda a escolha.
   Regra de transparência: quem escolhe "no aparelho" NÃO tem lançamentos no banco. Ao trocar, a pessoa decide se a cópia antiga da nuvem é apagada. */
const StorageSwitch={
  async request(mode){
    const atual=profile.storage||'cloud';
    if(mode===atual&&profile.storage)return;
    if(mode==='local')await this.toLocal();else await this.toCloud();
    render()},

  async toLocal(){
    const ch=await askChoice({titulo:'Guardar seus dados só neste aparelho?',
      texto:`<p>Vamos criar agora o arquivo CSV com todos os seus dados. Depois disso, seus lançamentos <b>deixam de ser enviados para a nuvem</b>.</p>
        <p>O que fazer com a cópia que já está na nuvem?</p>`,
      opcoes:[{id:'apagar',label:'Apagar minha cópia da nuvem (recomendado)',cls:''},
              {id:'manter',label:'Manter a cópia antiga (ela não será mais atualizada e o administrador ainda poderá vê-la)',cls:'sec'},
              {id:'',label:'Cancelar',cls:'dan'}]});
    if(!ch)return;
    const ds=new DeviceStore(backend.uid);
    let escolheu=false;
    if(DeviceStore.fsSupported()){try{escolheu=await ds.pickFile()}catch(e){console.error(e)}}    // precisa vir logo depois do clique
    const r=await ds.write(S);
    if(!r.copia){alert('Não consegui guardar os dados neste aparelho (sem espaço?). Nada foi alterado: seus dados continuam na nuvem. Baixe o CSV e tente de novo.');return}
    profile.storage='local';
    try{await backend.saveProfile(profile)}catch(e){profile.storage=null;alert('Não consegui salvar sua escolha: '+(e.code||e.message));return}
    if(ch==='apagar'){try{await new FirestoreStore(backend.db,backend.uid).deleteAll()}
      catch(e){alert('Seus dados agora ficam só neste aparelho, mas não consegui apagar a cópia da nuvem agora: '+(e.code||e.message)+'. Tente de novo mais tarde em Perfil.')}}
    backend.store=ds;noticeClear();
    snackbar(escolheu?'Pronto! Seus dados agora ficam só neste aparelho, no arquivo que você escolheu.':'Pronto! Seus dados agora ficam só neste aparelho (cópia no navegador). Use “Baixar CSV” para guardar um arquivo.')},

  async toCloud(){
    const ch=await askChoice({titulo:'Guardar seus dados na nuvem?',
      texto:`<p>Seus lançamentos serão enviados para a sua conta e ficarão disponíveis <b>em qualquer aparelho</b> onde você entrar.</p>
        <p>Eles ficam protegidos por regras de segurança: só você e o administrador do sistema (apenas para visualizar, nunca alterar, e só para suporte) conseguem vê-los.</p>`,
      opcoes:[{id:'enviar',label:'Sim, enviar para a nuvem',cls:''},{id:'',label:'Cancelar',cls:'dan'}]});
    if(!ch)return;
    const jaNaNuvem=backend.store instanceof FirestoreStore,fs=jaNaNuvem?backend.store:new FirestoreStore(backend.db,backend.uid);   // quem ainda não tinha escolhido já está na nuvem
    if(!jaNaNuvem){try{await fs.read();await fs.write(S)}catch(e){alert('Não consegui enviar para a nuvem: '+(e.code||e.message)+'. Nada foi alterado.');return}}
    profile.storage='cloud';
    try{await backend.saveProfile(profile)}catch(e){alert('Os dados foram enviados, mas não consegui salvar sua escolha: '+(e.code||e.message));return}
    backend.store=fs;noticeClear();
    snackbar('Pronto! Seus dados agora ficam na nuvem e acompanham você em qualquer aparelho.')}
};
