/* Testes de ponta a ponta (E2E): abrem o app de verdade num Chrome, clicam e digitam como uma pessoa e conferem o resultado final.
   Cenários em português (Gherkin) em e2e/features; os passos em e2e/steps. Rodam no GitHub Actions: se falhar, o site não é publicado. */
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

const testDir = defineBddConfig({ features: 'e2e/features/**/*.feature', steps: ['e2e/steps/**/*.steps.js', 'e2e/support/fixtures.js'], outputDir: 'e2e/.features-gen' });
const PORTA = 4173;

module.exports = defineConfig({
  testDir,
  fullyParallel: true,
  workers: process.env.CI ? 3 : 4,
  globalSetup: require.resolve('./e2e/support/global-setup.js'),
  retries: 0,                                   // sem "tentar de novo": teste instável tem que ser consertado, não escondido
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'e2e/resultado.json' }], ['html', { open: 'never' }]] : [['list'], ['json', { outputFile: 'e2e/resultado.json' }]],
  use: { baseURL: `http://localhost:${PORTA}`, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure', screenshot: process.env.CI ? 'on' : 'only-on-failure', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: { command: `python -m http.server ${PORTA} --directory dist/e2e`, url: `http://localhost:${PORTA}/index.html`, reuseExistingServer: !process.env.CI, timeout: 20_000 },
});
