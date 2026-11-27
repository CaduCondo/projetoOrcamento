/* Antes dos cenários da nuvem: garante o Firebase SDK em e2e/.sdk (baixa e confere o hash) e que os emuladores estão de pé. */
const { execFileSync } = require('node:child_process');

module.exports = async () => {
  execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['tools/baixar-sdk.py'], { stdio: 'inherit' });
  for (const [nome, url] of [['Auth', 'http://127.0.0.1:9099'], ['Firestore', 'http://127.0.0.1:8080']]) {
    try { await fetch(url); } catch { throw new Error(`O emulador do ${nome} não está rodando em ${url}. Use: npm run e2e:nuvem:emu`); }
  }
};
