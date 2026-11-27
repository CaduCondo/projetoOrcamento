/* Olhar o banco por fora do app (emulador do Firestore, sem passar pelas regras): serve para provar o que ficou GUARDADO de verdade. */
const FS = 'http://127.0.0.1:8080/v1/projects/demo-orcamento/databases/(default)/documents';
const AUTH = { Authorization: 'Bearer owner' };

async function lerDoc(caminho) {
  const r = await fetch(`${FS}/${caminho}`, { headers: AUTH });
  return r.ok ? r.json() : null;
}
async function listar(caminho) {
  const r = await fetch(`${FS}/${caminho}`, { headers: AUTH });
  const j = r.ok ? await r.json() : {};
  return j.documents || [];
}
/* o administrador só existe se alguém criar admins/{uid} à mão no console: aqui fazemos o mesmo, pelo lado de fora */
async function virarAdministrador(uid) {
  const r = await fetch(`${FS}/admins/${uid}`, { method: 'PATCH', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { ativo: { booleanValue: true } } }) });
  if (!r.ok) throw new Error('não consegui criar o administrador no emulador: ' + r.status);
}
const campo = (doc, nome) => doc?.fields?.[nome]?.stringValue;

module.exports = { lerDoc, listar, virarAdministrador, campo };
