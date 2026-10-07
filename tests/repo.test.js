const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tracked = () => execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);

test('privacidade: nenhuma planilha ou arquivo de dados pessoais versionado', () => {
  const files = tracked();
  const planilhas = files.filter(f => /\.(xlsx|xls|csv)$/i.test(f));
  assert.deepEqual(planilhas, [], 'planilhas não podem ir para o GitHub');
  const jsons = files.filter(f => f.endsWith('.json') && !/^src\/config\/firebase\.(dev|prod)\.json$/.test(f) && !/^package(-lock)?\.json$/.test(f));
  assert.deepEqual(jsons, [], 'só configs do Firebase e package*.json podem ser .json');
});

test('privacidade: nenhum e-mail real no código (só exemplos)', () => {
  const files = tracked().filter(f => /\.(js|html|css|md|json|yml|rules)$/.test(f) && !f.includes('package-lock') && !f.includes('vendor/'));
  const achados = [];
  for (const f of files) {
    for (const mt of read(f).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      if (!/@(exemplo\.com|example\.com|x\.com|users\.noreply\.github\.com)$/.test(mt[0]) && !/^noreply@/.test(mt[0])) achados.push(`${f}: ${mt[0]}`);
    }
  }
  assert.deepEqual(achados, []);
});

test('build: os três ambientes montam sem sobras de marcadores', () => {
  for (const env of ['local', 'dev', 'prod']) {
    const out = path.join('dist', `repo-${env}.html`);
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['build.py', '--env', env, '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const html = read(out);
    for (const marcador of ['/*CSS*/', '/*APP*/', '/*CHARTJS*/', '/*SEED*/', '/*FIREBASE*/', "/*ENV*/", '<!--FBSDK-->'])
      assert.ok(!html.includes(marcador), `${env}: sobrou ${marcador}`);
    assert.ok(html.includes(`const ENV="${env}"`) || html.includes(`const ENV='${env}'`), `${env}: ENV não definido`);
    assert.equal(html.includes('firebasejs'), env !== 'local', `${env}: SDK do Firebase só nos ambientes de nuvem`);
    assert.ok(!html.includes('const SEED={') && html.includes('const SEED=null'), `${env}: nenhum dado embutido`);
  }
});

test('build: o JavaScript montado é válido', () => {
  const dir = path.join(ROOT, 'src', 'js');
  const code = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'bundle.js' }));
});

test('ambientes: dev e prod usam projetos Firebase diferentes', () => {
  const dev = JSON.parse(read('src/config/firebase.dev.json')), prod = JSON.parse(read('src/config/firebase.prod.json'));
  assert.notEqual(dev.projectId, prod.projectId);
  assert.notEqual(dev.apiKey, prod.apiKey);
  assert.match(dev.projectId, /-dev$/);
  assert.doesNotMatch(prod.projectId, /-dev$/);
});

test('regras do Firestore: cada pessoa só acessa os próprios dados e o resto é bloqueado', () => {
  const r = read('firestore.rules');
  assert.match(r, /match \/users\/\{uid\}\/\{document=\*\*\}/);
  assert.match(r, /request\.auth\.uid == uid/);
  assert.doesNotMatch(r, /if true/);
  assert.doesNotMatch(r, /allow read, write;/);
  assert.equal((r.match(/match \//g) || []).length, 2, 'só as regras de databases e de users');
});
