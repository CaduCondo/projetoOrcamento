/* Armazém "NO APARELHO": os lançamentos ficam só aqui, nunca vão para o banco.
   - Cópia automática no navegador (localStorage): carrega sozinha ao entrar neste aparelho.
   - Arquivo CSV de verdade (computador com Chrome/Edge): a pessoa escolhe o arquivo uma vez; o app grava nele a cada mudança e lembra qual é.
     Celular/Safari/Firefox não permitem isso: ali valem a cópia no navegador e os botões "Baixar CSV" / "Carregar arquivo".
   Trava de segurança: se existe um arquivo escolhido mas ainda não foi lido com sucesso, o app NÃO grava nele (para não apagar o que já existe). */

/* guarda a "alça" do arquivo escolhido (só o IndexedDB consegue guardar isso). Sem IndexedDB: só na memória. */
function makeHandleStore(){
  if(typeof indexedDB==='undefined'){const m=new Map();return{get:async k=>m.get(k)||null,set:async(k,v)=>{m.set(k,v)},del:async k=>{m.delete(k)}}}
  const open=()=>new Promise((ok,no)=>{const r=indexedDB.open('orc-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  const run=async(mode,fn)=>{const db=await open();return new Promise((ok,no)=>{const t=db.transaction('h',mode),req=fn(t.objectStore('h'));t.oncomplete=()=>ok(req&&req.result);t.onerror=()=>no(t.error)})};
  return{get:k=>run('readonly',s=>s.get(k)).then(v=>v||null),set:(k,v)=>run('readwrite',s=>s.put(v,k)),del:k=>run('readwrite',s=>s.delete(k))}}

class DeviceStore {
  static handles=makeHandleStore();
  static fsSupported(){return typeof window.showSaveFilePicker==='function'}
  constructor(uid){this.uid=uid;this.fileSynced=false}

  /* ---- cópia no navegador ---- */
  copyKey(){return 'orc-device-'+this.uid}
  readCopy(){try{const o=JSON.parse(localStorage.getItem(this.copyKey()));return o&&o.csv?o:null}catch{return null}}
  writeCopy(csv,at){localStorage.setItem(this.copyKey(),JSON.stringify({csv,at}))}
  clearCopy(){try{localStorage.removeItem(this.copyKey())}catch{}}

  /* ---- arquivo escolhido (computador) ---- */
  async handle(){try{return await DeviceStore.handles.get(this.uid)}catch{return null}}
  async fileName(){return (await this.handle())?.name||null}
  async permission(h,ask){if(!h.queryPermission)return'granted';let p=await h.queryPermission({mode:'readwrite'});if(p!=='granted'&&ask)p=await h.requestPermission({mode:'readwrite'});return p}
  /* abre a janela "Salvar como" do navegador; precisa ser chamado logo depois de um clique. Devolve true se escolheu. */
  async pickFile(){
    if(!DeviceStore.fsSupported())return false;
    try{const h=await window.showSaveFilePicker({suggestedName:'meu-orcamento.csv',types:[{description:'Planilha CSV (abre no Excel)',accept:{'text/csv':['.csv']}}]});
      await DeviceStore.handles.set(this.uid,h);this.fileSynced=true;return true}
    catch(e){if(e&&e.name==='AbortError')return false;throw e}}
  async forgetFile(){await DeviceStore.handles.del(this.uid);this.fileSynced=false}
  /* a pessoa autorizou o acesso ao arquivo escolhido antes? (precisa de um clique) */
  async authorize(){const h=await this.handle();return h?(await this.permission(h,true))==='granted':false}

  /* ---- ler ---- Devolve {state, atualizadoEm, fonte:'arquivo'|'copia'|null, aviso:null|'permissao'|'naoachou'|'erro-arquivo', detalhe} */
  async load(){
    const copy=this.readCopy(),h=await this.handle();let doArquivo=null,aviso=null,detalhe='';
    if(h){const p=await this.permission(h,false);
      if(p==='granted'){try{doArquivo=csvToState(await (await h.getFile()).text());this.fileSynced=true}catch(e){aviso='erro-arquivo';detalhe=e.message}}
      else aviso='permissao'}
    let daCopia=null;if(copy){try{daCopia=csvToState(copy.csv)}catch{}}
    const melhor=[doArquivo&&{...doArquivo,fonte:'arquivo'},daCopia&&{...daCopia,fonte:'copia'}].filter(Boolean)
      .sort((a,b)=>String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)))[0];
    if(melhor)return{state:melhor.state,atualizadoEm:melhor.atualizadoEm,fonte:melhor.fonte,aviso,detalhe};
    return{state:null,atualizadoEm:null,fonte:null,aviso:aviso||'naoachou',detalhe}}

  /* ---- gravar (nunca toca no banco). Devolve {copia:boolean, arquivo:'ok'|'sem-arquivo'|'permissao'|'nao-lido'|'erro'} ---- */
  async write(state){
    const at=new Date().toISOString(),csv=csvFileText(state,at);let copia=true,arquivo='sem-arquivo';
    try{this.writeCopy(csv,at)}catch{copia=false}
    const h=await this.handle();
    if(h){
      if(!this.fileSynced){arquivo=(await this.permission(h,false))==='granted'?'nao-lido':'permissao'}   // sem permissão: o aviso certo é o de autorização
      else{const p=await this.permission(h,false);
        if(p!=='granted')arquivo='permissao';
        else{try{const w=await h.createWritable();await w.write(csv);await w.close();arquivo='ok'}catch{arquivo='erro'}}}}
    return{copia,arquivo}}

  /* baixar o CSV (celular e qualquer navegador) */
  downloadCsv(state){download(`meu-orcamento-${new Date().toISOString().slice(0,10)}.csv`,csvFileText(state),'text/csv;charset=utf-8')}
}
