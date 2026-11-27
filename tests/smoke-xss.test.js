/* Segurança: texto que vem de fora (nome de categoria, descrição, perfil, backup importado, perfil de OUTRA pessoa visto pelo administrador)
   tem que aparecer sempre como TEXTO, nunca virar elemento, atributo de evento ou link "javascript:".
   Como o jsdom não carrega imagens, o teste procura a injeção no próprio HTML gerado: elementos com id "pwn*", atributos on*= e href/src "javascript:". */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHtml, openApp } = require('./helpers/app');
const { createDb, install } = require('./helpers/firebase-mock');

const html = buildHtml('local');
const htmlNuvem = buildHtml('prod');
const EMAIL = 'pessoa@exemplo.com', SENHA = 'Segredo#123';

/* cada texto tenta escapar de um lugar diferente: corpo do HTML, atributo com aspas duplas, com aspas simples, textarea/dialog e link */
const PAYLOADS = [
  '<img id="pwn1" src=x onerror="window.__pwn=1">',
  '"><svg id="pwn2" onload="window.__pwn=2">',
  "' autofocus onfocus='window.__pwn=3",
  '</textarea></dialog></div><b id="pwn4">x</b>',
  'javascript:window.__pwn=5',
];

/* o que de errado apareceu na página (vazio = tudo certo) */
function achados(app, onde) {
  const d = app.d, out = [];
  for (const id of ['pwn1', 'pwn2', 'pwn4']) if (d.getElementById(id)) out.push(`${onde}: apareceu um elemento #${id} que veio do texto`);
  for (const e of d.querySelectorAll('*')) {
    for (const a of e.attributes) {
      if (/^on/i.test(a.name)) out.push(`${onde}: <${e.tagName.toLowerCase()} ${a.name}=...> criado a partir do texto`);
      else if (/__pwn/.test(a.value) && !/^(value|title|alt|aria-label|placeholder|data-.*)$/i.test(a.name)) out.push(`${onde}: atributo ${a.name} com texto injetado em <${e.tagName.toLowerCase()}>`);
      else if (/^(href|src|action|formaction)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) out.push(`${onde}: ${a.name}="javascript:..." em <${e.tagName.toLowerCase()}>`);
    }
  }
  if (app.w.__pwn !== undefined) out.push(`${onde}: código injetado rodou (__pwn=${app.w.__pwn})`);
  return out;
}

async function criarConta(app) {
  app.click('[data-lm="up"]');
  app.type('#lem', EMAIL); app.type('#lpw', SENHA); app.type('#lpw2', SENHA);
  app.submit('#lf');
  await app.waitFor(() => app.ev('user') === EMAIL && app.$('[data-usecat]'), 4000, 'entrar na conta');
}

/* planta o texto perigoso em todos os lugares onde o dono (ou um backup importado) pode escrever */
function plantar(app, p) {
  app.w.__p = p;
  app.ev(`(()=>{const p=window.__p,y=selY,m=selM;
    S.cats=[{id:'x1',tipo:'receber',nome:p,dia:5,ico:p,cor:p},{id:'x2',tipo:'pagar',nome:p,dia:10,ico:p,cor:p}];
    S.data={};S.data['x1|'+y+'|'+m]={items:[{v:100,d:p,ok:true}]};S.data['x2|'+y+'|'+m]={items:[{v:50,d:p,ok:false},{v:5,d:p,ok:true,info:true}]};
    S.saldos=[{nome:p,valor:10}];S.dividas=[{nome:p,valor:20}];S.bens=[{nome:p,valor:30}];
    S.autos=[{id:'a1',txt:p,tipo:'pagar',nome:p}];
    profile={nome:p,profissao:p,nascimento:'1990-01-01',foto:p,email:user};
    render()})()`);
}

function percorrer(app, rotulo) {
  const erros = [];
  for (const tab of ['mes', 'ano', 'graf', 'pat', 'cat', 'aj', 'perfil']) {
    app.click(tab === 'perfil' ? '#hr [data-tab="perfil"]' : `#nav [data-tab="${tab}"]`);   // o cadastro abre pelo menu da foto/nome
    erros.push(...achados(app, `${rotulo}, tela ${tab}`));
  }
  // lista de lançamentos do mês
  app.click('#nav [data-tab="mes"]'); app.click('[data-mv="lanc"]'); erros.push(...achados(app, `${rotulo}, lançamentos`));
  app.click('[data-mv="cat"]');
  // janela dos itens da categoria
  const abrir = app.$('[data-open]'); if (abrir) { app.click(abrir); erros.push(...achados(app, `${rotulo}, janela de itens`)); const f = app.$('[data-close]'); if (f) app.click(f); }
  // janela da categoria (Categorias → toque na linha)
  app.click('#nav [data-tab="cat"]'); const ce = app.$('[data-cedit]'); if (ce) { app.click(ce); erros.push(...achados(app, `${rotulo}, janela da categoria`)); const f = app.$('[data-cclose]'); if (f) app.click(f); }
  return erros;
}

test('texto perigoso em categorias, lançamentos, patrimônio, regras e perfil aparece como texto em todas as telas e janelas', async () => {
  const erros = [], quebras = [];
  for (const [i, p] of PAYLOADS.entries()) {                       // app novo para cada texto: janelas abertas antes deixam resto no HTML
    const app = openApp({ html }); await criarConta(app);
    plantar(app, p); erros.push(...percorrer(app, `texto ${i + 1}`)); quebras.push(...(app.dom.errors || [])); app.close();
  }
  assert.deepEqual([...new Set(erros)], [], 'texto de fora virou código');
  assert.deepEqual(quebras, [], 'o app não pode quebrar com esses textos');
});

test('texto perigoso no identificador da categoria (vem de backup importado) não vira código', async () => {
  const erros = [];
  for (const [i, p] of PAYLOADS.entries()) {
    const app = openApp({ html }); await criarConta(app); app.w.__p = p;
    // caminho real de um backup de fora: o arquivo passa por mig() ao ser carregado (Ajustes → Carregar backup → substituir)
    app.ev(`(()=>{const p=window.__p,y=selY,m=selM,o={anos:[y],saldoIni:{},cats:[{id:p,tipo:'pagar',nome:'Normal',dia:5,prevId:p},{id:'ok1',tipo:p,nome:'Outra',dia:1}],data:{},autos:[{id:p,txt:'abc',tipo:'pagar',nome:'Normal'}]};
      o.data[p+'|'+y+'|'+m]={items:[{v:50,d:'ok',ok:true}]};o.data['ok1|'+y+'|'+m]={items:[{v:5,d:'ok',ok:true}]};
      S=mig(JSON.parse(JSON.stringify(o)));initSelection();render()})()`);
    assert.ok(app.ev("S.cats.every(c=>/^[A-Za-z0-9_-]+$/.test(c.id)&&(c.tipo==='receber'||c.tipo==='pagar'))"), 'ids e tipos ficaram seguros');
    assert.equal(app.ev("Object.keys(S.data).length"), 2, 'os lançamentos acompanharam o id novo');
    erros.push(...percorrer(app, `id ${i + 1}`)); app.close();
  }
  assert.deepEqual([...new Set(erros)], [], 'identificador de fora virou código');
});

test('administrador vendo o perfil de OUTRA pessoa: nome, profissão e foto com texto perigoso não viram código', async () => {
  const criar = async (app, email) => {
    await app.waitFor(() => app.$('#lf'), 3000, 'login');
    app.click('[data-lm="up"]'); app.type('#lem', email); app.type('#lpw', SENHA); app.type('#lpw2', SENHA); app.submit('#lf');
    await app.waitFor(() => app.ev('user') === email && app.$('[data-usecat]'), 4000, 'entrou');
  };
  const erros = [];
  for (const [i, p] of PAYLOADS.entries()) {
    const d2 = createDb();
    const ana = openApp({ html: htmlNuvem, setup: w => install(w, d2) }); await criar(ana, 'ana@exemplo.com'); ana.close(); d2.current = null;
    // a Ana (ou um atacante com o login dela) grava direto no banco um perfil com texto perigoso, sem passar pela tela
    d2.docs['profiles/uid1'] = { email: 'ana@exemplo.com', nome: p, profissao: p, nascimento: '1990-05-01', foto: p, storage: 'cloud', lembretes: 0 };
    d2.docs['admins/uid2'] = { ativo: true };
    const adm = openApp({ html: htmlNuvem, setup: w => install(w, d2) }); await criar(adm, 'dono@exemplo.com');
    adm.click('#nav [data-tab="aj"]'); adm.click('[data-adm="abrir"]');
    await adm.waitFor(() => adm.$$('.urow').length >= 1, 3000, 'lista de usuários');
    erros.push(...achados(adm, `perfil de outra pessoa ${i + 1}, lista`));
    assert.ok(adm.$('#dlg5').textContent.includes(p), 'controle: o texto aparece na lista como TEXTO (senão o teste não está olhando o lugar certo)');
    const u = adm.$('[data-adm-user="uid1"]'); if (u) { adm.click(u); await adm.sleep(80); erros.push(...achados(adm, `perfil de outra pessoa ${i + 1}, dados vistos`)); }
    adm.close();
  }
  assert.deepEqual([...new Set(erros)], [], 'perfil de outra pessoa virou código no navegador do administrador');
});

test('foto do perfil: só imagem em base64 é aceita; qualquer outra coisa é recusada e nunca vira atributo', async () => {
  const app = openApp({ html }); await criarConta(app);
  const ok = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMD';
  assert.equal(app.ev(`fotoSegura(${JSON.stringify(ok)})`), true);
  for (const ruim of ['x" onerror="window.__pwn=6', 'javascript:alert(1)', 'https://exemplo.com/a.png', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', ok + '"', ok + ' onerror=1', '', null, 5])
    assert.equal(app.ev(`fotoSegura(${JSON.stringify(ruim)})`), false, 'recusar: ' + ruim);
  assert.match(app.ev(`validateProfile({...defaultProfile(),foto:'x" onerror="1'})`) || '', /imagem válida/, 'o cadastro também recusa');
  app.close();
});

test('backup com ícone e cor perigosos: ícone fora da lista e cor que não é hexadecimal são ignorados', async () => {
  const app = openApp({ html }); await criarConta(app);
  assert.equal(app.ev(`catIco({nome:'Qualquer',ico:'<img id="pwn1" src=x>'})`).includes('<'), false);
  assert.equal(app.ev(`catBadge({tipo:'pagar',nome:'x',ico:'<b>',cor:'red;background:url(javascript:1)'})`).includes('style='), false, 'cor inválida não entra no estilo');
  assert.match(app.ev(`catBadge({tipo:'pagar',nome:'x',cor:'#ef4444'})`), /style="background:#ef4444"/, 'cor válida continua funcionando');
  assert.equal(app.ev(`catIco({nome:'Mercado',ico:ICONES[0]})`), app.ev('ICONES[0]'), 'ícone da lista continua funcionando');
  app.close();
});
