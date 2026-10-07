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
  const jsons = files.filter(f => f.endsWith('.json') && !/^src\/config\/firebase\.(dev|prod)\.json$/.test(f) && !/^(package(-lock)?|firebase)\.json$/.test(f));
  assert.deepEqual(jsons, [], 'só as configs do Firebase (src/config, firebase.json do emulador) e package*.json podem ser .json');
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
    const out = path.join('dist', `repo-${env}-${process.pid}.html`);
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['build.py', '--env', env, '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const html = read(out);
    fs.rmSync(path.join(ROOT, out), { force: true });
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

test('regras do Firestore: estrutura segura (a prova completa está em tests/rules, no emulador)', () => {
  const r = read('firestore.rules');
  for (const m of ['match /users/{uid}/{document=**}', 'match /profiles/{uid}', 'match /admins/{uid}']) assert.ok(r.includes(m), m);
  assert.doesNotMatch(r, /if true/);
  assert.doesNotMatch(r, /allow read, write;/);
  assert.match(r, /match \/admins\/\{uid\}[\s\S]*?allow write: if false;/, 'ninguém grava em admins pelo site');
  // nenhuma regra de escrita pode depender só de ser administrador
  const escritas = r.split(/\r?\n/).filter(l => /^\s*allow\s+(write|create|update|delete)/.test(l));
  assert.ok(escritas.length >= 5);
  for (const l of escritas) assert.ok(/isOwner\(uid\)|if false/.test(l), 'escrita sem dono: ' + l.trim());
  for (const l of escritas) assert.ok(!/isAdmin\(\)/.test(l), 'administrador não escreve: ' + l.trim());
  assert.equal((r.match(/match \//g) || []).length, 4, 'databases, admins, profiles e users — mais nada');
});

test('PWA: manifesto válido, ícones existem e a casca da página aponta para eles', () => {
  const man = JSON.parse(read('src/static/manifest.webmanifest'));
  assert.equal(man.display, 'standalone');
  assert.ok(man.name && man.short_name && man.start_url === './' && man.scope === './');
  for (const i of man.icons) assert.ok(fs.existsSync(path.join(ROOT, 'src', 'static', i.src)), 'ícone ausente: ' + i.src);
  assert.ok(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512'), 'ícones 192 e 512');
  assert.ok(man.icons.some(i => i.purpose === 'maskable'), 'ícone adaptável (Android)');
  const html = read('src/index.html');
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /theme-color/);
  assert.match(read('src/static/sw.js'), /origin/, 'o service worker só mexe em arquivos do próprio site');
});

test('PWA: o build do site leva manifesto, ícones e service worker junto do index.html', () => {
  const dir = path.join('dist', `site-${process.pid}`);
  execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['build.py', '--env', 'prod', '--out', path.join(dir, 'index.html')], { cwd: ROOT, stdio: 'pipe' });
  for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'])
    assert.ok(fs.existsSync(path.join(ROOT, dir, f)), 'faltou no site: ' + f);
  fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
});
