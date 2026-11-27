/* Depois de cada execução dos testes no GitHub Actions (push em main/dev):
   1) abre uma issue `bug` para cada cenário que reprovou (uma só por cenário/branch, sem duplicar);
   2) fecha sozinha a issue quando o cenário passa de novo;
   3) comenta o resultado numa issue fixa "Resultados do CI" mencionando o dono, que recebe o e-mail do GitHub com o resumo e os links.
   Só usa o `gh` (já logado no Actions pelo GITHUB_TOKEN). Com DRY_RUN=1 apenas mostra o que faria.
   As funções puras (sem rede) são exportadas e testadas em tests/ci-relatar.test.js. */
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const ANSI = /\u001b\[[0-9;]*m/g;
const limpar = t => String(t || '').replace(ANSI, '').trim();
const MARCA = '[CI/';

/* percorre o resultado.json do Playwright e devolve os cenários e o que aconteceu com cada um */
function lerCenarios(resultado) {
  const lista = [];
  const visitar = (suite, caminho) => {
    const c = suite.title && !/\.spec\.js$/.test(suite.title) ? [...caminho, suite.title] : caminho;
    for (const spec of suite.specs || []) {
      const resultados = (spec.tests || []).flatMap(t => t.results || []);
      const erro = resultados.map(r => (r.error && r.error.message) || (r.errors && r.errors[0] && r.errors[0].message)).find(Boolean);
      const status = (spec.tests || []).map(t => t.status).join(',');
      lista.push({ nome: spec.title, funcionalidade: c[0] || '', ok: !!spec.ok, status, erro: limpar(erro).split('\n').slice(0, 8).join('\n').slice(0, 900) });
    }
    for (const s of suite.suites || []) visitar(s, c);
  };
  for (const s of resultado.suites || []) visitar(s, []);
  return lista;
}

const tituloBug = (branch, chave) => `${MARCA}${branch}] ${chave}`.slice(0, 200);

/* decide o que fazer com as issues de bug: criar (reprovou e não tem aberta) e fechar (tem aberta e não reprova mais) */
function planejar({ branch, falhas, abertas, podeFechar }) {
  const titulos = new Map(falhas.map(f => [tituloBug(branch, f.chave), f]));
  const abertasDaBranch = abertas.filter(i => i.title.startsWith(`${MARCA}${branch}]`));
  const criar = [...titulos].filter(([t]) => !abertasDaBranch.some(i => i.title === t)).map(([titulo, f]) => ({ titulo, falha: f }));
  const fechar = abertasDaBranch.filter(i => !titulos.has(i.title) && podeFechar(i.title) && !(i.labels || []).some(l => (l.name || l) === 'done')).map(i => i.number);
  return { criar, fechar };
}

/* Quadro: backlog → todo → wip → wtt → done → em-producao.
   `done` = testes verdes no dev; quando a main é publicada, tudo que está `done` (e aberto) vira `em-producao` e fecha. */
function issuesParaProducao(abertas) {
  return abertas.filter(i => !i.pull_request && (i.labels || []).some(l => (l.name || l) === 'done') && !(i.labels || []).some(l => ['epic'].includes(l.name || l))).map(i => i.number);
}

function resumo({ branch, jobs, cenarios, falhas, runUrl, artefatoUrl, paginaUrl, sha, promovidas = [] }) {
  const ico = r => ({ success: '✅', failure: '❌', cancelled: '⚪', skipped: '⏭️' }[r] || '❔');
  const total = cenarios.length, reprov = cenarios.filter(c => !c.ok).length;
  const testesOk = jobs.testes === 'success' && jobs.e2e === 'success';
  const titulo = !testesOk ? '❌ Algo reprovou' : jobs.publicar === 'failure' ? '⚠️ Os testes passaram, mas a publicação do site falhou' : '✅ Tudo passou';
  const linhas = [
    `${titulo} em \`${branch}\` (${String(sha || '').slice(0, 7)})`,
    '',
    `| Etapa | Resultado |`, `|---|---|`,
    `| Testes de lógica e regras do banco | ${ico(jobs.testes)} ${jobs.testes} |`,
    `| Testes de ponta a ponta (Chrome) | ${ico(jobs.e2e)} ${jobs.e2e}${total ? ` — ${total - reprov} de ${total} cenários passaram` : ''} |`,
    `| Publicação do site | ${ico(jobs.publicar)} ${jobs.publicar} |`,
    '',
  ];
  if (falhas.length) {
    linhas.push('**Cenários que reprovaram:**');
    for (const f of falhas) linhas.push(`- ${f.chave}`);
    linhas.push('', 'Cada um virou uma issue `bug` (ou já existia uma aberta).', '');
  }
  if (promovidas.length) linhas.push(`🚀 **No ar na produção** (issues fechadas): ${promovidas.map(n => '#' + n).join(', ')}`, '');
  linhas.push(`- [Ver esta execução](${runUrl})`);
  if (paginaUrl && jobs.publicar === 'success') linhas.push(`- [Relatório dos testes (passo a passo e fotos)](${paginaUrl})`);
  if (artefatoUrl) linhas.push(`- [Baixar relatório e fotos das falhas (.zip)](${artefatoUrl})`);
  linhas.push('', '@CaduCondo', '', '---', '_Gerado automaticamente pelo CI (tools/ci/relatar.js)._');
  return linhas.join('\n');
}

function corpoBug({ falha, branch, sha, runUrl, artefatoUrl, repo }) {
  return [
    `**Achado pelos testes automáticos (CI).** Cenário reprovado em \`${branch}\` (commit ${String(sha || '').slice(0, 7)}).`,
    '', `- **Funcionalidade:** ${falha.funcionalidade || '—'}`, `- **Cenário:** ${falha.nome}`,
    '', '**O que aconteceu (erro do teste):**', '```', falha.erro || '(sem mensagem: veja a execução)', '```',
    '', '**Evidência:**', `- [Execução do CI](${runUrl})`, artefatoUrl ? `- [Relatório, fotos e trace (.zip)](${artefatoUrl})` : '',
    '', '**Para reproduzir no computador:**', '```bash',
    'python build.py --env local --out dist/e2e/index.html', 'npx bddgen', `npx playwright test -g "${falha.nome.replace(/"/g, '\\"')}"`, '```',
    '', 'Defeito do app → corrigir o app. Teste errado → corrigir o teste e provar por mutação (veja CLAUDE.md). Esta issue fecha sozinha quando o cenário voltar a passar.',
    '', '_Aberta automaticamente pelo CI. Prioridade sugerida: P1; ajuste se for o caso._',
  ].filter(l => l !== undefined).join('\n');
}

/* ---------- parte com rede (gh) ---------- */
const DRY = !!process.env.DRY_RUN;
function gh(args, entrada) {
  if (DRY) { console.log('[simulação] gh ' + args.join(' ')); return '[]'; }
  return execFileSync('gh', args, { encoding: 'utf8', input: entrada, maxBuffer: 20 * 1024 * 1024 });
}

function principal() {
  const env = process.env;
  const branch = env.BRANCH, repo = env.REPO, runUrl = env.RUN_URL, sha = env.SHA;
  const jobs = { testes: env.R_TESTES || 'skipped', e2e: env.R_E2E || 'skipped', publicar: env.R_PUBLICAR || 'skipped' };
  let cenarios = [];
  try { cenarios = lerCenarios(JSON.parse(fs.readFileSync(env.RESULTADO_JSON || 'e2e/resultado.json', 'utf8'))); } catch { /* execução não chegou a gerar o arquivo */ }
  const temResultado = cenarios.length > 0;

  /* o que está reprovado agora: cenários + etapas inteiras que quebraram sem listar cenário */
  const falhas = cenarios.filter(c => !c.ok).map(c => ({ chave: c.nome, ...c }));
  const falhouCenario = falhas.length > 0;
  if (jobs.testes === 'failure') falhas.push({ chave: 'Testes de lógica ou regras do banco reprovaram', funcionalidade: 'Testes de lógica', nome: 'npm test / npm run test:rules', erro: 'Veja o log da etapa "Testes" na execução.' });
  if (jobs.e2e === 'failure' && !falhouCenario)
    falhas.push({ chave: 'Testes de ponta a ponta não executaram ou não conferem', funcionalidade: 'Testes de ponta a ponta', nome: 'npm run e2e / npm run e2e:ver', erro: 'Nenhum cenário reprovado individualmente: veja o log (instalação, montagem do app ou conferência da quantidade de cenários).' });

  if (jobs.publicar === 'failure') falhas.push({ chave: 'Publicação do site falhou', funcionalidade: 'Publicação', nome: 'Publicar site (GitHub Pages)', erro: 'Os testes passaram, mas o site não foi publicado. Veja o log da etapa "Publicar site" (pode ser instabilidade do GitHub: tente rodar de novo).' });
  const abertas = JSON.parse(gh(['issue', 'list', '--repo', repo, '--label', 'ci-automatico', '--state', 'open', '--limit', '200', '--json', 'number,title,labels']) || '[]');
  const GENERICAS = { 'Testes de lógica ou regras do banco reprovaram': () => jobs.testes === 'success', 'Testes de ponta a ponta não executaram ou não conferem': () => jobs.e2e === 'success', 'Publicação do site falhou': () => jobs.publicar === 'success' };
  const podeFechar = titulo => {
    const chave = titulo.replace(/^\[CI\/[^\]]+\] /, '');
    if (GENERICAS[chave]) return GENERICAS[chave]();
    return temResultado && jobs.e2e !== 'skipped' && jobs.e2e !== 'cancelled';
  };
  const { criar, fechar } = planejar({ branch, falhas, abertas, podeFechar });

  if (criar.length || fechar.length) gh(['label', 'create', 'ci-automatico', '--repo', repo, '--color', 'ededed', '--description', 'Aberta/fechada sozinha pelo CI', '--force']);
  for (const { titulo, falha } of criar) {
    gh(['issue', 'create', '--repo', repo, '--title', titulo, '--label', 'bug', '--label', 'backlog', '--label', 'P1', '--label', 'ci-automatico', '--body-file', '-'], corpoBug({ falha, branch, sha, runUrl, artefatoUrl: env.ARTEFATO_URL, repo }));
  }
  for (const n of fechar) {
    gh(['issue', 'comment', String(n), '--repo', repo, '--body-file', '-'], `✅ O cenário voltou a passar em \`${branch}\` (commit ${String(sha || '').slice(0, 7)}). [Execução](${runUrl}). Marcada como \`done\`; quando a main for publicada ela vira \`em-producao\` e fecha sozinha.\n\n---\n_Gerado automaticamente pelo CI._`);
    gh(['issue', 'edit', String(n), '--repo', repo, '--remove-label', 'backlog', '--remove-label', 'todo', '--remove-label', 'wip', '--remove-label', 'wtt', '--add-label', 'done']);
  }

  /* produção publicada: o que estava `done` vira `em-producao` e fecha */
  let promovidas = [];
  if (branch === 'main' && jobs.publicar === 'success') {
    const prontas = JSON.parse(gh(['issue', 'list', '--repo', repo, '--label', 'done', '--state', 'open', '--limit', '100', '--json', 'number,labels']) || '[]');
    promovidas = issuesParaProducao(prontas);
    for (const n of promovidas) {
      gh(['issue', 'comment', String(n), '--repo', repo, '--body-file', '-'], `🚀 No ar na produção (commit ${String(sha || '').slice(0, 7)}, [execução](${runUrl})). Estado: \`em-producao\`. Fechada automaticamente.\n\n---\n_Gerado automaticamente pelo CI._`);
      gh(['issue', 'edit', String(n), '--repo', repo, '--remove-label', 'done', '--add-label', 'em-producao']);
      gh(['issue', 'close', String(n), '--repo', repo, '--reason', 'completed']);
    }
  }

  /* issue fixa que dispara o e-mail */
  const fixa = JSON.parse(gh(['issue', 'list', '--repo', repo, '--search', 'Resultados do CI in:title', '--state', 'all', '--limit', '20', '--json', 'number,title,state']) || '[]').find(i => i.title === '📬 Resultados do CI');
  let numero = fixa && fixa.number;
  const corpo = resumo({ branch, jobs, cenarios, falhas, runUrl, artefatoUrl: env.ARTEFATO_URL, paginaUrl: env.PAGINA_URL, sha, promovidas });
  if (!numero) {
    const url = gh(['issue', 'create', '--repo', repo, '--title', '📬 Resultados do CI', '--label', 'qualidade', '--body-file', '-'],
      'Cada execução dos testes no GitHub comenta aqui o resultado (o GitHub manda por e-mail para quem está mencionado). Não fechar.').trim();
    numero = url.split('/').pop();
  } else if (fixa.state === 'CLOSED') gh(['issue', 'reopen', String(numero), '--repo', repo]);
  gh(['issue', 'comment', String(numero), '--repo', repo, '--body-file', '-'], corpo);
  console.log(`Resultado comunicado (issue #${numero}); bugs novos: ${criar.length}; marcados done: ${fechar.length}; promovidos a em-producao: ${promovidas.length}.`);
}

module.exports = { lerCenarios, planejar, resumo, corpoBug, tituloBug, limpar, issuesParaProducao };
if (require.main === module) principal();
