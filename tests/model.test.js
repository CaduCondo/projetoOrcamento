const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModel, sampleState } = require('./helpers/model');

const m = loadModel();
const fresh = () => { m.S = sampleState(m); m.modo = 'real'; m.catSel = ''; return m.S; };

test('parseV entende formatos brasileiros e americanos', () => {
  assert.equal(m.parseV('1.234,56'), 1234.56);
  assert.equal(m.parseV('R$ 1.234,56'), 1234.56);
  assert.equal(m.parseV('1234.56'), 1234.56);
  assert.equal(m.parseV('1.234'), 1234);        // ponto de milhar
  assert.equal(m.parseV('12,5'), 12.5);
  assert.equal(m.parseV('-3,00'), -3);
  assert.equal(m.parseV(''), 0);
  assert.equal(m.parseV('abc'), 0);
});

test('formatação de valores', () => {
  assert.equal(m.fmtN(1234.5).replace(/ /g, ' '), '1.234,50');
  assert.equal(m.fmtN(0), '');
  assert.equal(m.R$(-10).replace(/ /g, ' '), '-R$ 10,00');
  assert.equal(m.RP(10).replace(/ /g, ' '), '-R$ 10,00');   // a pagar sempre negativo
  assert.equal(m.RP(0).replace(/ /g, ' '), 'R$ 0,00');       // zero sem sinal
  assert.equal(m.moneyFor('receber', 5).replace(/ /g, ' '), 'R$ 5,00');
  assert.equal(m.moneyFor('pagar', 5).replace(/ /g, ' '), '-R$ 5,00');
  assert.equal(m.K(1500).replace(/ /g, ' '), '1,5k');
  assert.equal(m.K(999), '999');
  assert.equal(m.esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
});

test('normName ignora acentos, maiúsculas e espaços repetidos', () => {
  assert.equal(m.normName('  LUZ   Casa '), 'luz casa');
  assert.equal(m.normName('Prestação APE'), 'prestacao ape');
});

test('parseKey separa categoria, ano e mês', () => {
  assert.deepEqual({ ...m.parseKey('abc|2026|7') }, { c: 'abc', y: 2026, m: 7 });
});

test('realizado soma só itens marcados; previsto soma tudo; "info" nunca soma', () => {
  fresh();
  assert.equal(m.V('sal', 2026, 0, 'real'), 5000);
  assert.equal(m.V('sal', 2026, 0, 'prev'), 6000);
  assert.equal(m.V('luz', 2026, 0, 'prev'), 200);          // 80 está no cartão (info): fora dos dois
  assert.equal(m.V('luz', 2026, 0, 'real'), 200);
  assert.equal(m.V('sal', 2026, 1, 'prev'), 0);             // célula inexistente
});

test('totais do mês e saldo', () => {
  fresh();
  assert.equal(m.MT('receber', 2026, 0, 'real'), 5000);
  assert.equal(m.MT('pagar', 2026, 0, 'real'), 1700);
  assert.equal(m.SAL(2026, 0, 'real'), 3300);
  assert.equal(m.SAL(2026, 0, 'prev'), 4300);
});

test('saldo inicial: definido à mão ou continuando do ano anterior', () => {
  fresh();
  assert.equal(m.iniY(2025, 'real'), 0);                    // primeiro ano
  assert.equal(m.acum(2025, 11, 'real'), 3500);             // 5000 - 1500
  assert.equal(m.iniY(2026, 'real'), 3500);                 // continua de 2025
  assert.equal(m.acum(2026, 0, 'real'), 3500 + 3300);
  m.S.saldoIni[2026] = 90000;
  assert.equal(m.iniY(2026, 'real'), 90000);                // valor manual vence
  assert.equal(m.acum(2026, 0, 'real'), 90000 + 3300);
  m.S.saldoIni[2026] = 0;
  assert.equal(m.iniY(2026, 'real'), 0);                    // zero manual também vale
});

test('último mês com dados e meses anteriores atravessando o ano', () => {
  fresh();
  assert.equal(m.lastActive(2026), 0);
  assert.equal(m.hasData(2026, 0), true);
  assert.equal(m.hasData(2026, 3), false);
  assert.deepEqual(Array.from(m.prevMonths(2026, 1, 4), a => [...a]), [[2025, 10], [2025, 11], [2026, 0], [2026, 1]]);
});

test('categorias: uso recente, ativas e visíveis por ano', () => {
  const s = fresh();
  const st = m.catStats();                                   // "hoje" = out/2026
  assert.equal(st.alu.n, 2);
  assert.equal(st.alu.last, 2026 * 12 + 0);
  assert.equal(st.cel.last, 2026 * 12 + 5);
  assert.equal(st.cel.recent, 1);                            // jun/2026 está dentro dos últimos 6 meses
  assert.equal(st.alu.recent, 0);                            // jan/2026 já passou de 6 meses
  assert.equal(m.lastLabel(2026 * 12 + 5), 'jun/2026');
  s.cats.push({ id: 'velha', tipo: 'pagar', nome: 'Velha', dia: null });
  s.data['velha|2018|3'] = { items: [{ v: 1, d: '', ok: true }] };
  assert.equal(m.isActive(m.catById('velha'), m.catStats()), false);   // último uso há mais de 24 meses
  assert.equal(m.isActive(m.catById('alu'), m.catStats()), true);
  s.cats.push({ id: 'nova', tipo: 'pagar', nome: 'Nova', dia: null });
  assert.equal(m.isActive(m.catById('nova'), m.catStats()), true);     // sem lançamentos = ainda ativa
  const nomes = t => m.visCats(t, 2026).map(c => c.nome);
  assert.deepEqual(nomes('pagar'), ['Aluguel', 'Luz', 'Celular', 'Nova']);  // só as usadas no ano (+ novas)
  assert.deepEqual(nomes('receber'), ['Salário']);
  assert.equal(m.yearEmpty(2030), true);
  assert.deepEqual(m.visCats('pagar', 2030).map(c => c.nome), ['Aluguel', 'Luz', 'Celular', 'Nova']); // ano vazio: as ativas
});

test('mesclar categorias soma lançamentos das células em comum e herda o dia', () => {
  const s = fresh();
  m.ens('luz', 2026, 5).items.push({ v: 40, d: 'luz jun', ok: true });
  m.ens('cel', 2026, 0).items.push({ v: 60, d: '', ok: true });
  const antes = m.MT('pagar', 2026, 0, 'prev') + m.MT('pagar', 2026, 5, 'prev');
  m.catSel = 'cel';
  m.mergeCat('cel', 'luz');
  assert.equal(m.catById('cel'), undefined);                 // a de origem some
  assert.equal(m.catSel, 'luz');                             // seleção acompanha
  assert.equal(m.catById('luz').dia, 20);                    // herdou o dia (luz não tinha)
  assert.equal(m.MT('pagar', 2026, 0, 'prev') + m.MT('pagar', 2026, 5, 'prev'), antes);   // total preservado
  assert.equal(m.cellOf('luz', 2026, 0).items.length, 3);    // 2 que já tinha + 1 que veio
  assert.equal(Object.keys(s.data).some(k => k.startsWith('cel|')), false);
});

test('reordenar categorias nos dois sentidos', () => {
  const s = fresh();
  const ids = () => s.cats.map(c => c.id).join(',');
  assert.equal(ids(), 'sal,alu,luz,cel');
  assert.equal(m.reorderCats('cel', 'alu'), true);           // de baixo para cima: fica antes do alvo
  assert.equal(ids(), 'sal,cel,alu,luz');
  assert.equal(m.reorderCats('sal', 'luz'), true);           // de cima para baixo: fica depois do alvo
  assert.equal(ids(), 'cel,alu,luz,sal');
  assert.equal(m.reorderCats('alu', 'alu'), false);
  assert.equal(m.reorderCats('x', 'alu'), false);
});

test('excluir categoria remove os lançamentos dela em todos os anos', () => {
  const s = fresh();
  m.deleteCat('alu');
  assert.equal(m.catById('alu'), undefined);
  assert.equal(Object.keys(s.data).some(k => k.startsWith('alu|')), false);
  assert.ok(m.cellOf('sal', 2026, 0));                       // as outras ficam
});

test('criar categoria', () => {
  const s = fresh();
  const c = m.addCat('pagar', 'Academia', 7);
  assert.equal(m.catById(c.id).nome, 'Academia');
  assert.equal(s.cats.length, 5);
  assert.match(c.id, /^c[a-z0-9]+$/);
});

test('importar anos: reaproveita categoria pelo nome, substitui anos e define saldo inicial', () => {
  const s = fresh();
  const arquivo = {
    anos: [2026, 2024],
    saldoIni: { 2024: 700 },
    cats: [
      { id: 'i1', tipo: 'pagar', nome: 'ALUGUEL', dia: 12 },          // mesmo nome (sem diferenciar maiúsculas)
      { id: 'i2', tipo: 'pagar', nome: 'Condomínio', dia: 15 },        // nova
    ],
    data: {
      'i1|2026|3': { items: [{ v: 1600, d: '', ok: true }] },
      'i2|2024|0': { items: [{ v: 300, d: '', ok: true }] },
    },
  };
  assert.deepEqual([...m.importClashYears(arquivo)], [2026]);      // 2026 já tem lançamentos
  m.applyImport(arquivo);
  assert.equal(s.cats.length, 5);                                  // só a "Condomínio" foi criada
  assert.equal(m.catById('alu').dia, 10);                          // já tinha dia: mantém
  assert.equal(m.cellOf('alu', 2026, 0), undefined);               // 2026 foi substituído
  assert.equal(m.V('alu', 2026, 3, 'real'), 1600);
  const cond = s.cats.find(c => c.nome === 'Condomínio');
  assert.equal(m.V(cond.id, 2024, 0, 'real'), 300);
  assert.deepEqual([...s.anos], [2024, 2025, 2026]);               // ano novo entra, ordenado
  assert.equal(s.saldoIni[2024], 700);
  assert.ok(m.cellOf('sal', 2025, 11));                            // anos fora do arquivo ficam intactos
});

test('serializar e voltar (formato da nuvem) não perde nada', () => {
  const s = fresh();
  s.saldoIni[2026] = 1234; s.saldos = [{ nome: 'banco', valor: 10 }]; s.dividas = [{ nome: 'x', valor: 5 }];
  const { meta, years } = m.serializeState(s);
  assert.deepEqual(Object.keys(years).sort(), ['2025', '2026']);   // um documento por ano
  assert.ok(!meta.includes('"data"'));                             // lançamentos não vão no meta
  const volta = m.deserializeState(meta, years);
  assert.deepEqual(JSON.parse(JSON.stringify(volta)), JSON.parse(JSON.stringify(s)));
});

test('migração do formato antigo (um ano, "ok" por célula)', () => {
  const antigo = {
    ano: 2026, saldoInicial: 500,
    cats: [{ id: 'a', tipo: 'pagar', nome: 'A' }],
    data: { 'a|0': { ok: true, items: [{ v: 10, d: 'x' }] }, 'a|1': { ok: false, items: [{ v: 20, d: 'y' }] } },
  };
  const novo = m.mig(antigo);
  assert.deepEqual([...novo.anos], [2026]);
  assert.equal(novo.saldoIni[2026], 500);
  assert.equal(novo.data['a|2026|0'].items[0].ok, true);           // "ok" da célula virou "ok" do item
  assert.equal(novo.data['a|2026|1'].items[0].ok, false);
  assert.equal('ano' in novo, false);
  assert.deepEqual([...novo.bens], []);
});

test('conta nova começa em branco com categorias básicas', () => {
  const b = m.blank();
  assert.deepEqual([...b.anos], [2026]);
  assert.equal(b.cats.filter(c => c.tipo === 'receber').length, 2);
  assert.equal(b.cats.filter(c => c.tipo === 'pagar').length, 7);
  assert.equal(Object.keys(b.data).length, 0);
  assert.equal(new Set(b.cats.map(c => c.id)).size, b.cats.length);   // ids únicos
});
