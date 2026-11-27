/* A exceção dos testes E2E para mensagens de console tem que ser ESTREITA: só o 400 do login com senha errada e do canal de transmissão do
   Firestore. Qualquer outro erro de console continua reprovando o cenário (senão os testes deixariam bug passar calado). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ruidoEsperado } = require('../e2e/support/fixtures');

const msg = (texto, url) => ({ text: () => texto, location: () => ({ url }) });
const R400 = 'Failed to load resource: the server responded with a status of 400 (Bad Request)';

test('exceção: 400 do login com senha errada e 400 do canal do Firestore (Listen e Write) são ignorados', () => {
  assert.equal(ruidoEsperado(msg(R400, 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x')), true);
  assert.equal(ruidoEsperado(msg(R400, 'http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8')), true);
  assert.equal(ruidoEsperado(msg(R400, 'http://127.0.0.1:8080/google.firestore.v1.Firestore/Write/channel?VER=8')), true);
});

test('exceção: qualquer outro erro de console continua reprovando (outro status, outro endereço, outro texto)', () => {
  const R403 = 'Failed to load resource: the server responded with a status of 403 (Forbidden)', R500 = 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)';
  assert.equal(ruidoEsperado(msg(R403, 'http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel')), false, 'permissão negada no canal NÃO é ruído');
  assert.equal(ruidoEsperado(msg(R500, 'http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel')), false);
  assert.equal(ruidoEsperado(msg(R400, 'http://127.0.0.1:8080/v1/projects/demo-orcamento/databases/(default)/documents/users/x')), false, '400 em outro endereço do banco');
  assert.equal(ruidoEsperado(msg(R400, 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp')), false, '400 ao criar conta (e-mail repetido, senha fraca) não é ruído');
  assert.equal(ruidoEsperado(msg(R400, 'https://exemplo.com/porteiro')), false);
  assert.equal(ruidoEsperado(msg('Uncaught TypeError: x is undefined', 'http://localhost:4174/index.html')), false, 'erro de JavaScript do app');
  assert.equal(ruidoEsperado(msg(R400, '')), false, 'sem endereço, não dá para saber: reprova');
});
