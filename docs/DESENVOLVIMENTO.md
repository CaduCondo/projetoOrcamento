# Guia de desenvolvimento — Meu Orçamento

## Os dois ambientes

| | **PRODUÇÃO** (uso de verdade) | **TESTE / DEV** (onde se experimenta) |
|---|---|---|
| Endereço | https://caducondo.github.io/projetoOrcamento/ | https://caducondo.github.io/projetoOrcamento/dev/ |
| Código vem do ramo | `main` | `dev` |
| Banco e login (Firebase) | projeto `gerenciarorcamento` | projeto `gerenciarorcamento-dev` |
| Aparência | normal | faixa laranja "AMBIENTE DE TESTE" e título `[TESTE]` |

Os dois bancos são **totalmente separados**: nada que se faça no teste aparece na produção.
Contas de um ambiente não existem no outro (é preciso criar a conta nos dois).

## Rotina para criar algo novo
1. Trabalhar no ramo `dev` (`git switch dev`).
2. Rodar os testes: `npm test` (e `npm run e2e` para os de ponta a ponta). Para ver o app: `npm run build:dev` e `npm run serve` (abre em http://localhost:8000).
3. Enviar ao GitHub (`git push`). Os testes rodam sozinhos; se passarem, o site de **teste** é atualizado.
4. Conferir em `/dev/`. Estando bom, passar para produção: abrir um *Pull Request* de `dev` para `main` e aprovar.
   Os testes rodam de novo e, se passarem, a **produção** é atualizada.

> O site só é publicado se **todos os testes passarem**. Se algo falhar, o site continua como estava.

## Testes (dois grupos; os dois precisam passar para o site ser publicado)
| | O que é | Como rodar | Onde ficam |
|---|---|---|---|
| **Lógica e telas simuladas** | `npm test` (Node + jsdom): regras de dinheiro, importação, telas num navegador simulado. Mais de 150 testes, rápidos | `npm test` | `tests/` |
| **Regras de segurança do banco** | emulador do Firebase | `npm run test:rules` | `tests/rules/` |
| **Ponta a ponta (E2E)** | abre o app **de verdade num Chrome** (Playwright), clica e digita como uma pessoa e confere o resultado final. Cenários em **português (Gherkin/BDD)** | `npm run e2e` e depois `npm run e2e:ver` | `e2e/features` (cenários) · `e2e/steps` (passos) · `e2e/support` |

**Como o E2E evita falso positivo (teste que passa sem testar nada):**
- Cada cenário começa num navegador novo e com a data fixa em 15/out/2026.
- Os "Então" conferem o **resultado final** (valores, textos, quantidade de linhas, sinal positivo/negativo) e, nos cenários de gravação, **recarregam a página** para provar que ficou guardado.
- Qualquer erro de JavaScript ou de console durante um cenário **reprova** o cenário.
- Sem "tentar de novo" (`retries: 0`): teste instável tem que ser consertado, não escondido.
- `npm run e2e:ver` reprova se algum cenário foi **pulado**, **esquecido** ou deixou de rodar (compara os `.feature` com o resultado).
- `python e2e/verificar-mutacoes.py` **estraga o app de propósito** (um defeito por vez) e confere que o cenário correspondente reprova. Rodar de vez em quando e sempre que criar cenário novo. Se aparecer "PERIGO", o teste está fraco.
- A conta de teste é criada uma vez no começo (`e2e/support/global-setup.js`); o cadastro em si é testado nos dois cenários de `01-conta.feature`.

**Se o E2E falhar no GitHub:** nada é publicado. Abrir a execução na aba *Actions* → baixar o artefato **e2e-falha** (relatório + foto + gravação do passo a passo). Entender o motivo antes de qualquer coisa: se for defeito do app, **corrigir o app** (não o teste); se o teste estiver errado, corrigir o teste e provar com `verificar-mutacoes.py` que ele continua pegando o defeito.

**Fora do E2E (limites honestos):** o login na nuvem (Firebase) e o "Buscar do banco" (Pluggy + Cloudflare) não rodam no E2E, porque dependem de serviços externos. Eles continuam cobertos pelos testes simulados e pelo emulador de regras.

## Como o código está organizado
```
src/
  index.html            casca da página
  css/styles.css        aparência (base)
  css/theme.css         visual "Neo" (escuro, vidro, neon, celular primeiro) — vem depois do styles.css
  js/                   o programa, em ordem de leitura (os números definem a ordem de montagem)
    00-config.js        constantes (valores do ambiente entram aqui pelo build)
    10-format.js        formatar/ler valores em R$, escapar texto
    20-model-state.js   estado global, conta nova, migração de formato antigo
    21-model-calc.js    totais, saldos, acumulado, previsto × realizado
    22-model-categories.js  categorias: ativas, mesclar, reordenar, excluir, importar anos
    23-model-serialize.js   como os dados viram documentos na nuvem e voltam
    28-model-import.js      leitura da fatura/extrato (linhas de texto) e o que fazer com os itens importados
    24-model-schedule.js    vigência das categorias (onde/quando aparecem; editar do mês em diante; incluir categoria num mês; meses futuros vazios)
    25-model-csv.js         arquivo CSV (resumo no estilo da tela Ano + detalhe para recarregar tudo)
    26-model-profile.js     cadastro do usuário (nome, foto, escolha nuvem × aparelho, lembretes)
    30-storage.js       aviso "Salvo" e pontos de entrada (save/logout/doLogin)
    31-backend-local.js     LocalBackend: contas e dados só neste navegador (sem Firebase)
    32-backend-cloud.js     CloudBackend: login/cadastro no Firebase e escolha do armazém de dados
    33-device-store.js      armazém NO APARELHO (arquivo CSV no computador + cópia no navegador); nunca toca no banco
    34-firestore-store.js   armazém NA NUVEM (Firestore)
    36-backend.js       escolhe qual backend usar
    40..46-ui-*.js      peças de tela: máscara de moeda, menu, login, balões, utilidades, avisos, janela de escolha
    50..56-view-*.js    telas: Mês, Ano, janela de itens, Gráficos, Patrimônio, Ajustes, Perfil
    60..65-ui-*.js      busca de categoria, mesclar, gerenciador de categorias, janela de categoria, troca nuvem×aparelho, área do administrador
    70-events.js        cliques, formulários, arrastar
    99-boot.js          inicialização
  config/firebase.dev.json / firebase.prod.json   identificadores públicos de cada projeto
  vendor/chart.js       biblioteca de gráficos (Chart.js, licença MIT)
build.py                monta tudo num único arquivo index.html
tests/                  testes automáticos
firestore.rules         regras de privacidade do banco
.github/workflows/      publicação automática
```
Regra de ouro: **arquivos `2x` não mexem na tela** (só dados) — por isso são testados sem navegador.
Quem decide entre "local" e "nuvem" é o `backend`; o resto do código não precisa saber qual está em uso.

## Os testes (`npm test`)
- `tests/model.test.js`, `schedule.test.js`, `csv.test.js` — regras de negócio (valores, totais, saldos, categorias e vigência, importação, formato da nuvem, CSV).
- `tests/smoke-local`, `smoke-cloud`, `smoke-profile` e `smoke-admin` — simulam uma pessoa usando o app (criar conta, lançar,
  editar, mesclar, sair e voltar), com um Firebase simulado para o modo nuvem.
- `tests/rules/rules.test.js` — regras de segurança do banco no emulador oficial (`npm run test:rules`, precisa de Java).
- `tests/repo.test.js` — higiene: nenhuma planilha/dado pessoal versionado, build dos 3 ambientes, regras do Firestore.

Quando corrigir um defeito, **escreva primeiro o teste que o reproduz**.

## Banco de dados (Firestore)
Estrutura por usuário: `users/{uid}/meta/main` (categorias, anos, patrimônio) e `users/{uid}/years/{ano}` (lançamentos do ano).
As regras estão em `firestore.rules` e precisam estar **publicadas nos dois projetos** (Firebase → Firestore → Regras → Publicar).
Mudou o formato dos dados? Teste antes no ambiente de teste, com uma conta de teste.

## Privacidade
- Nunca versionar planilhas, backups `.json` ou dados reais (o `.gitignore` e os testes protegem).
- A chave do Firebase em `src/config/*.json` é pública por desenho; quem protege os dados são as regras do Firestore.
