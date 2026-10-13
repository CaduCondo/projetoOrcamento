const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp, FakeChart } = require('./helpers/app');

const html = buildHtml('local');
const EMAIL = 'pessoa@exemplo.com', SENHA = 'Segredo#123';
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

test('tela Mês: "＋ Categoria" só INCLUI uma categoria que já existe; criar fica na página Categorias; o "Lançar" lança o valor', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  assert.equal(app.$('#qf'), null, 'a barra de lançamento rápido saiu');
  assert.equal(app.$$('[data-usecat]').length, 2, 'um botão em Receitas e outro em Despesas');
  assert.equal(app.$$('[data-newcat]').length, 0, 'criar categoria não é feito na tela Mês');
  assert.equal(app.$$('.pfoot').length, 2);
  // criar na página Categorias: validações da janela
  app.click('[data-tab="cat"]');
  app.click('[data-newcat="pagar"]');
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  assert.equal(app.$('#cfv'), null, 'a janela de categoria não tem campo valor');
  assert.equal(app.$$('input[name=cfs]').length, 2, 'duas opções ao criar: só onde eu incluir · ano todo');
  assert.equal(app.$('input[name=cfs]:checked').value, 'lib', 'padrão: só onde eu incluir no mês');
  app.submit('#cf');
  assert.match(app.$('#cferr').textContent, /nome/i);
  app.type('#cfn', 'Padaria'); app.type('#cfd', '40'); app.submit('#cf');
  assert.match(app.$('#cferr').textContent, /1 a 31/);
  app.type('#cfd', '12'); app.submit('#cf');
  assert.ok(!app.$('#dlg3').hasAttribute('open'), 'janela fechou');
  const pad = app.ev("S.cats.find(c=>c.nome==='Padaria').id");
  assert.equal(app.ev(`catById('${pad}').dia`), 12);
  // na tela Mês ela ainda NÃO aparece; é incluída digitando parte do nome
  app.click('[data-tab="mes"]');
  assert.ok(!app.$(`tr[data-cat="${pad}"]`), 'criada, mas só aparece onde for incluída');
  app.click('[data-usecat="pagar"]');
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  app.type('#ufq', 'dar');                                     // "paDARia": o texto pode estar no meio do nome
  assert.deepEqual(app.$$('#ufl .nm').map(e => e.textContent), ['Padaria']);
  app.click(`[data-upick="${pad}"]`);
  assert.ok(!app.$('#dlg3').hasAttribute('open'), 'janela fechou');
  assert.ok(app.$(`tr[data-cat="${pad}"]`), 'a linha aparece no bloco Despesas');
  assert.match(app.$(`tr[data-cat="${pad}"]`).textContent, /Lançar/);
  assert.equal(app.$(`tr[data-cat="${pad}"] td.dia`).textContent, '12', 'o dia aparece na coluna Dia');
  assert.equal(app.ev(`MT('pagar',${y},${mth},'prev')`), 0, 'incluir categoria não lança valor');
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

test('incluir categoria: a lista filtra pelo meio do nome, ignora acento, e a mesma categoria vale em outro mês', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.ev(`['Salário Spassu','Salário Caixa','Salgueiro','Resalte de lucros','Reajuste salarial retroativo','Mercado Extra','Investimento'].forEach(n=>{addCat('receber',n).lib=true});save();render()`);
  const mostra = q => { app.type('#ufq', q); return app.$$('#ufl .nm').map(e => e.textContent).sort(); };
  app.click('[data-usecat="receber"]');
  assert.ok(mostra('').includes('Investimento'), 'sem texto: todas as que ainda não estão no mês');
  assert.deepEqual(mostra('sal'), ['Reajuste salarial retroativo', 'Resalte de lucros', 'Salgueiro', 'Salário Caixa', 'Salário Spassu'].sort());
  assert.deepEqual(mostra('SALA'), ['Reajuste salarial retroativo', 'Salário Caixa', 'Salário Spassu'].sort(), 'acento e maiúscula não atrapalham');
  assert.deepEqual(mostra('sal spassu'), ['Salário Spassu'], 'várias palavras: todas precisam estar no nome');
  mostra('xyz');
  assert.match(app.$('#ufl').textContent, /Nenhuma categoria com/);
  assert.ok(app.$('#ufl [data-gocat]'), 'oferece criar na página Categorias');
  app.click('[data-cclose]');
  // usa "Investimento" em setembro e de novo em outubro: não dá "já existe"
  app.click('[data-m="8"]');
  app.click('[data-usecat="receber"]'); app.type('#ufq', 'invest'); app.click('#ufl [data-upick]');
  assert.ok(app.$$('tr[data-cat]').some(r => r.textContent.includes('Investimento')), 'apareceu em setembro');
  app.click('[data-usecat="receber"]');
  assert.ok(!mostra('invest').includes('Investimento'), 'já está em setembro: não é oferecida de novo');
  app.click('[data-cclose]');
  app.click('[data-m="9"]');
  assert.ok(!app.$$('tr[data-cat]').some(r => r.textContent.includes('Investimento')), 'em outubro ainda não');
  app.click('[data-usecat="receber"]'); app.type('#ufq', 'invest'); app.click('#ufl [data-upick]');
  assert.ok(app.$$('tr[data-cat]').some(r => r.textContent.includes('Investimento')), 'e agora também em outubro');
  assert.equal(app.ev("S.cats.filter(c=>c.nome==='Investimento').length"), 1, 'continua sendo UMA categoria');
  app.close();
});

test('categoria nova: "só onde eu incluir" não aparece sozinha; "ano todo" aparece em todos os meses; meses futuros começam vazios', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.click('[data-tab="cat"]');
  const criar = (nome, scope) => { app.click('[data-newcat="receber"]'); app.type('#cfn', nome); app.click(`input[name=cfs][value=${scope}]`); app.submit('#cf'); };
  criar('AnoTodo', 'ano'); criar('Escondida', 'lib');
  app.click('[data-tab="mes"]');
  const linhas = () => app.$$('tr[data-cat]').map(r => r.textContent);
  const tem = n => linhas().some(t => t.includes(n));
  for (const mes of [0, 3, 9]) { app.click(`[data-m="${mes}"]`); assert.ok(tem('AnoTodo') && !tem('Escondida'), `mês ${mes + 1}: ano todo sim, "só onde eu incluir" não`); }
  app.click('[data-m="11"]');                                  // dezembro: futuro
  assert.ok(tem('AnoTodo'), 'futuro: aparece porque foi criada para o ano todo');
  assert.ok(!tem('Salário') && !tem('Mercado') && !tem('Moradia'), 'futuro: nenhuma outra categoria já vem na lista');
  app.click('[data-usecat="receber"]'); app.type('#ufq', 'escond'); app.click('#ufl [data-upick]');
  assert.ok(tem('Escondida'), 'incluída em dezembro');
  app.click('[data-m="10"]');
  assert.ok(!tem('Escondida') && !tem('Salário'), 'novembro continua vazio (só o ano todo)');
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

test('página Categorias: criar, buscar, mesclar e excluir', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.ev(`ens('${merc}',${y},${mth}).items.push({v:70,d:'x',ok:true})`); app.ev('save()');
  app.click('[data-tab="cat"]');
  assert.ok(app.$('#cl'), 'abriu a página Categorias com o gerenciador');
  app.click('[data-tab="aj"]');
  assert.equal(app.$('#cl'), null, 'Ajustes não gerencia mais categorias');
  app.click('[data-tab="cat"]');
  app.click('[data-newcat="pagar"]'); app.type('#cfn', 'Padaria'); app.submit('#cf');
  assert.ok(app.ev("S.cats.some(c=>c.nome==='Padaria')"));
  assert.match(app.$$('#cl .vig').map(e => e.textContent).join('|'), /só onde for incluída no mês/, 'a linha mostra onde a categoria vale');
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

test('página Categorias: editar a categoria vale do mês escolhido em diante, mostra a vigência e permite desfazer', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY');
  // cria "Salário Antigo" (ano todo, dia 5) e lança em janeiro e maio
  app.click('[data-tab="cat"]');
  app.click('[data-newcat="receber"]'); app.type('#cfn', 'Salário Antigo'); app.type('#cfd', '5'); app.click('input[name=cfs][value=ano]'); app.submit('#cf');
  const velho = app.ev("S.cats.find(c=>c.nome==='Salário Antigo').id");
  app.ev(`ens('${velho}',${y},0).items.push({v:1000,d:'',ok:true});ens('${velho}',${y},4).items.push({v:1000,d:'',ok:true});save()`);
  app.click('[data-tab="cat"]');
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
  for (const t of ['ano', 'graf', 'pat', 'cat', 'aj', 'mes']) { app.click(`[data-tab="${t}"]`); assert.equal(app.ev('tab'), t); }
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
  app.type('#lem', EMAIL); app.type('#lpw', 'Nova#Senha12'); app.type('#lpw2', 'Nova#Senha12'); app.submit('#lf');
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
  app.type('#pwa', 'errada1'); app.type('#pwn', 'Outra#Senha12'); app.type('#pwc', 'Outra#Senha12'); app.click('[data-pw="trocar"]');
  await app.waitFor(() => /atual está incorreta/.test(app.$('#pwerr').textContent), 3000, 'senha atual errada');
  app.type('#pwa', SENHA); app.click('[data-pw="trocar"]');
  await app.waitFor(() => /Senha alterada/.test(app.$('#pwok').textContent), 3000, 'trocou');
  app.click('[data-logout]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.submit('#lf');
  await app.waitFor(() => /Senha incorreta/.test(app.$('#lerr').textContent), 3000, 'senha antiga recusada');
  app.type('#lpw', 'Outra#Senha12'); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrou com a nova');
  assert.match(app.$('.userchip').textContent, /Ana/, 'o cadastro continua lá');
  app.close();
});

test('sem erros de script durante os fluxos', async () => {
  const app = openApp({ html });
  await entrar(app);
  for (const t of ['ano', 'graf', 'pat', 'cat', 'aj', 'mes']) app.click(`[data-tab="${t}"]`);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('criar conta: lista de regras da senha troca de X vermelho para V verde e só então libera o botão', async () => {
  const app = openApp({ html });
  app.click('[data-lm="up"]');
  const li = id => app.$(`#pwr-login [data-r="${id}"]`);
  assert.equal(app.$$('#pwr-login li').length, 6);
  assert.ok(app.$$('#pwr-login li').every(l => l.classList.contains('bad') && l.querySelector('b').textContent === 'X'), 'tudo começa X vermelho');
  assert.equal(app.$('#lbtn').disabled, true);
  app.type('#lpw', 'B');
  assert.ok(li('upper').classList.contains('ok') && li('upper').querySelector('b').textContent === 'V', 'digitar "B" acende a maiúscula');
  assert.ok(li('lower').classList.contains('bad'));
  app.type('#lpw', 'Segredo#12'); app.type('#lpw2', 'Segredo#1');
  assert.equal(app.$('#lbtn').disabled, true, 'confirmação diferente: continua travado');
  assert.ok(li('same').classList.contains('bad'));
  app.type('#lpw2', 'Segredo#12');
  assert.ok(app.$$('#pwr-login li').every(l => l.classList.contains('ok') && l.querySelector('b').textContent === 'V'));
  assert.equal(app.$('#lbtn').disabled, false, 'tudo verde: libera');
  app.type('#lpw', 'Segredo#1');
  assert.equal(app.$('#lbtn').disabled, true, 'voltou a faltar algo: trava de novo');
  app.close();
});

test('Meu Cadastro: a troca de senha tem a mesma lista e o botão só libera com tudo verde', async () => {
  const app = openApp({ html });
  app.click('[data-lm="up"]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.type('#lpw2', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'conta criada');
  app.click('.userchip');
  assert.equal(app.$$('#pwr-perfil li').length, 6);
  assert.equal(app.$('[data-pw="trocar"]').disabled, true);
  app.type('#pwn', 'Nova#Senha12'); app.type('#pwc', 'Nova#Senha12');
  assert.ok(app.$$('#pwr-perfil li').every(l => l.classList.contains('ok')));
  assert.equal(app.$('[data-pw="trocar"]').disabled, false);
  app.close();
});

test('tela Mês: tabelas com cabeçalho que ordena (nome, dia, valor), sem dia no fim, e total embaixo', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  app.ev(`['Zeta:15','Beta:3','Alfa:','Gama:30','Delta:6'].forEach((x,i)=>{const[n,d]=x.split(':');const c=addCat('pagar',n,d?+d:null);c.lib=true;useCatInMonth(c.id,${y},${mth});ens(c.id,${y},${mth}).items.push({v:(i+1)*10,d:'',ok:true})});save();render()`);
  const nomes = () => app.$$('table.mes')[1].querySelectorAll('tbody tr[data-cat]');
  const lista = () => Array.from(nomes(), r => r.cells[1].childNodes[0].textContent.trim()).filter(n => ['Zeta', 'Beta', 'Alfa', 'Gama', 'Delta'].includes(n));
  const th = col => app.$(`th[data-sort="pagar|${col}"]`);
  assert.equal(app.$$('table.mes thead').length, 2, 'as duas tabelas têm cabeçalho');
  assert.deepEqual(Array.from(app.$$('table.mes')[1].querySelectorAll('thead th'), t => t.textContent.trim()), ['', 'Categoria', 'Dia ▲', 'Valor']);
  assert.deepEqual(lista(), ['Beta', 'Delta', 'Zeta', 'Gama', 'Alfa'], 'ao abrir já vem por dia: 3, 6, 15, 30 e depois quem não tem dia');
  assert.match(th('dia').textContent, /▲/);
  assert.equal(app.ev('mesSort.receber.col'), 'dia', 'as duas tabelas abrem por dia');
  app.click('th[data-sort="pagar|dia"]');
  assert.deepEqual(lista(), ['Gama', 'Zeta', 'Delta', 'Beta', 'Alfa'], 'decrescente: sem dia continua no fim');
  app.click('th[data-sort="pagar|nome"]');
  assert.deepEqual(lista(), ['Alfa', 'Beta', 'Delta', 'Gama', 'Zeta'], 'alfabética');
  app.click('th[data-sort="pagar|valor"]');
  assert.deepEqual(lista(), ['Zeta', 'Beta', 'Alfa', 'Gama', 'Delta'], 'por valor crescente (10, 20, 30, 40, 50)');
  app.click('th[data-sort="pagar|valor"]');
  assert.deepEqual(lista(), ['Delta', 'Gama', 'Alfa', 'Beta', 'Zeta'], 'valor decrescente');
  app.click('th[data-sort="pagar|valor"]');
  assert.equal(app.ev("mesSort.pagar.col"), 'manual', 'o terceiro clique volta à ordem manual');
  assert.equal(app.ev('mesSort.receber.col'), 'dia', 'o outro bloco não é afetado');
  // total fica embaixo da tabela, não no título
  const tab = app.$$('table.mes')[1];
  assert.match(nbsp(tab.querySelector('tfoot').textContent), /Total de despesas.*-R\$/);
  assert.doesNotMatch(app.$$('.panel h2')[1].textContent, /R\$/);
  app.close();
});

test('tela Mês: títulos RECEITAS e DESPESAS; despesa que vence hoje e ainda está prevista ganha destaque', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM'), hoje = new Date().getDate();
  assert.deepEqual(app.$$('.panel.pm h2').map(h => h.textContent), ['RECEITAS', 'DESPESAS']);
  const nova = (nome, dia, tipo = 'pagar') => app.ev(`(()=>{const c=addCat('${tipo}','${nome}',${dia});c.lib=true;useCatInMonth(c.id,${y},${mth});return c.id})()`);
  const prevista = nova('Conta prevista', hoje), paga = nova('Conta paga', hoje), outroDia = nova('Outro dia', hoje === 28 ? 27 : hoje + 1), semItem = nova('Sem item', hoje), receita = nova('Receita hoje', hoje, 'receber');
  const item = (id, ok, info) => app.ev(`ens('${id}',${y},${mth}).items.push({v:100,d:'',ok:${ok}${info ? ',info:true' : ''}})`);
  item(prevista, false); item(prevista, true); item(paga, true); item(outroDia, false); item(receita, false);
  app.ev('save();render()');
  const venc = id => app.$(`tr[data-cat="${id}"]`).classList.contains('venc');
  assert.equal(venc(prevista), true, 'dia = hoje e com item previsto: destaca');
  assert.match(app.$(`tr[data-cat="${prevista}"]`).textContent, /vence hoje/);
  assert.equal(venc(paga), false, 'tudo confirmado: não destaca');
  assert.equal(venc(outroDia), false, 'dia diferente de hoje: não destaca');
  assert.equal(venc(semItem), false, 'sem nenhum item: não destaca');
  assert.equal(venc(receita), false, 'só vale para despesas');
  item(paga, false, true);                                                  // item de cartão (informativo) não conta como previsto
  app.ev('render()'); assert.equal(venc(paga), false);
  app.click(`[data-m="${(mth + 1) % 12}"]`);
  assert.equal(app.$$('tr.venc').length, 0, 'outro mês: nada destacado');
  app.close();
});
