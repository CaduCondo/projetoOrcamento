/* E2E da NUVEM: o app de verdade, no Chrome, falando com os emuladores do Firebase (Auth + Firestore) e com as regras REAIS (firestore.rules).
   Rodar:  npm run e2e:nuvem:emu   (sobe os emuladores, monta o site em modo "emu", roda os cenários e desliga tudo)
   Cenários em português (Gherkin) em e2e/nuvem/features. Nada daqui vai para o site publicado. */
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

const testDir = defineBddConfig({ features: 'e2e/nuvem/features/**/*.feature', steps: ['e2e/nuvem/steps/**/*.steps.js', 'e2e/nuvem/support/fixtures.js'], outputDir: 'e2e/.features-gen-nuvem' });
const PORTA = 4174;

module.exports = defineConfig({
  testDir,
  outputDir: 'test-results-nuvem',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  globalSetup: require.resolve('./e2e/nuvem/support/global-setup.js'),
  retries: 0,                                   // sem "tentar de novo": teste instável tem que ser consertado, não escondido
  forbidOnly: true,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['json', { outputFile: 'e2e/resultado-nuvem.json' }], ['html', { open: 'never', outputFolder: 'playwright-report-nuvem' }]] : [['list'], ['json', { outputFile: 'e2e/resultado-nuvem.json' }]],
  use: { baseURL: `http://localhost:${PORTA}`, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure', screenshot: process.env.CI ? 'on' : 'only-on-failure', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'nuvem', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: { command: `python -m http.server ${PORTA} --directory dist/e2e-nuvem`, url: `http://localhost:${PORTA}/index.html`, reuseExistingServer: !process.env.CI, timeout: 20_000 },
});
