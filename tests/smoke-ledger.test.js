/* Tela Mês → Lançamentos: lista por dia, busca, "sem categoria", janela do lançamento com automação, novo lançamento,
   painel de automações e ícone/cor da categoria. Navegador simulado (jsdom), dados inventados. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp } = require('./helpers/app');

const html = buildHtml('local');
const EMAIL = 'pessoa@exemplo.com', SENHA = 'Segredo#123';

async function entrar(app) {
  app.click('[data-lm="up"]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.type('#lpw2', SENHA);
  app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL, 4000, 'entrar na conta');
}
const catId = (app, tipo, nome) => app.ev(`S.cats.find(c=>c.tipo==='${tipo}'&&c.nome==='${nome}').id`);

test('lançamentos: lista por dia, aviso de "sem categoria", busca, automação e novo lançamento', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.ev(`importStatement('conta',[{dia:10,mes:selM+1,ano:selY,desc:'CONTA VIVO 03/10',valor:-99.9},{dia:5,mes:selM+1,ano:selY,desc:'REMUNERACAO SALARIO',valor:5000}],selY,selM);render()`);

  assert.ok(app.$('[data-mv="lanc"]'), 'alternador Por categoria / Lançamentos');
  assert.equal(app.$$('.lrow').length, 0, 'por padrão mostra por categoria');
  app.click('[data-mv="lanc"]');
  assert.equal(app.$$('.lrow').length, 2);
  assert.match(app.$('.alertb').textContent, /2 lançamentos sem categoria — resolver/);
  assert.deepEqual(app.$$('.lday b').map(b => b.textContent), ['05', '10'], 'agrupado por dia, em ordem');

  app.type('#lq', 'vivo');
  assert.equal(app.$$('.lrow').length, 1, 'a busca filtra a lista sem refazer a tela');
  app.type('#lq', '');

  /* abrir o lançamento e criar a automação */
  app.click(app.$$('.lrow').find(r => /CONTA VIVO/.test(r.textContent)));
  assert.ok(app.$('#lf2'), 'abre a janela do lançamento');
  assert.equal(app.$('#lir').checked, true, '“Lembrar para os próximos” já vem ligado quando está sem categoria');
  assert.equal(app.$('#lit').value, 'conta vivo');
  app.submit('#lf2');
  await app.waitFor(() => /Escolha a categoria/.test(app.$('#lerr').textContent), 2000, 'pede a categoria');
  app.ev(`Combobox.set('lic','${catId(app, 'pagar', 'Moradia')}')`);
  app.submit('#lf2');
  await app.waitFor(() => !app.$('#dlg3').open, 2000, 'janela fecha');
  assert.equal(app.ev('autos().length'), 1);
  assert.equal(app.ev(`lancamentos(selY,selM).find(x=>/VIVO/.test(x.it.d)).cat.nome`), 'Moradia');
  assert.match(app.$('.alertb').textContent, /1 lançamento sem categoria/);

  /* novo lançamento à mão */
  app.click('[data-lnew]');
  app.type('#lid', 'Padaria'); app.type('#liv', '12,50'); app.type('#lia', '20');
  app.ev(`Combobox.set('lic','${catId(app, 'pagar', 'Mercado')}')`);
  app.submit('#lf2');
  await app.waitFor(() => app.$$('.lrow').length === 3, 2000, 'novo lançamento na lista');
  assert.ok(app.$$('.lrow').some(r => /Padaria/.test(r.textContent) && /12,50/.test(r.textContent)));

  /* o painel de automações aparece em Categorias e permite apagar */
  app.click('[data-tab="cat"]');
  assert.match(app.text(), /Automações/);
  assert.match(app.$('.arow').textContent, /conta vivo/);
  app.click('[data-adel]');
  assert.equal(app.ev('autos().length'), 0);
  app.close();
});

test('categoria: ícone e cor escolhidos na janela e mostrados nas telas', async () => {
  const app = openApp({ html });
  await entrar(app);
  app.click('[data-tab="cat"]');
  const id = catId(app, 'pagar', 'Lazer');
  app.click(`[data-cedit="${id}"]`);
  assert.ok(app.$('[data-pico]') && app.$('[data-pcor]'), 'mostra os seletores de ícone e cor');
  app.click('[data-pico="🎮"]'); app.click('[data-pcor="#60a5fa"]');
  assert.match(app.$('#cfvis').textContent, /Escolhido/);
  app.submit('#cf');
  await app.waitFor(() => !app.$('#dlg3').open, 2000, 'janela fecha');
  assert.equal(app.ev(`catById('${id}').ico`), '🎮');
  assert.equal(app.ev(`catById('${id}').cor`), '#60a5fa');
  assert.ok(app.$(`[data-cedit="${id}"] .cico`).textContent.includes('🎮'));
  app.click(`[data-cedit="${id}"]`);
  app.click('[data-pico="🎮"]');                                      // clicar no marcado desmarca (volta ao automático)
  app.submit('#cf');
  await app.waitFor(() => !app.$('#dlg3').open, 2000, 'janela fecha');
  assert.equal(app.ev(`catById('${id}').ico`), undefined);
  app.close();
});

test('resumo do mês atual: quanto pode gastar por dia, o que ainda falta pagar e próximos vencimentos', async () => {
  const app = openApp({ html });
  await entrar(app);
  assert.ok(app.$('.resumo'), 'aparece no mês de hoje');
  const hoje = app.ev('new Date().getDate()'), dias = app.ev('new Date(selY,selM+1,0).getDate()') - hoje + 1;
  app.ev(`const c=S.cats.find(c=>c.tipo==='receber');useCatInMonth(c.id,selY,selM);ens(c.id,selY,selM).items.push({v:3100,d:'',ok:true});
    const p=S.cats.find(c=>c.nome==='Moradia');p.dia=new Date().getDate();useCatInMonth(p.id,selY,selM);ens(p.id,selY,selM).items.push({v:1000,d:'',ok:false});render()`);
  assert.match(app.$('.resumo').textContent, new RegExp(`${dias} dia`));
  assert.match(app.$('.resumo').textContent, /Ainda a pagar.*1 conta/);
  assert.ok(app.$('.resumo .prox button'), 'mostra o próximo vencimento');
  app.click('[data-m="0"]');
  assert.equal(app.$('.resumo'), null, 'em outros meses não aparece');
  app.close();
});
