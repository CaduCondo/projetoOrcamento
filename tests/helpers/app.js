/* Abre o app (build real) num navegador simulado (jsdom) e oferece atalhos para "usar" a tela nos testes. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { webcrypto } = require('node:crypto');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const PY = process.platform === 'win32' ? 'python' : 'python3';

/* gera dist/test-<env>.html (sem o Chart.js, que não roda sem canvas) e devolve o HTML */
function buildHtml(env) {
  const out = path.join('dist', `test-${env}-${process.pid}.html`);      // um arquivo por processo: os testes rodam em paralelo
  execFileSync(PY, ['build.py', '--env', env, '--no-vendor', '--out', out], { cwd: ROOT, stdio: 'pipe' });
  const html = fs.readFileSync(path.join(ROOT, out), 'utf8');
  fs.rmSync(path.join(ROOT, out), { force: true });
  return html;
}

class FakeChart {
  constructor(el, cfg) { this.config = cfg; FakeChart.count++; }
  destroy() {}
}
FakeChart.count = 0;
FakeChart.defaults = { font: {} };

/* opts.html (obrigatório) · opts.localStorage (reaproveitar o armazenamento) · opts.setup(window) (ex.: instalar Firebase falso) */
function openApp(opts) {
  const dom = new JSDOM(opts.html, {
    runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
      w.TextEncoder = TextEncoder; w.structuredClone = structuredClone;
      w.Chart = FakeChart;
      w.confirm = () => true; w.alert = () => {}; w.prompt = () => null;
      w.Element.prototype.scrollIntoView = function () {};
      w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
      w.URL.createObjectURL = () => 'blob:fake';
      if (opts.storage) for (const [k, v] of Object.entries(opts.storage)) w.localStorage.setItem(k, v);   // simula o mesmo aparelho
      if (opts.setup) opts.setup(w);
      w.addEventListener('error', e => { (dom.errors ||= []).push(e.message); });
    },
  });
  const w = dom.window, d = w.document;
  const api = {
    dom, w, d,
    $: s => d.querySelector(s),
    $$: s => [...d.querySelectorAll(s)],
    /* roda código no escopo global do app (enxerga S, MT(), backend...) */
    ev: code => w.eval(code),
    click(elOrSel) { const el = typeof elOrSel === 'string' ? d.querySelector(elOrSel) : elOrSel; if (!el) throw new Error('não achei: ' + elOrSel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); },
    /* digita num campo (dispara "input" para a máscara de moeda e o combobox funcionarem) */
    type(elOrSel, value) { const el = typeof elOrSel === 'string' ? d.querySelector(elOrSel) : elOrSel; if (!el) throw new Error('não achei: ' + elOrSel); el.value = value; el.dispatchEvent(new w.Event('input', { bubbles: true })); },
    change(elOrSel, value) { const el = typeof elOrSel === 'string' ? d.querySelector(elOrSel) : elOrSel; el.value = value; el.dispatchEvent(new w.Event('change', { bubbles: true })); },
    submit(sel) { d.querySelector(sel).requestSubmit(); },
    key(sel, k) { d.querySelector(sel).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); },
    async waitFor(fn, ms = 4000, what = 'condição') {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch {} await new Promise(r => setTimeout(r, 25)); }
      throw new Error('tempo esgotado esperando: ' + what);
    },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    /* escolhe uma opção de rádio como numa pessoa clicando (só avisa mudança se ela não estava marcada) */
    pickStorage(v) { const r = d.querySelector(`input[name=stg][value=${v}]`); if (r.checked) return false; r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); return true; },
    /* cópia do armazenamento do navegador (para abrir o app de novo "no mesmo aparelho") */
    snapshotStorage() { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; },
    /* escolhe um arquivo num <input type=file> (o app só usa file.text()) */
    chooseFile(sel, text, name = 'arquivo.csv') {
      const el = d.querySelector(sel); Object.defineProperty(el, 'files', { value: [{ name, text: async () => text }], configurable: true });
      el.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
    /* responde a janela de escolha (askChoice) clicando no botão pelo id (ex.: 'apagar') */
    choose(id) { const b = d.querySelector(`#dlg4 [data-ch="${id}"]`); if (!b) throw new Error('opção não encontrada: ' + id); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); },
    text: () => d.body.textContent,
    close: () => w.close(),
  };
  return api;
}

/* "alça" de arquivo falsa (File System Access API) para testar o arquivo no computador */
function fakeHandle(content = '', perm = 'granted') {
  const h = { name: 'meu-orcamento.csv', content, perm, writes: 0, pending: '' };
  h.queryPermission = async () => h.perm;
  h.requestPermission = async () => { h.perm = 'granted'; return 'granted'; };
  h.getFile = async () => ({ text: async () => h.content });
  h.createWritable = async () => ({ write: async t => { h.pending = t; }, close: async () => { h.content = h.pending; h.writes++; } });
  return h;
}

module.exports = { buildHtml, openApp, FakeChart, fakeHandle };
