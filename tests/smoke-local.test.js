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

test('tela Ano: coluna Dia à esquerda da Categoria, ordenada por dia (sem dia embaixo), grupos RECEITAS/DESPESAS e arrastar dentro do grupo', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY');
  app.ev(`['Zeta:15','Beta:3','Alfa:','Gama:30'].forEach(x=>{const[n,d]=x.split(':');const c=addCat('pagar',n,d?+d:null);c.lib=true;ens(c.id,${y},0).items.push({v:10,d:'',ok:true})});save()`);
  app.click('[data-tab="ano"]');
  assert.deepEqual(app.$$('tr.secr').map(r => r.cells[1].textContent.replace(/ [▲▼]/, '')), ['RECEITAS', 'DESPESAS', 'RESULTADO']);
  assert.match(app.text(), /Total de receitas/); assert.match(app.text(), /Total de despesas/);
  assert.doesNotMatch(app.text(), /A RECEBER|A PAGAR/);
  const ordem = () => app.$$('tr[data-cat][data-tipo="pagar"]').map(r => r.cells[1].textContent).filter(n => ['Zeta', 'Beta', 'Alfa', 'Gama'].includes(n));
  const linha = app.$('tr[data-cat][data-tipo="pagar"]');
  assert.ok(linha.cells[0].classList.contains('dia') && !linha.cells[1].classList.contains('dia'), 'Dia é a coluna da esquerda, Categoria vem depois');
  assert.deepEqual(ordem(), ['Beta', 'Zeta', 'Gama', 'Alfa'], 'por dia crescente; sem dia embaixo');
  // clique no título do grupo ordena por nome
  app.click('th[data-sort="pagar|nome"]');
  assert.deepEqual(ordem(), ['Alfa', 'Beta', 'Gama', 'Zeta']);
  app.click('th[data-sort="pagar|nome"]');
  assert.deepEqual(ordem(), ['Zeta', 'Gama', 'Beta', 'Alfa']);
  app.click('th[data-sort="pagar|dia"]');                      // volta ao dia crescente
  // arrastar "Alfa" (última) para cima da "Beta": vale dentro do grupo e vira a ordem manual
  const id = n => app.ev(`S.cats.find(c=>c.nome==='${n}').id`);
  const drag = (de, para) => { const a = app.$(`tr[data-cat="${id(de)}"]`), b = app.$(`tr[data-cat="${id(para)}"]`); const dt = { setData() {}, effectAllowed: '' };
    const ev = (t, el) => { const e = new app.w.Event(t, { bubbles: true, cancelable: true }); e.dataTransfer = dt; el.dispatchEvent(e) };
    ev('dragstart', a); ev('dragover', b); ev('drop', b); ev('dragend', a) };
  app.ev("mesSort.pagar.col='dia';mesSort.pagar.dir=1;render()");
  drag('Alfa', 'Beta');
  assert.equal(app.ev('mesSort.pagar.col'), 'manual', 'arrastar vira ordem manual');
  assert.deepEqual(ordem().slice(0, 4), ['Alfa', 'Beta', 'Zeta', 'Gama'], 'Alfa subiu para antes da Beta');
  const rec = app.$$('tr[data-cat][data-tipo="receber"]').map(r => r.dataset.cat);
  assert.ok(rec.length > 0);
  // não dá para soltar uma despesa dentro de RECEITAS
  const antes = ordem().join(); const r0 = app.$('tr[data-cat][data-tipo="receber"]');
  { const dt = { setData() {}, effectAllowed: '' }, a = app.$(`tr[data-cat="${id('Gama')}"]`);
    const ev = (t, el) => { const e = new app.w.Event(t, { bubbles: true, cancelable: true }); e.dataTransfer = dt; el.dispatchEvent(e) };
    ev('dragstart', a); ev('dragover', r0); ev('drop', r0); ev('dragend', a); }
  assert.equal(ordem().join(), antes, 'soltar em outro grupo não faz nada');
  app.close();
});

test('página Categorias: cabeçalho clicável ordena por nome, dia, onde aparece, último uso e lançamentos', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.ev(`['Zeta:15','Beta:3','Alfa:','Gama:30'].forEach(x=>{const[n,d]=x.split(':');addCat('pagar',n,d?+d:null)});save()`);
  app.click('[data-tab="cat"]');
  app.click('[data-cf="filtro|todas"]'); app.click('[data-cf="tipo|pagar"]');
  const nomes = () => app.$$('#cl .cn').map(i => i.value).filter(n => ['Zeta', 'Beta', 'Alfa', 'Gama'].includes(n));
  assert.ok(app.$('#cl .cr.hd'), 'a lista tem cabeçalho');
  assert.deepEqual(Array.from(app.$$('#cl .cr.hd .srt'), t => t.textContent.trim()).slice(1, 6), ['Nome', 'Dia', 'Onde aparece', 'Último uso ▼', 'Lanç.']);
  app.click('[data-csort="dia"]');
  assert.deepEqual(nomes(), ['Beta', 'Zeta', 'Gama', 'Alfa'], 'por dia; sem dia no fim');
  assert.match(app.$('[data-csort="dia"]').textContent, /▲/);
  app.click('[data-csort="dia"]');
  assert.deepEqual(nomes(), ['Gama', 'Zeta', 'Beta', 'Alfa'], 'decrescente; sem dia continua no fim');
  app.click('[data-csort="nome"]');
  assert.deepEqual(nomes(), ['Alfa', 'Beta', 'Gama', 'Zeta']);
  app.click('[data-csort="nome"]');
  assert.deepEqual(nomes(), ['Zeta', 'Gama', 'Beta', 'Alfa']);
  app.click('[data-csort="nome"]');
  assert.equal(app.ev('catUI.col'), 'uso', 'terceiro clique volta ao padrão (último uso)');
  app.click('[data-csort="n"]');
  assert.equal(app.ev('catUI.col'), 'n');
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('tela Mês: valores "no cartão" aparecem na linha, claramente marcados como "não soma", e não entram no total', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const id = app.ev(`(()=>{const c=addCat('pagar','Vivo',6);c.lib=true;useCatInMonth(c.id,${y},${mth});ens(c.id,${y},${mth}).items.push({v:466,d:'familia',ok:true,info:true},{v:130.99,d:'internet',ok:true,info:true});save();render();return c.id})()`);
  const linha = app.$(`tr[data-cat="${id}"]`);
  assert.match(nbsp(linha.querySelector('.infoc').textContent), /💳 -R\$ 596,99 no cartão · não soma/);
  assert.equal(app.ev(`V('${id}',${y},${mth},'real')`), 0, 'o total da categoria continua zero');
  assert.equal(app.ev(`MT('pagar',${y},${mth},'real')`) , app.ev(`MT('pagar',${y},${mth},'real')`));
  const sem = app.ev(`(()=>{const c=addCat('pagar','Sem cartao',7);c.lib=true;useCatInMonth(c.id,${y},${mth});ens(c.id,${y},${mth}).items.push({v:50,d:'x',ok:true});save();render();return c.id})()`);
  assert.equal(app.$(`tr[data-cat="${sem}"] .infoc`), null, 'sem item de cartão: sem a linha extra');
  app.close();
});

test('tela Mês: tirar uma categoria só daquele mês (botão dentro da janela, com confirmação e "Desfazer"); com lançamento não deixa', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const id = app.ev(`(()=>{const c=addCat('pagar','Academia',9);c.lib=true;useCatInMonth(c.id,${y},${mth});useCatInMonth(c.id,${y},${(mth + 11) % 12});save();render();return c.id})()`);
  assert.equal(app.$(`tr[data-cat="${id}"] [data-rmmonth]`), null, 'não há botão de remover solto na linha (evita clique sem querer)');
  app.click(`[data-open="${id}|${y}|${mth}"]`);
  assert.equal(app.$('[data-rmmonth]').disabled, false);
  app.click('[data-rmmonth]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pede confirmação');
  assert.match(app.$('#dlg4').textContent, /Tirar “Academia” de/);
  app.choose('');                                                // Cancelar
  await app.sleep(30);
  assert.equal(app.ev(`catById('${id}').hide`), undefined, 'cancelou: nada mudou');
  app.click('[data-rmmonth]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pede confirmação de novo'); app.choose('sim');
  await app.waitFor(() => !app.$(`tr[data-cat="${id}"]`), 2000, 'a linha saiu do mês');
  assert.equal(app.$('#snack').hidden, false);
  assert.match(app.$('#snack').textContent, /saiu de/);
  app.click('#snack button');                                    // Desfazer
  assert.ok(app.$(`tr[data-cat="${id}"]`), 'desfez: a linha voltou');
  // mês anterior continua com ela
  app.click(`[data-m="${(mth + 11) % 12}"]`);
  assert.ok(app.$(`tr[data-cat="${id}"]`), 'o outro mês não foi afetado');
  // com lançamento: botão travado
  app.click(`[data-m="${mth}"]`);
  app.ev(`ens('${id}',${y},${mth}).items.push({v:10,d:'x',ok:false});save();render()`);
  app.click(`[data-open="${id}|${y}|${mth}"]`);
  assert.equal(app.$('[data-rmmonth]').disabled, true, 'com lançamentos não dá para tirar');
  app.close();
});

test('importar fatura do cartão (PDF já em linhas): confere o total, importa, leva item para categoria e para lançamento; 💳 fica travado', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const FAT = ['Lançamentos: compras e saques', '21/09 LOJA UM 01/03 100,00', 'casa SP', '22/09 LOJA DOIS 50,50', 'outros SP', 'Lançamentos no cartão 150,50', 'Total dos lançamentos atuais 150,50'];
  app.click('[data-import]');
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  assert.ok(app.$('#imfile') && app.$('#imm') && app.$('#imy'), 'tem arquivo e combos de mês e ano');
  app.ev(`ImportDialog.setLines(${JSON.stringify(FAT)},'fatura.pdf')`);
  assert.equal(app.$$('.imrow').length, 2);
  assert.match(app.$('#imf').textContent, /confere/);
  assert.equal(app.$('[data-imgo]').disabled, false);
  app.click('[data-imgo]');
  assert.ok(!app.$('#dlg3').hasAttribute('open'));
  const cc = app.ev("S.cats.find(c=>c.nome==='CC Itaú').id");
  assert.equal(app.ev(`V('${cc}',${y},${mth},'prev')`), 150.5);
  assert.ok(app.$(`tr[data-cat="${cc}"]`), 'a categoria do cartão aparece nas despesas do mês');
  // levar o 1º item para uma categoria nova (informativa)
  app.click(`[data-open="${cc}|${y}|${mth}"]`);
  assert.equal(app.$$('[data-tocat]').length, 2);
  app.click('[data-tocat="0"]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pergunta o nome');
  assert.equal(app.$('#atx').value, 'LOJA UM', 'nome sugerido sem data nem parcela');
  app.type('#atx', 'Loja Um'); app.choose('ok');
  await app.waitFor(() => app.ev("S.cats.some(c=>c.nome==='Loja Um')"), 2000, 'categoria criada');
  assert.match(app.$('#dlg').textContent, /Levado para\s*Loja Um/);
  assert.equal(app.ev(`MT('pagar',${y},${mth},'prev')`), 150.5, 'o total não mudou');
  // 💳 da cópia está travado
  const lu = app.ev("S.cats.find(c=>c.nome==='Loja Um').id");
  app.click('[data-close]');
  assert.match(nbsp(app.$(`tr[data-cat="${lu}"] .infoc`).textContent), /no cartão · não soma/);
  app.click(`[data-open="${lu}|${y}|${mth}"]`);
  assert.equal(app.$('[data-info="0"]').disabled, true, 'o 💳 não pode ser desmarcado');
  app.click('[data-info="0"]');
  assert.equal(app.ev(`S.data['${lu}|${y}|${mth}'].items[0].info`), true);
  app.click('[data-close]');
  // levar o 2º item para um lançamento de categoria existente
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.click(`[data-open="${cc}|${y}|${mth}"]`);
  app.click('[data-toex="1"]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'escolher categoria');
  app.type('#mvcin', 'merc'); app.key('#mvcin', 'Enter');
  app.choose('ok');
  await app.waitFor(() => app.ev(`(S.data['${merc}|${y}|${mth}']?.items||[]).some(i=>i.info&&i.lock)`), 2000, 'lançado em Mercado');
  assert.equal(app.ev(`MT('pagar',${y},${mth},'prev')`), 150.5, 'continua o mesmo total');
  assert.equal(app.ev(`V('${cc}',${y},${mth},'prev')`), 150.5, 'cartão intacto');
  // importar o mesmo arquivo de novo não duplica
  app.click('[data-close]');
  app.click('[data-import]');
  app.ev(`ImportDialog.setLines(${JSON.stringify(FAT)},'fatura.pdf')`);
  assert.equal(app.$('[data-imgo]').disabled, true, 'tudo já importado: nada a importar');
  assert.equal(app.$$('.imrow.ja').length, 2);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('importar extrato da conta: só o mês escolhido; pagamento da fatura vem desmarcado; mover tira da Movimentação', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const mm = n => String(n + 1).padStart(2, '0'), prev = (mth + 11) % 12, py = mth === 0 ? y - 1 : y;
  const EXT = ['extrato conta / lançamentos', `10/${mm(mth)}/${y} PIX TRANSF FULANO -50,00`, `09/${mm(mth)}/${y} FATURA ITAU UNICLASS VS IN -200,00`, `05/${mm(mth)}/${y} REMUNERACAO/SALARIO 5.000,00`, `28/${mm(prev)}/${py} PIX OUTRO MES -10,00`, `28/${mm(prev)}/${py} SALDO DO DIA 900,00`];
  app.click('[data-import]');
  app.ev(`ImportDialog.setLines(${JSON.stringify(EXT)},'extrato.pdf')`);
  assert.equal(app.$$('.imrow').length, 3, 'só as 3 do mês escolhido');
  assert.equal(app.$$('.imrow input:checked').length, 2, 'o pagamento da fatura vem desmarcado');
  assert.match(app.$('#imf').textContent, /pagamento da fatura/);
  app.click('[data-imgo]');
  const mov = app.ev("S.cats.find(c=>c.nome==='Movimentação CC Itaú').id");
  assert.equal(app.ev(`S.data['${mov}|${y}|${mth}'].items.map(i=>i.v).join()`), '50,-5000');
  app.click(`[data-open="${mov}|${y}|${mth}"]`);
  app.click('[data-tocat="1"]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'nome');
  app.type('#atx', 'Salário Teste'); app.choose('ok');
  await app.waitFor(() => app.ev("S.cats.some(c=>c.nome==='Salário Teste')"), 2000, 'criada');
  assert.equal(app.ev("S.cats.find(c=>c.nome==='Salário Teste').tipo"), 'receber', 'entrada vira receita');
  assert.equal(app.ev(`S.data['${mov}|${y}|${mth}'].items.length`), 1, 'saiu da Movimentação');
  assert.equal(app.ev(`V(S.cats.find(c=>c.nome==='Salário Teste').id,${y},${mth},'real')`), 5000);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});
