/* Carrega só a lógica de dados (sem tela) num ambiente isolado, com a data "de hoje" fixa (15/out/2026). */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', '..', 'src', 'js');
const MODEL_FILES = ['00-config.js', '10-format.js', '20-model-state.js', '21-model-calc.js', '22-model-categories.js', '23-model-serialize.js', '24-model-schedule.js', '25-model-csv.js'];

class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(2026, 9, 15); }
  static now() { return new Date(2026, 9, 15).getTime(); }
}

/* Devolve um objeto com as funções do modelo e "pegadores" para o estado global (S, modo, catSel...). */
function loadModel() {
  const code = MODEL_FILES.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n') + `
;({
  parseV, fmtN, R$, RP, moneyFor, K, esc, normName, parseKey,
  mig, blank, makeCat, initSelection,
  key, cellOf, ens, itemsOf, V, cats, MT, SAL, iniY, acum, hasData, lastActive, prevMonths,
  catById, addCat, catStats, isActive, lastLabel, visCats, yearHas, yearEmpty,
  mergeCat, reorderCats, deleteCat, importClashYears, applyImport,
  serializeState, deserializeState,
  stateToCsv, csvFileText, csvToState, parseCsv,
  ym, ymOf, fromYm, aliveFrom, showsInMonth, showsInYear, scopeVis, scopeOf, scopeLabel, validateCat, createCat, reviseCat,
  get S(){return S}, set S(v){S=v},
  get modo(){return modo}, set modo(v){modo=v},
  get catSel(){return catSel}, set catSel(v){catSel=v},
  get selY(){return selY}, get selM(){return selM}, get tab(){return tab},
})`;
  const ctx = vm.createContext({ Date: FakeDate, structuredClone, console });
  return vm.runInContext(code, ctx, { filename: 'model.js' });
}

/* Estado de exemplo: 2 anos, 4 categorias. Ids fixos para facilitar as conferências. */
function sampleState(m) {
  const s = m.blank();
  s.cats = [
    { id: 'sal', tipo: 'receber', nome: 'Salário', dia: 5 },
    { id: 'alu', tipo: 'pagar', nome: 'Aluguel', dia: 10 },
    { id: 'luz', tipo: 'pagar', nome: 'Luz', dia: null },
    { id: 'cel', tipo: 'pagar', nome: 'Celular', dia: 20 },
  ];
  s.anos = [2025, 2026]; s.saldoIni = {};
  const put = (c, y, mm, items) => { s.data[`${c}|${y}|${mm}`] = { items }; };
  put('sal', 2025, 11, [{ v: 5000, d: '', ok: true }]);
  put('alu', 2025, 11, [{ v: 1500, d: '', ok: true }]);
  put('sal', 2026, 0, [{ v: 5000, d: '', ok: true }, { v: 1000, d: 'extra', ok: false }]);
  put('alu', 2026, 0, [{ v: 1500, d: '', ok: true }]);
  put('luz', 2026, 0, [{ v: 200, d: 'jan', ok: true }, { v: 80, d: 'no cartão', ok: true, info: true }]);
  put('cel', 2026, 5, [{ v: 100, d: '', ok: true }]);
  return s;
}

module.exports = { loadModel, sampleState };
