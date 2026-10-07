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
  const out = path.join('dist', `test-${env}.html`);
  execFileSync(PY, ['build.py', '--env', env, '--no-vendor', '--out', out], { cwd: ROOT, stdio: 'pipe' });
  return fs.readFileSync(path.join(ROOT, out), 'utf8');
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
    text: () => d.body.textContent,
    close: () => w.close(),
  };
  return api;
}

module.exports = { buildHtml, openApp, FakeChart };
