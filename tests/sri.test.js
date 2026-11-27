/* Cadeia de suprimentos: todo script carregado de FORA do site (Firebase SDK no gstatic) tem que vir com SRI (integrity) e
   crossorigin, e a versão e os hashes têm que ser os que estão em src/config/firebase-sdk.json (gerado por tools/atualizar-sdk.py).
   Assim, se o endereço de fora for comprometido, o navegador recusa o arquivo alterado. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHtml } = require('./helpers/app');

const SDK = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'firebase-sdk.json'), 'utf8'));
const scriptsDeFora = html => [...html.matchAll(/<script\b[^>]*\bsrc="(https?:\/\/[^"]+)"[^>]*>/g)].map(m => ({ tag: m[0], url: m[1] }));

for (const env of ['dev', 'prod']) {
  test(`${env}: todo script de fora tem integrity (sha384) e crossorigin, com a versão e o hash do firebase-sdk.json`, () => {
    const fora = scriptsDeFora(buildHtml(env));
    assert.ok(fora.length >= 3, 'app, auth e firestore do Firebase');
    for (const { tag, url } of fora) {
      const m = url.match(/^https:\/\/www\.gstatic\.com\/firebasejs\/([^/]+)\/firebase-([a-z-]+)-compat\.js$/);
      assert.ok(m, `script de fora não permitido: ${url}`);
      assert.equal(m[1], SDK.version, `versão em ${url}`);
      assert.match(tag, /\bcrossorigin="anonymous"/, `crossorigin em ${url}`);
      const integ = tag.match(/\bintegrity="(sha384-[A-Za-z0-9+/]+=*)"/);
      assert.ok(integ, `integrity em ${url}`);
      assert.equal(integ[1], SDK.sri[m[2]], `hash de ${m[2]} confere com firebase-sdk.json`);
    }
  });
}

test('firebase-sdk.json tem versão e um hash sha384 para cada arquivo usado', () => {
  assert.match(SDK.version, /^\d+\.\d+\.\d+$/);
  for (const n of ['app', 'auth', 'firestore', 'app-check']) assert.match(SDK.sri[n], /^sha384-[A-Za-z0-9+/]{64}$/, n);
});

test('o modo local não carrega nenhum script de fora', () => {
  assert.deepEqual(scriptsDeFora(buildHtml('local')), []);
});
