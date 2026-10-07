/* Armazém "NA NUVEM": lançamentos no Firestore (users/{uid}/meta/main e users/{uid}/years/{ano}).
   Só o administrador (e a própria pessoa) lê; as regras do banco impedem qualquer outra pessoa. */
class FirestoreStore {
  constructor(db,uid){this.db=db;this.uid=uid;this.snap={meta:'',years:{}}}
  userDoc(){return this.db.collection('users').doc(this.uid)}

  /* lê tudo; devolve o estado ou null se esta pessoa ainda não tem dados na nuvem */
  async read(){
    const base=this.userDoc(),[m,ys]=await Promise.all([base.collection('meta').doc('main').get(),base.collection('years').get()]);
    if(!m.exists){this.snap={meta:'',years:{}};return null}
    const yj={};ys.forEach(d=>yj[d.id]=d.data().json);
    const st=deserializeState(m.data().json,yj);this.snap=serializeState(st);return st}

  /* grava só os documentos que mudaram. Devolve quantos documentos mudaram (0 = nada a fazer) */
  async write(state){
    const base=this.userDoc(),batch=this.db.batch(),cur=serializeState(state);let n=0;
    if(cur.meta!==this.snap.meta){batch.set(base.collection('meta').doc('main'),{json:cur.meta});n++}
    for(const y of Object.keys(cur.years))if(this.snap.years[y]!==cur.years[y]){batch.set(base.collection('years').doc(y),{json:cur.years[y]});n++}
    for(const y of Object.keys(this.snap.years))if(!(y in cur.years)){batch.delete(base.collection('years').doc(y));n++}
    if(!n)return 0;
    await batch.commit();this.snap=cur;return n}

  /* apaga TODOS os dados desta pessoa na nuvem (usado quando ela muda para "só no aparelho" e pede para apagar) */
  async deleteAll(){
    const base=this.userDoc(),ys=await base.collection('years').get(),batch=this.db.batch();
    ys.forEach(d=>batch.delete(base.collection('years').doc(d.id)));batch.delete(base.collection('meta').doc('main'));
    await batch.commit();this.snap={meta:'',years:{}}}
}
