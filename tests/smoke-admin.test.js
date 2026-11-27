const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp } = require('./helpers/app');
const { createDb, install } = require('./helpers/firebase-mock');

const html = buildHtml('prod');
const SENHA = 'Segredo#123';
const abrir = db => openApp({ html, setup: w => install(w, db) });

async function criarConta(app, email) {
  await app.waitFor(() => app.$('#lf'), 3000, 'tela de login');
  app.click('[data-lm="up"]'); app.type('#lem', email); app.type('#lpw', SENHA); app.type('#lpw2', SENHA); app.submit('#lf');
  await app.waitFor(() => app.ev('user') === email && app.ev('S') && app.$('[data-usecat]'), 4000, 'tela carregada');
}
const lancar = (app, digitos, desc) => {
  app.click('[data-tab="mes"]');
  const y = app.ev('selY'), m = app.ev('selM'), c = app.ev("S.cats.find(c=>c.nome==='Mercado').id");
  app.click(`[data-open="${c}|${y}|${m}"]`); app.type('#nv', digitos); app.type('#nd', desc); app.click('[data-add]'); app.click('[data-close]');
};

/* cenário: Ana (nuvem, com dados), Bia (só no aparelho, sem dados no banco) e o administrador (uid2, já registrado como admin) */
async function cenario() {
  const db = createDb();
  const ana = abrir(db); await criarConta(ana, 'ana@exemplo.com');
  ana.click('[data-tab="perfil"]'); ana.type('#pfn', 'Ana Souza'); ana.type('#pfb', '1990-05-01'); ana.type('#pfp', 'Contadora'); ana.click('[data-pf="salvar"]');
  await ana.waitFor(() => db.docs['profiles/uid1'].nome === 'Ana Souza', 3000, 'perfil da Ana');
  lancar(ana, '12345', 'segredo-da-ana'); await ana.ev('backend.flush()');
  assert.ok(JSON.stringify(db.docs).includes('segredo-da-ana'));
  ana.close(); db.current = null;
  db.docs['profiles/uid9'] = { email: 'bia@exemplo.com', nome: 'Bia Lima', storage: 'local', lembretes: 0 };      // Bia: só no aparelho
  db.docs['admins/uid2'] = { ativo: true };                                                                         // o administrador (o próximo uid)
  const adm = abrir(db); await criarConta(adm, 'dono@exemplo.com');
  assert.equal(adm.ev('backend.uid'), 'uid2');
  return { db, adm };
}

test('administrador: vê o botão "Usuários"; um usuário comum não vê', async () => {
  const { db, adm } = await cenario();
  assert.ok(adm.$('[data-adm="abrir"]'), 'o administrador tem o botão');
  adm.close(); db.current = null;
  const ana = abrir(db); await ana.waitFor(() => ana.$('#lf'), 3000, 'login');
  ana.type('#lem', 'ana@exemplo.com'); ana.type('#lpw', SENHA); ana.submit('#lf');
  await ana.waitFor(() => ana.ev('user') === 'ana@exemplo.com' && ana.$('[data-usecat]'), 4000, 'Ana entrou');
  assert.equal(ana.$('[data-adm="abrir"]'), null, 'usuário comum não tem o botão');
  assert.equal(ana.ev('backend.isAdmin'), false);
  ana.close();
});

test('lista de usuários: nome (ou e-mail), olho aberto = nuvem, olho riscado = só no aparelho; busca', async () => {
  const { adm } = await cenario();
  adm.click('[data-adm="abrir"]');
  await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista carregada');
  const linhas = adm.$$('.urow');
  assert.deepEqual(linhas.map(r => r.querySelector('b').textContent), ['Ana Souza', 'Bia Lima'], 'mostra o nome, em ordem');
  assert.match(linhas[0].textContent, /ana@exemplo\.com/, 'e o e-mail embaixo');
  assert.ok(linhas[0].querySelector('.eye.on') && !linhas[0].querySelector('.eye.off'), 'Ana: olho aberto (nuvem)');
  assert.ok(linhas[1].querySelector('.eye.off') && !linhas[1].querySelector('.eye.on'), 'Bia: olho riscado (só no aparelho)');
  assert.ok(linhas[1].querySelector('.eye.off svg line'), 'o olho riscado tem o traço atravessado');
  assert.ok(!adm.$$('.urow').some(r => /dono@exemplo/.test(r.textContent)), 'o próprio administrador não aparece na lista');
  adm.type('#admq', 'bia'); assert.equal(adm.$$('.urow').length, 1);
  adm.type('#admq', 'xyz'); assert.equal(adm.$$('.urow').length, 0);
  adm.close();
});

test('usuário que guarda só no aparelho: não abre (não há dados no sistema) e explica', async () => {
  const { adm } = await cenario();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid9"]');
  await adm.waitFor(() => /só no aparelho/.test(adm.$('#admmsg')?.textContent || ''), 3000, 'mensagem');
  assert.equal(adm.ev('readOnly'), false, 'não entrou em modo leitura');
  adm.close();
});

test('SOMENTE LEITURA: vê todos os dados da pessoa, nada é alterável e NADA é gravado no banco', async () => {
  const { db, adm } = await cenario();
  const meusDocsAntes = Object.keys(db.docs).filter(k => k.startsWith('users/uid2')).sort().join();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]');
  await adm.waitFor(() => adm.ev('readOnly') === true && adm.$('.robar'), 3000, 'modo leitura');
  assert.match(adm.$('.robar').textContent, /somente leitura/i);
  assert.match(adm.$('.robar').textContent, /Ana Souza/);
  assert.ok(JSON.stringify(adm.ev('S.data')).includes('segredo-da-ana'), 'vê os lançamentos da Ana');
  // telas: Mês, Ano, Gráficos, Patrimônio, Ajustes e Perfil funcionam
  for (const t of ['ano', 'graf', 'pat', 'aj', 'perfil', 'mes']) { adm.click(`[data-tab="${t}"]`); assert.equal(adm.ev('tab'), t); }
  adm.click('[data-tab="perfil"]');
  assert.equal(adm.$('#pfn').value, 'Ana Souza'); assert.equal(adm.$('#pfe').value, 'ana@exemplo.com'); assert.equal(adm.$('#pfp').value, 'Contadora');
  assert.equal(adm.$('#pfn').disabled, true, 'cadastro dela bloqueado para edição');
  // tudo que altera está desabilitado
  adm.click('[data-tab="mes"]');
  assert.ok(adm.$$('[data-usecat]').every(b => b.disabled), 'botões de nova categoria bloqueados');
  assert.ok(adm.$$('tr[data-cat]').every(r => r.draggable === false), 'não dá para arrastar linhas');
  adm.click('[data-tab="cat"]');
  assert.ok(adm.$$('#app [data-newcat],#app [data-cedit],#app [data-cdel],#app [data-cmerge]').every(e => e.disabled), 'na página Categorias nada altera');
  adm.click('[data-tab="aj"]');
  const mut = adm.$$('#app input:not([type=search]),#app select,#app button').filter(e => !e.matches('[data-tab],[data-m],[data-modo],#per,#ysel,[data-open],[data-close],[data-na],[data-adm],[data-logout]'));
  assert.ok(mut.length >= 3 && mut.every(e => e.disabled), 'em Ajustes tudo está bloqueado: ' + mut.filter(e => !e.disabled).map(e => e.outerHTML.slice(0, 60)).join(' | '));
  // a janela de itens abre para olhar, mas sem poder alterar
  adm.click('[data-tab="mes"]');
  const y = adm.ev('selY'), m = adm.ev('selM'), c = adm.ev("S.cats.find(c=>c.nome==='Mercado').id");
  adm.click(`[data-open="${c}|${y}|${m}"]`);
  assert.ok(adm.$('#dlg').hasAttribute('open'));
  assert.ok(adm.$$('#dlg input,#dlg button:not([data-close])').every(e => e.disabled), 'janela de itens toda bloqueada');
  assert.ok(adm.$('#dlg [data-close]') && !adm.$('#dlg [data-close]').disabled, 'só dá para fechar');
  adm.click('[data-close]');
  // mesmo "à força" (código), nada é gravado
  const escritas = db.dataWrites.length, perfis = JSON.stringify(db.docs['profiles/uid1']);
  adm.ev(`ens('${c}',${y},${m}).items.push({v:999,d:'invasor',ok:true});save();backend.save()`);
  await adm.ev('backend.flush()'); await adm.sleep(900);
  assert.equal(db.dataWrites.length, escritas, 'nenhuma gravação em users/ durante a visualização');
  assert.ok(!JSON.stringify(db.docs).includes('invasor'));
  assert.equal(JSON.stringify(db.docs['profiles/uid1']), perfis, 'cadastro intacto');
  assert.equal(Object.keys(db.docs).filter(k => k.startsWith('users/uid2')).sort().join(), meusDocsAntes, 'e nada dela foi parar nos dados do administrador');
  adm.close();
});

test('voltar aos meus dados: o administrador reencontra os próprios dados, intactos e sem mistura', async () => {
  const { db, adm } = await cenario();
  lancar(adm, '5000', 'meu-lancamento'); await adm.ev('backend.flush()');
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]'); await adm.waitFor(() => adm.ev('readOnly') === true, 3000, 'leitura');
  assert.ok(!JSON.stringify(adm.ev('S.data')).includes('meu-lancamento'), 'em leitura vê só os dados da Ana');
  adm.click('[data-adm="sair"]');
  assert.equal(adm.ev('readOnly'), false);
  assert.equal(adm.$('.robar'), null);
  assert.ok(JSON.stringify(adm.ev('S.data')).includes('meu-lancamento'), 'voltou aos próprios dados');
  assert.ok(!JSON.stringify(adm.ev('S.data')).includes('segredo-da-ana'), 'sem nada da Ana misturado');
  lancar(adm, '100', 'depois-de-voltar'); await adm.ev('backend.flush()');
  assert.ok(JSON.stringify(db.docs).includes('depois-de-voltar'), 'volta a poder gravar normalmente');
  const meus = Object.entries(db.docs).filter(([k]) => k.startsWith('users/uid2')).map(([, v]) => v.json).join('');
  assert.ok(!meus.includes('segredo-da-ana'), 'os dados do administrador no banco não têm nada da Ana');
  adm.close();
});

test('o administrador pode sair da conta durante a visualização sem levar dados da pessoa', async () => {
  const { db, adm } = await cenario();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]'); await adm.waitFor(() => adm.ev('readOnly') === true, 3000, 'leitura');
  adm.click('[data-logout]');
  await adm.waitFor(() => adm.$('#lf') && adm.ev('user') === null, 3000, 'saiu');
  assert.equal(adm.ev('readOnly'), false);
  assert.equal(adm.ev('viewing'), null);
  assert.ok(!Object.entries(db.docs).filter(([k]) => k.startsWith('users/uid2')).some(([, v]) => v.json.includes('segredo-da-ana')));
  adm.close();
});

test('registro de erros: nuvem avisa sozinho; "só no aparelho" só com o botão; só o administrador vê em Ajustes, sem dados financeiros', async () => {
  const db = createDb();
  const ana = abrir(db); await criarConta(ana, 'ana@exemplo.com');
  ana.ev("profile={...profile,storage:'cloud'}");
  assert.equal(await ana.ev("ErrorLog.report('importacao','Não leu PDF de Bradesco: sem lançamentos',{arquivo:'pdf',banco:'Bradesco'})"), true);
  const erros = () => Object.entries(db.docs).filter(([k]) => k.startsWith('errors/')).map(([, v]) => v);
  assert.equal(erros().length, 1);
  assert.deepEqual(Object.keys(erros()[0]).sort(), ['agente', 'email', 'env', 'info', 'msg', 'quando', 'tela', 'tipo', 'uid'].sort(), 'só esses campos (nada de lançamentos)');
  assert.equal(erros()[0].email, 'ana@exemplo.com');
  ana.ev("profile={...profile,storage:'local'}");
  assert.equal(await ana.ev("ErrorLog.report('importacao','outro erro',{})"), false, 'quem guarda só no aparelho não envia nada sozinho');
  assert.equal(erros().length, 1);
  assert.equal(await ana.ev("ErrorLog.report('importacao','outro erro',{},true)"), true, 'com o botão (consentimento), envia');
  assert.equal(erros().length, 2);
  ana.click('[data-tab="aj"]');
  assert.equal(ana.$('#errp'), null, 'usuário comum não vê o registro');
  ana.close(); db.current = null;
  db.docs['admins/uid2'] = { ativo: true };
  const adm = abrir(db); await criarConta(adm, 'dono@exemplo.com');
  adm.click('[data-tab="aj"]');
  await adm.waitFor(() => adm.$$('#errl .erow').length === 2, 3000, 'administrador vê os erros');
  assert.match(adm.$('#errl').textContent, /ana@exemplo\.com/);
  assert.match(adm.$('#errl').textContent, /banco: Bradesco/);
  adm.click('#errl [data-errdel]');
  await adm.waitFor(() => adm.$$('#errl .erow').length === 1, 3000, 'resolvido some');
  adm.close();
});

test('Buscar do banco: só o administrador vê; busca pelo porteiro com o token do login; cartão confere a fatura; conta cai em Receitas/Despesas', async () => {
  const { db, adm } = await cenario();
  const y = adm.ev('selY'), mm = String(adm.ev('selM') + 1).padStart(2, '0'), chamadas = [];
  const dados = { ok: true,
    contas: [{ id: 'cc1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'itau', number: '26-8', balance: 1000 }, { id: 'ct1', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Visa', number: '0498', balance: 100 }],
    lancamentos: {
      cc1: [{ id: 'x1', date: `${y}-${mm}-05`, description: 'SALARIO', amount: 5000, type: 'CREDIT' }, { id: 'x2', date: `${y}-${mm}-06`, description: 'PIX LOJA', amount: -150, type: 'DEBIT' },
        { id: 'x3', date: `${y}-${mm}-07`, description: 'REND PAGO APLIC AUT MAIS', amount: 0.05, type: 'CREDIT' }, { id: 'x4', date: `${y}-${mm}-08`, description: 'REND PAGO APLIC AUT MAIS', amount: 0.07, type: 'CREDIT' }],
      ct1: [{ id: 'y1', date: `${y}-${mm}-02`, description: 'LOJA UM', amount: 100, type: 'DEBIT', billId: 'b1' }, { id: 'y2', date: `${y}-${mm}-03`, description: 'LOJA DOIS', amount: 20.5, type: 'DEBIT', billId: 'b1' }] },
    faturas: { ct1: [{ id: 'b1', dueDate: `${y}-${mm}-09`, totalAmount: 120.5 }] } };
  adm.w.fetch = async (url, init) => { chamadas.push({ url, init }); return { ok: true, status: 200, json: async () => dados }; };
  adm.click('[data-tab="aj"]');
  assert.ok(adm.$('[data-bank]'), 'administrador vê o botão');
  adm.click('[data-bank]');
  adm.type('#bkurl', 'https://porteiro.exemplo.workers.dev'); adm.change('#bkurl', 'https://porteiro.exemplo.workers.dev');
  adm.click('[data-bkload]');
  await adm.waitFor(() => adm.$$('input[name=bkc]').length === 2, 3000, 'contas listadas');
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, 'https://porteiro.exemplo.workers.dev');
  assert.equal(chamadas[0].init.headers.Authorization, 'Bearer token-uid2', 'o crachá do login vai junto');
  assert.match(chamadas[0].init.body, /"de":"\d{4}-\d{2}-\d{2}","ate":"\d{4}-\d{2}-\d{2}"/);
  // cartão: escolhe a fatura e confere o total
  adm.click('input[name=bkc][value=ct1]');
  assert.ok(adm.$('#bkbill'), 'lista de faturas do cartão');
  adm.click('[data-bkgo]');
  assert.match(adm.$('#imf').textContent, /direto do banco \(Meu Pluggy\)/);
  assert.match(adm.$('#imf').textContent, /confere/);
  assert.equal(adm.$$('.imrow').length, 2);
  adm.click('[data-imgo]');
  const cc = adm.ev("S.cats.find(c=>c.nome==='CC Itaú').id");
  assert.equal(adm.ev(`V('${cc}',${y},${adm.ev('selM')},'prev')`), 120.5);
  // depois de importar volta para a escolha de contas (sem recomeçar) e avisa o que foi feito
  assert.ok(adm.$('#bkf'), 'a janela do banco continua aberta');
  assert.equal(adm.$$('input[name=bkc]').length, 2, 'as contas continuam listadas');
  assert.match(adm.$('#bkf .okmsg').textContent, /importado/);
  assert.equal(chamadas.length, 1, 'não buscou de novo no banco');
  // conta corrente: extrato do mês, rendimentos somados
  adm.click('input[name=bkc][value=cc1]');
  adm.click('[data-bkgo]');
  assert.equal(adm.$$('.imrow').length, 3, 'salário, pix e UM lançamento de rendimentos');
  adm.click('[data-imgo]');
  const movs = adm.ev("S.cats.filter(c=>c.nome==='Movimentação CC Itaú').map(c=>c.tipo).sort().join()");
  assert.equal(movs, 'pagar,receber');
  assert.deepEqual(adm.dom.errors || [], []);
  adm.close(); db.current = null;
  // usuário comum não vê o painel
  const ana = abrir(db); await criarConta(ana, 'ana2@exemplo.com'); ana.click('[data-tab="aj"]');
  assert.equal(ana.$('[data-bank]'), null, 'quem não é administrador não vê');
  ana.close();
});

/* ---- endereço do porteiro lembrado em todos os aparelhos (#50) ---- */
const PORTEIRO = 'https://orcamento-banco.exemplo.workers.dev';
const docBanco = db => db.docs['users/uid2/config/banco'] && JSON.parse(db.docs['users/uid2/config/banco'].json).url;

test('porteiro: o endereço digitado fica na nuvem do dono e aparece sozinho num aparelho novo', async () => {
  const { db, adm } = await cenario();
  adm.click('[data-tab="aj"]'); adm.click('[data-bank]');
  assert.equal(adm.$('#bkurl').value, '', 'aparelho novo: começa vazio');
  adm.type('#bkurl', PORTEIRO); adm.change('#bkurl', PORTEIRO);
  await adm.waitFor(() => docBanco(db) === PORTEIRO, 3000, 'gravou na nuvem');
  assert.deepEqual(Object.keys(db.docs['users/uid2/config/banco']), ['json'], 'só o campo json (as regras do banco já permitem)');
  // outro aparelho (navegador novo, sem nada guardado): entra com a mesma conta
  adm.close(); db.current = null;
  const outro = abrir(db);
  await outro.waitFor(() => outro.$('#lf'), 3000, 'login');
  outro.type('#lem', 'dono@exemplo.com'); outro.type('#lpw', SENHA); outro.submit('#lf');
  await outro.waitFor(() => outro.ev('user') === 'dono@exemplo.com' && outro.$('[data-usecat]'), 4000, 'entrou');
  assert.equal(outro.ev("BankSync.url()"), '', 'este aparelho ainda não conhece o endereço');
  outro.click('[data-tab="aj"]'); outro.click('[data-bank]');
  await outro.waitFor(() => outro.$('#bkurl').value === PORTEIRO, 3000, 'o campo se preenche sozinho');
  assert.equal(outro.ev("BankSync.url()"), PORTEIRO, 'e fica guardado neste aparelho também');
  outro.close();
});

test('porteiro: trocar o endereço vale nos dois lugares; endereço que não é https não vai para a nuvem', async () => {
  const { db, adm } = await cenario();
  adm.click('[data-tab="aj"]'); adm.click('[data-bank]');
  adm.type('#bkurl', PORTEIRO); adm.change('#bkurl', PORTEIRO);
  await adm.waitFor(() => docBanco(db) === PORTEIRO, 3000, 'primeiro endereço');
  adm.type('#bkurl', 'https://novo.exemplo.workers.dev'); adm.change('#bkurl', 'https://novo.exemplo.workers.dev');
  await adm.waitFor(() => docBanco(db) === 'https://novo.exemplo.workers.dev', 3000, 'troca na nuvem');
  assert.equal(adm.ev('BankSync.url()'), 'https://novo.exemplo.workers.dev');
  adm.type('#bkurl', 'http://inseguro.exemplo.com'); adm.change('#bkurl', 'http://inseguro.exemplo.com');
  await adm.sleep(50);
  assert.equal(docBanco(db), 'https://novo.exemplo.workers.dev', 'http (sem cadeado) não é guardado na nuvem');
  adm.close();
});

test('porteiro: quem guarda só no aparelho nunca grava o endereço na nuvem, e apagar os dados da nuvem apaga o endereço também', async () => {
  const { db, adm } = await cenario();
  adm.ev("BankSync.setUrl('" + PORTEIRO + "')");
  await adm.waitFor(() => docBanco(db) === PORTEIRO, 3000, 'na nuvem (modo nuvem)');
  await adm.ev('backend.store.deleteAll()');
  assert.equal(db.docs['users/uid2/config/banco'], undefined, 'apagar os dados da nuvem leva o endereço junto');
  adm.ev("backend.store = new DeviceStore('uid2')");                      // simula a escolha "só neste aparelho"
  adm.ev("BankSync.setUrl('" + PORTEIRO + "')"); await adm.sleep(50);
  assert.equal(db.docs['users/uid2/config/banco'], undefined, 'só no aparelho: nada vai para o banco');
  assert.equal(adm.ev('BankSync.url()'), PORTEIRO, 'mas fica no aparelho');
  adm.close();
});

test('porteiro: sem internet usa o que está no aparelho, sem erro', async () => {
  const { db, adm } = await cenario();
  adm.ev("BankSync.setUrl('" + PORTEIRO + "')"); await adm.waitFor(() => docBanco(db) === PORTEIRO, 3000, 'gravou');
  db.failDirect = true;                                                    // o banco "cai"
  adm.click('[data-tab="aj"]'); adm.click('[data-bank]'); await adm.sleep(80);
  assert.equal(adm.$('#bkurl').value, PORTEIRO, 'o campo continua preenchido pelo aparelho');
  assert.deepEqual(adm.dom.errors || [], []);
  adm.close();
});

test('administrador em modo leitura: os botões que só mudam a visão (Por categoria / Lançamentos, filtros, busca) continuam funcionando; os que alteram dados ficam bloqueados', async () => {
  const { adm } = await cenario();
  adm.click('[data-adm="abrir"]'); await adm.waitFor(() => adm.$$('.urow').length === 2, 3000, 'lista');
  adm.click('[data-adm-user="uid1"]'); await adm.waitFor(() => adm.ev('readOnly') === true, 3000, 'leitura');
  adm.click('[data-tab="mes"]');
  assert.equal(adm.$('[data-mv="lanc"]').disabled, false, 'o botão Lançamentos não pode ficar bloqueado');
  adm.click('[data-mv="lanc"]');
  assert.ok(adm.$('#ll'), 'a lista de lançamentos abre');
  assert.equal(adm.$('#lq').disabled, false, 'a busca funciona');
  assert.ok(adm.$$('[data-lf]').every(b => !b.disabled), 'os filtros funcionam');
  assert.equal(adm.$('[data-lnew]').disabled, true, 'novo lançamento continua bloqueado');
  adm.close();
});

test('porteiro respondeu 429 (muitos pedidos): o app mostra a mensagem do porteiro, com os segundos de espera, e não quebra', async () => {
  const { adm } = await cenario();
  adm.w.fetch = async () => ({ ok: false, status: 429, json: async () => ({ ok: false, erro: 'Muitos pedidos. Espere 42 segundos e tente de novo.' }) });
  adm.click('[data-tab="aj"]'); adm.click('[data-bank]');
  adm.type('#bkurl', PORTEIRO); adm.change('#bkurl', PORTEIRO);
  adm.click('[data-bkload]');
  await adm.waitFor(() => /Muitos pedidos. Espere 42 segundos/.test(adm.$('#bkerr').textContent), 3000, 'mensagem do porteiro');
  assert.equal(adm.$$('input[name=bkc]').length, 0, 'nenhuma conta listada');
  assert.deepEqual(adm.dom.errors || [], [], 'o app não quebrou');
  adm.close();
});

