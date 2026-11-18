/* Conferência final dos testes E2E (roda depois do `playwright test`, também no GitHub Actions).
   Garante que NADA foi pulado e que rodou exatamente a quantidade de cenários escritos nos arquivos .feature:
   um cenário "esquecido", pulado ou que deixou de ser gerado reprova aqui, em vez de passar calado. */
const fs = require('node:fs');
const path = require('node:path');

const pasta = path.join(__dirname, 'features');
let escritos = 0;
for (const arq of fs.readdirSync(pasta).filter(f => f.endsWith('.feature'))) {
  const linhas = fs.readFileSync(path.join(pasta, arq), 'utf8').split(/\r?\n/).map(l => l.trim());
  let esquema = false, emExemplos = false, linhasTabela = 0;
  const fecha = () => { if (esquema) escritos += Math.max(0, linhasTabela - 1); esquema = false; emExemplos = false; linhasTabela = 0; };
  for (const l of linhas) {
    if (/^(Cenário|Cenario|Esquema do Cenário|Esquema do Cenario):/.test(l)) {
      fecha();
      if (/^Esquema/.test(l)) esquema = true; else escritos += 1;
    } else if (/^Exemplos:?/.test(l)) emExemplos = true;
    else if (emExemplos && l.startsWith('|')) linhasTabela += 1;
  }
  fecha();
}

const resultado = JSON.parse(fs.readFileSync(path.join(__dirname, 'resultado.json'), 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = resultado.stats;
const problemas = [];
if (unexpected) problemas.push(`${unexpected} cenário(s) reprovaram`);
if (flaky) problemas.push(`${flaky} cenário(s) instáveis (passaram só na repetição)`);
if (skipped) problemas.push(`${skipped} cenário(s) foram pulados`);
if (expected !== escritos) problemas.push(`os arquivos .feature têm ${escritos} cenário(s), mas passaram ${expected}`);
if (escritos < 20) problemas.push(`só ${escritos} cenários escritos: parece que algum arquivo .feature sumiu`);

console.log(`Cenários escritos: ${escritos} · passaram: ${expected} · reprovados: ${unexpected} · pulados: ${skipped} · instáveis: ${flaky}`);
if (problemas.length) { console.error('\nE2E NÃO CONFERE:\n- ' + problemas.join('\n- ')); process.exit(1); }
console.log('E2E conferido: todos os cenários escritos rodaram e passaram.');
