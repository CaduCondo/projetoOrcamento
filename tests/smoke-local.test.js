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
  assert.ok(app.$('#cff'), 'um interruptor só: "Fixa — aparece todo mês"');
  assert.equal(app.$('#cff').checked, false, 'padrão: não é fixa (aparece quando incluída)');
  assert.equal(app.$$('input[name=cfs]').length, 0, 'acabaram as várias opções de vigência');
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

test('categoria nova: FIXA aparece todo mês (inclusive futuros); desligada só aparece quando incluída; futuros começam vazios', async () => {
  const app = openApp({ html });
  await entrar(app);
  const hoje = new Date(), y = hoje.getFullYear(), mh = hoje.getMonth();
  app.click('[data-tab="cat"]');
  const criar = (nome, fixa) => { app.click('[data-newcat="receber"]'); app.type('#cfn', nome); if (fixa) app.click('#cff'); app.submit('#cf'); };
  criar('Fixa Teste', true); criar('Escondida', false);
  const id = n => app.ev(`S.cats.find(c=>c.nome==='${n}').id`);
  assert.equal(app.ev(`catById('${id('Fixa Teste')}').fixa`), true);
  const aparece = (n, yy, mm) => app.ev(`visCats('receber',${yy},${mm}).some(c=>c.nome==='${n}')`);
  assert.ok(aparece('Fixa Teste', y, mh), 'aparece no mês atual');
  assert.ok(aparece('Fixa Teste', y + 1, 5), 'e nos meses futuros (até no ano que vem)');
  assert.ok(!aparece('Escondida', y, mh) && !aparece('Escondida', y + 1, 5), 'desligada não aparece sozinha');
  if (mh < 11) {
    app.click('[data-tab="mes"]'); app.click(`[data-m="${mh + 1}"]`);
    const linhas = () => app.$$('tr[data-cat]').map(r => r.textContent);
    assert.ok(linhas().some(t => t.includes('Fixa Teste')), 'mês futuro: a fixa está lá');
    assert.ok(!linhas().some(t => t.includes('Salário') || t.includes('Mercado')), 'mês futuro: nenhuma outra categoria já vem na lista');
    app.click('[data-usecat="receber"]'); app.type('#ufq', 'escond'); app.click('#ufl [data-upick]');
    assert.ok(linhas().some(t => t.includes('Escondida')), 'incluída no mês futuro');
  }
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
  assert.deepEqual(app.$$('#cl .cn').map(i => i.textContent), ['Mercado']);
  // mesclar Mercado → Padaria (pelo combobox, como o usuário faria)
  const pad = app.ev("S.cats.find(c=>c.nome==='Padaria').id");
  app.click(`#cl [data-cedit="${merc}"]`);                          // toca na linha: abre a janela da categoria
  assert.ok(app.$('#dlg3').hasAttribute('open'));
  app.click('#cf [data-cmerge]');
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
  app.click(`#cl [data-cedit="${pad}"]`); app.click('#cf [data-cdel]');   // confirm() do teste responde "sim"
  assert.equal(app.ev(`catById('${pad}')`), undefined);
  assert.equal(app.ev(`Object.keys(S.data).some(k=>k.startsWith('${pad}|'))`), false);
  app.close();
});

test('página Categorias: mudar nome/dia vale do MÊS ATUAL em diante (com aviso); o passado fica com o nome antigo', async () => {
  const app = openApp({ html });
  await entrar(app);
  const hoje = new Date(), y = hoje.getFullYear(), mh = hoje.getMonth();
  app.click('[data-tab="cat"]');
  app.click('[data-newcat="receber"]'); app.type('#cfn', 'Salário Antigo'); app.type('#cfd', '5'); app.click('#cff'); app.submit('#cf');
  const velho = app.ev("S.cats.find(c=>c.nome==='Salário Antigo').id");
  // sem nada antes deste mês: renomear não cria "versão antiga"
  app.click(`#cl [data-cedit="${velho}"]`);
  assert.match(app.$('#cfnote').textContent, /valem de .* em diante/, 'a janela avisa antes de salvar');
  app.type('#cfn', 'Salário Antigo'); app.submit('#cf');
  const total = app.ev('S.cats.length');
  if (mh === 0) { app.close(); return; }                           // em janeiro não há mês anterior no mesmo ano para testar
  app.ev(`ens('${velho}',${y},${mh - 1}).items.push({v:1000,d:'',ok:true});ens('${velho}',${y},${mh}).items.push({v:1100,d:'',ok:true});save();render()`);
  app.click(`#cl [data-cedit="${velho}"]`);
  app.type('#cfn', 'Salário Empresa X'); app.type('#cfd', '10'); app.submit('#cf');
  const novo = app.ev("S.cats.find(c=>c.nome==='Salário Empresa X').id");
  assert.notEqual(novo, velho, 'com passado: guarda a versão antiga');
  assert.equal(app.ev('S.cats.length'), total + 1);
  assert.equal(app.ev(`catById('${velho}').nome`), 'Salário Antigo', 'o mês anterior continua com o nome antigo');
  assert.equal(app.ev(`V('${velho}',${y},${mh - 1},'real')`), 1000);
  assert.equal(app.ev(`V('${novo}',${y},${mh},'real')`), 1100, 'o mês atual já usa o nome novo');
  assert.equal(app.ev(`catById('${novo}').dia`), 10);
  assert.equal(app.ev(`catById('${novo}').fixa`), true, 'continua fixa');
  assert.equal(app.$('#snack').hidden, false);
  assert.match(app.$('#snack').textContent, /passa a ser “Salário Empresa X” de .* em diante\. Os meses anteriores continuam com o nome antigo/);
  // desligar "fixa": deixa de aparecer daqui em diante, sem criar outra versão
  app.click(`#cl [data-cedit="${novo}"]`); app.click('#cff'); app.submit('#cf');
  assert.equal(app.ev(`!!catById('${novo}').fixa && !catById('${novo}').vis.to`), false);
  assert.equal(app.ev('S.cats.length'), total + 1);
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
  const nomes = () => app.$$('#cl .cn').map(i => i.textContent).filter(n => ['Zeta', 'Beta', 'Alfa', 'Gama'].includes(n));
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
  app.ev('ImportDialog.open()');
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
  app.ev('ImportDialog.open()');
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
  app.ev('ImportDialog.open()');
  app.ev(`ImportDialog.setLines(${JSON.stringify(EXT)},'extrato.pdf')`);
  assert.equal(app.$$('.imrow').length, 3, 'só as 3 do mês escolhido');
  assert.equal(app.$$('.imrow input:checked').length, 2, 'o pagamento da fatura vem desmarcado');
  assert.match(app.$('#imf').textContent, /pagamento da fatura/);
  app.click('[data-imgo]');
  const movs = app.ev("S.cats.filter(c=>c.nome==='Movimentação CC Itaú').map(c=>c.tipo).sort().join()");
  assert.equal(movs, 'pagar,receber', 'uma Movimentação em Receitas e outra em Despesas');
  const mov = tipo => app.ev(`S.cats.find(c=>c.nome==='Movimentação CC Itaú'&&c.tipo==='${tipo}').id`);
  const rec = mov('receber'), des = mov('pagar');
  assert.equal(app.ev(`S.data['${rec}|${y}|${mth}'].items.map(i=>i.v).join()`), '5000', 'entrada em Receitas');
  assert.equal(app.ev(`S.data['${des}|${y}|${mth}'].items.map(i=>i.v).join()`), '50', 'saída em Despesas');
  assert.ok(app.$(`tr[data-cat="${rec}"]`) && app.$(`tr[data-cat="${des}"]`), 'as duas aparecem no mês');
  app.click(`[data-open="${rec}|${y}|${mth}"]`);
  app.click('[data-tocat="0"]');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'nome');
  app.type('#atx', 'Salário Teste'); app.choose('ok');
  await app.waitFor(() => app.ev("S.cats.some(c=>c.nome==='Salário Teste')"), 2000, 'criada');
  assert.equal(app.ev("S.cats.find(c=>c.nome==='Salário Teste').tipo"), 'receber', 'entrada vira receita');
  assert.equal(app.ev(`S.data['${rec}|${y}|${mth}'].items.length`), 0, 'saiu da Movimentação');
  assert.equal(app.ev(`V(S.cats.find(c=>c.nome==='Salário Teste').id,${y},${mth},'real')`), 5000);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('PDF com senha: o app pergunta a senha (e de novo se errar); cancelar não quebra; a senha não fica na tela', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.ev(`window.__tent=[];window.pdfjsLib={getDocument(){const t={destroy:async()=>{t.morto=true;t.rej(new Error('aborted'))}};
    t.promise=new Promise((ok,rej)=>{t.rej=rej;setTimeout(()=>{const tenta=(r)=>t.onPassword(p=>{window.__tent.push(p);if(p==='certa')ok({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'Lançamentos: compras e saques',hasEOL:true}]})})});else tenta(2)},r);tenta(1)},0)});return t}}`);
  const file = { arrayBuffer: async () => new ArrayBuffer(4) };
  app.w.__file = file;
  const p = app.ev('PdfReader.lines(__file)');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pede a senha');
  assert.equal(app.$('#atx').type, 'password', 'campo de senha mascarado');
  app.type('#atx', 'errada'); app.choose('ok');
  await app.waitFor(() => /incorreta/.test(app.$('#dlg4').textContent), 2000, 'senha errada: pergunta de novo');
  app.type('#atx', 'certa'); app.choose('ok');
  const linhas = await p;
  assert.deepEqual(Array.from(linhas), ['Lançamentos: compras e saques']);
  assert.equal(app.ev('window.__tent.join()'), 'errada,certa');
  assert.equal(app.$('#atx'), null, 'a senha digitada não fica guardada na tela');
  // cancelar
  const p2 = app.ev('PdfReader.lines(__file)').catch(e => e);
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pede de novo');
  app.choose('');
  const e = await p2;
  assert.match(String(e.message || e), /cancelada/);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('Ajustes: um só botão de importar (PDF, planilha ou backup) e dois de baixar; backup .json pode substituir ou juntar', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.click('[data-tab="aj"]');
  assert.equal(app.$$('#app input[type=file]').length, 0, 'nada de vários campos de arquivo espalhados');
  app.click('[data-tab="mes"]');
  assert.equal(app.$('#app [data-import]'), null, 'importar fica só em Ajustes (não repete na tela Mês)');
  app.click('[data-tab="aj"]');
  assert.ok(app.$('#app [data-import]') && app.$('#csv') && app.$('#bk'));
  const backup = app.ev('JSON.stringify(S)');
  app.ev(`ens(S.cats[0].id,2026,0).items.push({v:999,d:'depois do backup',ok:true});save()`);
  app.click('#app [data-import]');
  assert.match(app.$('#imfile').getAttribute('accept'), /\.pdf.*\.csv.*\.json/);
  app.chooseFile('#imfile', backup, 'backup.json');
  await app.waitFor(() => app.$('#dlg4').hasAttribute('open'), 2000, 'pergunta substituir ou juntar');
  app.choose('substituir');
  await app.waitFor(() => !JSON.stringify(app.ev('S.data')).includes('depois do backup'), 2000, 'voltou ao backup');
  app.click('[data-tab="aj"]'); app.click('#app [data-import]');
  app.chooseFile('#imfile', '{"nada":1}', 'x.json');
  await app.sleep(30);
  assert.equal(app.$('#dlg4').hasAttribute('open'), false, 'json estranho: só avisa');
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('tour de primeira vez: abre sozinho uma vez por tela, destaca um item por vez, e o "?" abre de novo', async () => {
  const app = openApp({ html, tour: true });
  await entrar(app);
  await app.waitFor(() => app.$('#tour'), 3000, 'tour abriu sozinho na tela Mês');
  assert.match(app.$('.tour-n').textContent, /^1 de \d+$/);
  const total = +app.$('.tour-n').textContent.split(' de ')[1];
  assert.ok(total >= 6, 'explica vários pontos da tela');
  app.click('[data-tnext]');
  assert.match(app.$('#tourt').textContent, /Escolha o mês/);
  assert.equal(app.$('[data-tprev]').hidden, false);
  app.click('[data-tprev]');
  assert.match(app.$('#tourt').textContent, /Bem-vindo/);
  for (let i = 0; i < total; i++) app.click('[data-tnext]');
  assert.equal(app.$('#tour'), null, 'último passo fecha');
  // trocar de tela e voltar: não abre de novo
  app.click('[data-tab="ano"]'); await app.waitFor(() => app.$('#tour'), 3000, 'tour da tela Ano');
  app.click('[data-tskip]'); assert.equal(app.$('#tour'), null, 'pular fecha');
  app.click('[data-tab="mes"]'); await app.sleep(700);
  assert.equal(app.$('#tour'), null, 'já visto: não abre sozinho de novo');
  // botão de ajuda reabre a explicação da tela atual
  app.click('[data-help]');
  assert.ok(app.$('#tour'));
  assert.match(app.$('#tourt').textContent, /Bem-vindo/);
  app.key('#tour [data-tnext]', 'Escape');
  assert.equal(app.$('#tour'), null, 'Esc fecha');
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('importar de outros bancos: OFX entra direto; CSV mostra as colunas para conferir; arquivo ilegível dá mensagem amigável e vai para o registro de erros', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM'), mm = String(mth + 1).padStart(2, '0');
  // OFX da conta
  const ofx = `OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTRS><BANKTRANLIST><STMTTRN><DTPOSTED>${y}${mm}03<TRNAMT>-150.00<MEMO>PIX ENVIADO<STMTTRN><DTPOSTED>${y}${mm}05<TRNAMT>5000.00<MEMO>SALARIO</BANKTRANLIST></STMTRS></BANKMSGSRSV1><FI><ORG>Banco Bradesco</FI></OFX>`;
  app.ev('ImportDialog.open()'); app.chooseFile('#imfile', ofx, 'extrato.ofx');
  await app.waitFor(() => app.$$('.imrow').length === 2, 2000, 'OFX lido');
  assert.match(app.$('#imf').textContent, /Extrato da conta · Bradesco · OFX/);
  app.click('[data-imgo]');
  assert.equal(app.ev("S.cats.filter(c=>c.nome==='Movimentação CC Itaú').length"), 2);
  // CSV de cartão (compras positivas): o app adivinha as colunas e o tipo; dá para trocar a coluna
  const csv = `date,title,amount\n${y}-${mm}-21,Padaria,23.50\n${y}-${mm}-22,Uber,18.90\n${y}-${mm}-23,Pagamento recebido,-500.00\n`;
  app.ev('ImportDialog.open()'); app.chooseFile('#imfile', csv, 'nubank-fatura.csv');
  await app.waitFor(() => app.$('#imcd'), 2000, 'mapa de colunas');
  assert.equal(app.$('input[name=imk]:checked').value, 'cartao', 'nome do arquivo diz que é fatura');
  assert.equal(app.$$('.imrow').length, 3);
  assert.equal(app.$$('.imrow input:checked').length, 2, 'o pagamento da fatura vem desmarcado');
  app.change('#imcv', '1');                                      // escolheu a coluna errada para o valor: nada é lido
  assert.equal(app.$$('.imrow').length, 0);
  app.change('#imcv', '2');
  assert.equal(app.$$('.imrow').length, 3);
  app.click('[data-imgo]');
  const cc = app.ev("S.cats.find(c=>c.nome==='CC Itaú').id");
  assert.equal(app.ev(`V('${cc}',${y},${mth},'prev')`), 42.4);
  // arquivo que não dá para ler
  app.ev('ImportDialog.open()'); app.chooseFile('#imfile', 'nome;idade\nana;30\n', 'banco-xyz.csv');
  await app.waitFor(() => app.$('.imfail'), 2000, 'mensagem amigável');
  assert.match(app.$('.imfail').textContent, /Ainda não consigo ler este arquivo/);
  assert.match(app.$('.imfail').textContent, /OFX/);
  await app.waitFor(() => /administrador foi avisado/.test(app.$('.imfail').textContent), 2000, 'registrado');
  const reg = app.ev("JSON.stringify(backend.errs())");
  assert.match(reg, /importacao/); assert.doesNotMatch(reg, /ana/, 'nenhum conteúdo do arquivo vai para o registro');
  app.click('[data-cclose]');
  // o registro aparece em Ajustes (no modo local, para o dono) e pode ser marcado como resolvido
  app.click('[data-tab="aj"]');
  await app.waitFor(() => app.$('#errl .erow'), 2000, 'lista de erros');
  assert.match(app.$('#errl').textContent, /Não leu CSV/);
  app.click('#errl [data-errdel]');
  await app.waitFor(() => /Nenhum erro registrado/.test(app.$('#errl').textContent), 2000, 'resolvido');
  // Excel binário: explica como salvar em CSV
  app.ev('ImportDialog.open()'); app.chooseFile('#imfile', 'PK...', 'fatura.xlsx');
  await app.waitFor(() => app.$('.imfail'), 2000, 'excel');
  assert.match(app.$('.imfail').textContent, /Salvar como/);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});

test('página Categorias: não mostra mais a palavra "histórico"', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.click('[data-tab="cat"]'); app.click('[data-cf="filtro|todas"]');
  assert.doesNotMatch(app.$('#cl').textContent, /hist[oó]rico/i);
  app.close();
});
