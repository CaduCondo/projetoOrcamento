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

test('lançamento rápido soma no realizado; sem categoria ou valor não grava', async () => {
  const app = openApp({ html });
  await entrar(app);
  const y = app.ev('selY'), mth = app.ev('selM');
  const merc = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.submit('#qf');                                           // vazio: não faz nada
  assert.equal(app.ev(`MT('pagar',${y},${mth},'prev')`), 0);
  app.ev(`Combobox.set('qc','${merc}')`);
  app.type('#qv', '123456');                                   // máscara: vira 1.234,56
  assert.equal(nbsp(app.$('#qv').value), '1.234,56');
  app.type('#qd', 'feira');
  app.submit('#qf');
  assert.equal(app.ev(`MT('pagar',${y},${mth},'real')`), 1234.56);
  assert.match(nbsp(app.$('.card .v.neg').textContent), /-R\$ 1\.234,56/);        // card "Pago" negativo e vermelho
  assert.match(app.text(), /feira/);
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
  // criar
  app.type('#ncn', 'Padaria'); app.click('[data-cnew]');
  assert.ok(app.ev("S.cats.some(c=>c.nome==='Padaria')"));
  assert.equal(app.$$('#cl .cn').length, 1, 'a busca passou a mostrar só a nova');
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

test('sem erros de script durante os fluxos', async () => {
  const app = openApp({ html });
  await entrar(app);
  for (const t of ['ano', 'graf', 'pat', 'aj', 'mes']) app.click(`[data-tab="${t}"]`);
  assert.deepEqual(app.dom.errors || [], []);
  app.close();
});
