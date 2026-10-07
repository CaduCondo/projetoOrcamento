const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp, FakeChart } = require('./helpers/app');

const html = buildHtml('local');
const EMAIL = 'pessoa@exemplo.com', SENHA = 'segredo123';
const nbsp = s => s.replace(/ /g, ' ');

/* cria a conta e espera a tela principal */
async function entrar(app) {
  app.click('[data-lm="up"]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.type('#lpw2', SENHA);
  app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrar na conta');
}

test('tela de login (local): textos, campos e botão de criar conta', async () => {
  const app = openApp({ html });
  assert.ok(app.$('#lf'), 'mostra o formulário de login');
  assert.match(app.text(), /Contas ficam só neste navegador/);
  assert.ok(app.$('#lrem'), 'tem "manter conectado"');
  assert.equal(app.$('#envbar').hidden, true, 'faixa de teste escondida fora do DEV');
  app.click('[data-lm="reset"]');
  assert.match(app.$('.login .sub').textContent, /Definir nova senha/);
  assert.ok(app.$('#lpw2'), 'redefinir pede a senha nova duas vezes');
  app.close();
});

test('login: erros claros e criação de conta', async () => {
  const app = openApp({ html });
  app.click('[data-lm="up"]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.type('#lpw2', 'diferente');
  app.submit('#lf');
  await app.waitFor(() => /não conferem/.test(app.$('#lerr').textContent), 3000, 'erro de confirmação');
  app.type('#lpw2', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'conta criada');
  assert.ok(app.$('[data-tab="mes"]'), 'mostra o menu');
  assert.match(app.text(), new RegExp(EMAIL));
  app.close();
});

test('tela Mês: sem barra de lançamento; "＋ Categoria" em cada bloco cria a categoria e o "Lançar" lança o valor', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  assert.equal(app.$('#qf'), null, 'a barra de lançamento rápido saiu');
  assert.equal(app.$$('[data-newcat]').length, 2, 'um botão em A receber e outro em A pagar');
  assert.equal(app.$$('.pfoot').length, 2);
  // validações da janela
  app.click('[data-newcat="pagar"]');
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  assert.equal(app.$('#cfv'), null, 'a janela de categoria não tem campo valor');
  assert.equal(app.$$('input[name=cfs]').length, 3, 'três opções de onde vale');
  assert.equal(app.$('input[name=cfs]:checked').value, 'futuro', 'padrão: deste mês em diante');
  app.submit('#cf');
  assert.match(app.$('#cferr').textContent, /nome/i);
  app.type('#cfn', 'Padaria'); app.type('#cfd', '40'); app.submit('#cf');
  assert.match(app.$('#cferr').textContent, /1 a 31/);
  app.type('#cfd', '12'); app.submit('#cf');
  assert.ok(!app.$('#dlg3').hasAttribute('open'), 'janela fechou');
  const pad = app.ev("S.cats.find(c=>c.nome==='Padaria').id");
  assert.equal(app.ev(`catById('${pad}').dia`), 12);
  assert.ok(app.$(`tr[data-cat="${pad}"]`), 'a linha aparece no bloco A pagar');
  assert.match(app.$(`tr[data-cat="${pad}"]`).textContent, /Lançar/);
  assert.match(app.$(`tr[data-cat="${pad}"]`).textContent, /dia 12/);
  assert.equal(app.ev(`MT('pagar',${y},${mth},'prev')`), 0, 'criar categoria não lança valor');
  // lançar pelo botão da linha
  app.click(`[data-open="${pad}|${y}|${mth}"]`);
  app.type('#nv', '123456');                                   // máscara: vira 1.234,56
  assert.equal(nbsp(app.$('#nv').value), '1.234,56');
  app.type('#nd', 'feira'); app.click('[data-add]');
  assert.equal(app.ev(`MT('pagar',${y},${mth},'real')`), 1234.56);
  app.click('[data-close]');
  assert.match(nbsp(app.$('.card .v.neg').textContent), /-R\$ 1\.234,56/);        // card "Pago" negativo e vermelho
  app.close();
});

test('a categoria nova só aparece onde a opção escolhida manda (só este mês · ano todo · em diante)', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY');
  app.click('[data-m="3"]');                                   // abril
  const criar = (nome, scope) => { app.click('[data-newcat="receber"]'); app.type('#cfn', nome); app.click(`input[name=cfs][value=${scope}]`); app.submit('#cf'); };
  criar('SoAbril', 'mes'); criar('AnoTodo', 'ano'); criar('Adiante', 'futuro');
  const linhas = () => app.$$('tr[data-cat]').map(r => r.textContent);
  const tem = (n) => linhas().some(t => t.includes(n));
  assert.ok(tem('SoAbril') && tem('AnoTodo') && tem('Adiante'), 'abril: as três');
  app.click('[data-m="4"]');
  assert.ok(!tem('SoAbril') && tem('AnoTodo') && tem('Adiante'), 'maio: sem a "só abril"');
  app.click('[data-m="1"]');
  assert.ok(!tem('SoAbril') && tem('AnoTodo') && !tem('Adiante'), 'fevereiro: o ano todo sim, "em diante" não');
  app.click('[data-m="11"]');
  assert.ok(tem('AnoTodo') && tem('Adiante'));
  app.close();
});

test('janela de itens: previsto x realizado, cartão (💳) e total', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`ens('${merc}',${y},${mth}).items.push({v:100,d:'a',ok:true},{v:50,d:'b',ok:false},{v:30,d:'c',ok:true})`);
  app.ev('save();render()');
  app.click(`[data-open="${merc}|${y}|${mth}"]`);
  assert.ok(app.$('#dlg').hasAttribute('open'), 'abriu a janela');
  assert.match(nbsp(app.$('#dr').textContent), /-R\$ 130,00/);     // realizado: 100 + 30
  assert.match(nbsp(app.$('#dp').textContent), /-R\$ 180,00/);     // previsto: tudo
  app.click('[data-info="2"]');                                    // item "c" vira informativo (cartão)
  assert.match(nbsp(app.$('#dr').textContent), /-R\$ 100,00/);
  assert.match(nbsp(app.$('#dp').textContent), /-R\$ 150,00/);
  app.click('[data-allok]');                                       // marcar todos (menos informativos)
  assert.match(nbsp(app.$('#dr').textContent), /-R\$ 150,00/);
  app.type('#nv', '5000'); app.type('#nd', 'novo'); app.click('[data-add]');   // adiciona 50,00
  assert.equal(app.ev(`V('${merc}',${y},${mth},'prev')`), 200);
  app.click('[data-del="0"]');                                     // remove o primeiro (100)
  assert.equal(app.ev(`V('${merc}',${y},${mth},'prev')`), 100);
  // quantidade de itens: fica ao lado ESQUERDO do valor (não embaixo do nome)
  app.type('#nv', '1000'); app.type('#nd', 'mais um'); app.click('[data-add]'); app.click('[data-close]');
  const linha = app.$(`tr[data-cat="${merc}"]`);
  const qtd = app.ev(`cellOf('${merc}',${y},${mth}).items.length`);
  assert.ok(qtd > 1);
  assert.equal(linha.querySelector('td.n .cnt').textContent.trim(), `${qtd} itens`, 'o contador está na célula do valor');
  assert.doesNotMatch(linha.cells[1].textContent, /itens/, 'e não mais embaixo do nome');
  assert.ok(linha.querySelector('td.n .cnt').nextElementSibling.classList.contains('val'), 'logo antes do botão do valor');
  app.close();
});

test('categorias em Ajustes: criar, buscar, mesclar e excluir', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`ens('${merc}',${y},${mth}).items.push({v:70,d:'x',ok:true})`); app.ev('save()');
  app.click('[data-tab="aj"]');
  assert.ok(app.$('#cl'), 'abriu Ajustes com o gerenciador');
  // criar (pela mesma janela da tela Mês)
  app.click('[data-newcat="pagar"]'); app.type('#cfn', 'Padaria'); app.submit('#cf');
  assert.ok(app.ev("S.cats.some(c=>c.nome==='Padaria')"));
  assert.match(app.$$('#cl .vig').map(e => e.textContent).join('|'), /de .*\/\d{4} em diante/, 'a linha mostra onde a categoria vale');
  // buscar
  app.type('#cq', 'merc');
  assert.deepEqual(app.$$('#cl .cn').map(i => i.value), ['Mercado']);
  // mesclar Mercado → Padaria (pelo combobox, como o usuário faria)
  const pad = app.ev("S.cats.find(c=>c.nome==='Padaria').id");
  app.click(`[data-cmerge="${merc}"]`);
  assert.ok(app.$('#dlg2').hasAttribute('open'));
  app.type('#mgin', 'pada');
  assert.match(app.$('#dlg2 .cbl').textContent, /Padaria/);
  app.key('#mgin', 'Enter');
  assert.equal(app.$('#mgok').disabled, false, 'botão Mesclar liberado');
  app.click('#mgok');
  assert.equal(app.ev(`catById('${merc}')`), undefined);
  assert.equal(app.ev(`V('${pad}',${y},${mth},'real')`), 70, 'lançamentos foram para a Padaria');
  // excluir
  app.type('#cq', 'pada');
  app.click(`[data-cdel="${pad}"]`);                               // confirm() do teste responde "sim"
  assert.equal(app.ev(`catById('${pad}')`), undefined);
  assert.equal(app.ev(`Object.keys(S.data).some(k=>k.startsWith('${pad}|'))`), false);
  app.close();
});

test('Ajustes: editar a categoria vale do mês escolhido em diante, mostra a vigência e permite desfazer', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY');
  // cria "Salário Antigo" (ano todo, dia 5) e lança em janeiro e maio
  app.click('[data-newcat="receber"]'); app.type('#cfn', 'Salário Antigo'); app.type('#cfd', '5'); app.click('input[name=cfs][value=ano]'); app.submit('#cf');
  const velho = app.ev("S.cats.find(c=>c.nome==='Salário Antigo').id");
  app.ev(`ens('${velho}',${y},0).items.push({v:1000,d:'',ok:true});ens('${velho}',${y},4).items.push({v:1000,d:'',ok:true});save()`);
  app.click('[data-tab="aj"]');
  app.click('[data-cf="tipo|receber"]'); app.type('#cq', 'Salário Antigo');
  assert.match(app.$('#cl .vig').textContent, new RegExp(`ano todo ${y}`));
  // Editar → a partir de abril, novo nome e dia 10, "deste mês em diante"
  app.click(`[data-cedit="${velho}"]`);
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  assert.equal(app.$('#cfn').value, 'Salário Antigo');
  assert.equal(app.$('input[name=cfs]:checked').value, 'ano', 'a opção atual vem marcada');
  app.change('#cfm', '3');
  app.type('#cfn', 'Salário Empresa X'); app.type('#cfd', '10'); app.click('input[name=cfs][value=futuro]'); app.submit('#cf');
  const novo = app.ev("S.cats.find(c=>c.nome==='Salário Empresa X').id");
  assert.equal(app.ev(`catById('${velho}').nome`), 'Salário Antigo', 'o passado não mudou');
  assert.equal(app.ev(`catById('${velho}').dia`), 5);
  assert.equal(app.ev(`V('${velho}',${y},0,'real')`), 1000, 'janeiro continua na versão antiga');
  assert.equal(app.ev(`V('${novo}',${y},4,'real')`), 1000, 'maio foi para a versão nova');
  assert.equal(app.ev(`catById('${novo}').dia`), 10);
  app.type('#cq', 'Salário');
  const nomes = app.$$('#cl .cn').map(i => i.value);
  assert.ok(nomes.includes('Salário Antigo') && nomes.includes('Salário Empresa X'), 'a lista mostra as duas versões');
  assert.match(app.$$('#cl .vig').map(e => e.textContent).join('|'), /jan\/\d{4} a mar\/\d{4}/, 'a antiga mostra até quando valeu (de janeiro a março)');
  // editar o nome direto na linha: vale do mês selecionado em diante e oferece "Desfazer"
  app.change(`[data-cn="${novo}"]`, 'Salário Empresa Y');
  assert.equal(app.ev("S.cats.some(c=>c.nome==='Salário Empresa Y')"), true);
  assert.equal(app.$('#snack').hidden, false);
  assert.match(app.$('#snack').textContent, /passado não mudou/);
  app.click('#snack button');                                   // Desfazer
  assert.equal(app.ev("S.cats.some(c=>c.nome==='Salário Empresa Y')"), false, 'desfez');
  // corrigir um erro em TODOS os meses (sem criar versão)
  const total = app.ev('S.cats.length');
  app.click(`[data-cedit="${velho}"]`); app.click('input[name=cfq][value=todos]');
  assert.equal(app.$$('input[name=cfs]').every(r => r.disabled), true, 'as opções de vigência ficam bloqueadas');
  app.type('#cfn', 'Salário Antigo (corrigido)'); app.submit('#cf');
  assert.equal(app.ev(`catById('${velho}').nome`), 'Salário Antigo (corrigido)');
  assert.equal(app.ev('S.cats.length'), total, 'nenhuma versão nova');
  app.close();
});

test('anos e abas: adicionar ano, trocar de aba e gráficos', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.w.prompt = () => '2030';
  app.click('[data-addyear]');
  assert.equal(app.ev('selY'), 2030);
  assert.ok(app.ev('S.anos.includes(2030)'));
  assert.deepEqual(app.$$('#ysel option').map(o => o.textContent).slice(-1), ['2030']);
  for (const t of ['ano', 'graf', 'pat', 'aj', 'mes']) { app.click(`[data-tab="${t}"]`); assert.equal(app.ev('tab'), t); }
  app.click('[data-tab="graf"]');
  assert.ok(app.$('#c1') && app.$('#c16'), 'tela de gráficos montada');
  assert.ok(FakeChart.count >= 16, 'os 16 gráficos foram criados');
  app.close();
});

test('persistência, sair, senha errada e voltar com os dados', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`ens('${merc}',${y},${mth}).items.push({v:42,d:'guardar',ok:true})`); app.ev('save()');
  const salvo = JSON.parse(app.w.localStorage.getItem('orc-data-' + EMAIL));
  assert.ok(JSON.stringify(salvo).includes('guardar'), 'gravou no navegador');
  app.click('[data-logout]');
  assert.ok(app.$('#lf'), 'voltou ao login');
  app.type('#lem', EMAIL); app.type('#lpw', 'errada'); app.submit('#lf');
  await app.waitFor(() => /Senha incorreta/.test(app.$('#lerr').textContent), 3000, 'senha incorreta');
  app.type('#lem', 'outro@x.com'); app.type('#lpw', 'qualquer'); app.submit('#lf');
  await app.waitFor(() => /Não existe conta/.test(app.$('#lerr').textContent), 3000, 'e-mail sem conta');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrar de novo');
  assert.equal(app.ev(`V('${merc}',${y},${mth},'real')`), 42, 'os dados voltaram');
  app.close();
});

test('esqueci a senha (local): nova senha mantém os dados', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`ens('${merc}',${y},${mth}).items.push({v:9,d:'x',ok:true})`); app.ev('save()');
  app.click('[data-logout]');
  app.click('[data-lm="reset"]');
  app.type('#lem', EMAIL); app.type('#lpw', 'novaSenha1'); app.type('#lpw2', 'novaSenha1'); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrar após redefinir');
  assert.equal(app.ev(`V('${merc}',${y},${mth},'real')`), 9);
  app.click('[data-logout]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.submit('#lf');
  await app.waitFor(() => /Senha incorreta/.test(app.$('#lerr').textContent), 3000, 'senha antiga recusada');
  app.close();
});

test('cadastro no modo local: salvo no navegador, sem escolha de nuvem, e troca de senha', async () => {
  const app = openApp({ html });
  await entrar(app);
  assert.match(app.$('#notice').textContent, /Complete seu cadastro/);
  assert.doesNotMatch(app.$('#notice').textContent, /escolher onde guardar/, 'sem nuvem não há o que escolher');
  app.click('.userchip');
  assert.equal(app.ev('tab'), 'perfil');
  assert.equal(app.$('input[name=stg]'), null, 'sem a escolha nuvem x aparelho');
  app.type('#pfn', 'Ana Paula Souza'); app.type('#pfb', '1990-05-01'); app.type('#pfp', 'Contadora'); app.click('[data-pf="salvar"]');
  await app.waitFor(() => /Cadastro salvo/.test(app.$('#pfok').textContent), 3000, 'salvou');
  assert.equal(JSON.parse(app.w.localStorage.getItem('orc-profile-' + EMAIL)).nome, 'Ana Paula Souza');
  assert.equal(app.$('#notice').textContent.trim(), '', 'cadastro completo: o aviso some');
  assert.match(app.$('.userchip').textContent, /Ana/);
  // trocar senha
  app.type('#pwa', 'errada1'); app.type('#pwn', 'outrasenha'); app.type('#pwc', 'outrasenha'); app.click('[data-pw="trocar"]');
  await app.waitFor(() => /atual está incorreta/.test(app.$('#pwerr').textContent), 3000, 'senha atual errada');
  app.type('#pwa', SENHA); app.click('[data-pw="trocar"]');
  await app.waitFor(() => /Senha alterada/.test(app.$('#pwok').textContent), 3000, 'trocou');
  app.click('[data-logout]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.submit('#lf');
  await app.waitFor(() => /Senha incorreta/.test(app.$('#lerr').textContent), 3000, 'senha antiga recusada');
  app.type('#lpw', 'outrasenha'); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrou com a nova');
  assert.match(app.$('.userchip').textContent, /Ana/, 'o cadastro continua lá');
  app.close();
});

test('sem erros de script durante os fluxos', async () => {
  const app = openApp({ html });
  await entrar(app);
  for (const t of ['ano', 'graf', 'pat', 'aj', 'mes']) app.click(`[data-tab="${t}"]`);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});
