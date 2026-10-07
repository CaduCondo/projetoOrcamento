/* Firebase SIMULADO (Auth + Firestore, API "compat"), na memória. O objeto db pode ser compartilhado entre janelas
   para simular "fechar e abrir o app de novo" ou "outro aparelho". */
function createDb() { return { docs: {}, users: {}, current: null, commits: 0, fail: false, lastOps: [], resetEmails: [] }; }

function install(w, db) {
  let listener = null;
  const notify = u => setTimeout(() => listener && listener(u ? { uid: u.uid, email: u.email } : null), 5);
  const auth = {
    onAuthStateChanged(f) { listener = f; notify(db.current); },
    async createUserWithEmailAndPassword(e, p) {
      if (db.users[e]) throw { code: 'auth/email-already-in-use' };
      if (p.length < 6) throw { code: 'auth/weak-password' };
      const u = { uid: 'uid' + (Object.keys(db.users).length + 1), email: e, pw: p };
      db.users[e] = u; db.current = u; notify(u);
    },
    async signInWithEmailAndPassword(e, p) {
      const u = db.users[e]; if (!u || u.pw !== p) throw { code: 'auth/invalid-credential' };
      db.current = u; notify(u);
    },
    async signOut() { db.current = null; notify(null); },
    async sendPasswordResetEmail(e) { db.resetEmails.push(e); },
  };
  const ref = p => ({
    path: p,
    collection: n => ref(p + '/' + n),
    doc: n => ref(p + '/' + n),
    async get() {
      if (p.split('/').length % 2 === 0) { const d = db.docs[p]; return { exists: d !== undefined, id: p.split('/').pop(), data: () => d }; }
      const depth = p.split('/').length + 1;
      const ks = Object.keys(db.docs).filter(k => k.startsWith(p + '/') && k.split('/').length === depth);
      return { forEach: f => ks.forEach(k => f({ id: k.split('/').pop(), data: () => db.docs[k] })) };
    },
  });
  const firestore = {
    collection: n => ref(n),
    batch() {
      const ops = [];
      return {
        set: (r, d) => ops.push(['set', r.path, d]),
        delete: r => ops.push(['delete', r.path]),
        async commit() {
          if (db.fail) throw { code: 'unavailable' };
          for (const [t, p, d] of ops) { if (t === 'set') db.docs[p] = JSON.parse(JSON.stringify(d)); else delete db.docs[p]; }
          db.commits++; db.lastOps = ops.map(o => o[0] + ':' + o[1]);
        },
      };
    },
  };
  w.firebase = { initializeApp() {}, auth: () => auth, firestore: () => firestore };
}

module.exports = { createDb, install };
