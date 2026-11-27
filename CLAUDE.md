# Meu Orçamento — como trabalhamos (leia antes de mexer em qualquer coisa)

App de orçamento pessoal em **um único HTML**, montado por `build.py` a partir de `src/`.
Repositório (público): https://github.com/CaduCondo/projetoOrcamento · pasta local: `C:\Users\debor\Documents\automacao\projetoOrcamento`.

## Quem é o dono e como falar com ele
- **Cadu não é de TI.** Responder sempre em **português simples**, sem jargão, **um passo pequeno de cada vez**, com links clicáveis quando ele precisar fazer algo (GitHub, Firebase, Cloudflare...).
- **Usabilidade acima de tudo:** o app tem que ficar cada vez mais fácil de usar. Antes de criar tela ou botão, pensar: "uma pessoa sem treino entende isso sozinha?".
- **Custo do app: R$ 0** (GitHub Pages + Firebase gratuito). Nada que gere cobrança sem ele aprovar.
- **Dados pessoais nunca vão para o repositório** (ele é público): planilhas (`*.xlsx`, `*.xls`), backups, `tools/planilha/saida/`, `orcamento-carga/` ficam no `.gitignore`. Exemplos e testes usam **dados inventados**.
- **Nunca apagar dados dele por ele.** Para zerar dados de teste existe o botão "🧹 Zerar meus dados" (só dev/local): deixar para ele clicar.
- Ser honesto no relato: se um teste falhou ou um passo foi pulado, dizer. Quando está pronto e verificado, dizer sem rodeio.

## O processo, do pedido até a produção

### 1. Toda ideia, melhoria ou bug vira uma issue no quadro (Kanban) do GitHub
Antes de escrever código, **registrar** o pedido: https://github.com/CaduCondo/projetoOrcamento/issues (regras completas em `docs/KANBAN.md`).

| Tipo | Etiquetas |
|---|---|
| Ideia / melhoria / feature | `enhancement` |
| Defeito | `bug` (com passos para reproduzir, o que era esperado e o que aconteceu) |
| Grupo de tarefas | `epic` (lista `- [ ] #N`) |
| Área | `categorias`, `mobile`, `perfil`, `armazenamento`, `admin`, `privacidade`, `qualidade`, `documentation` |
| Prioridade | `P0` urgente (para tudo) · `P1` alta · `P2` média · `P3` baixa |
| **Coluna do quadro** | `backlog` → `todo` → `wip` → `wtt` → `done` → `em-producao` (ver abaixo; a issue fecha em `em-producao`) |

Comandos (o `gh` já está logado como CaduCondo):
```bash
gh issue create --title "..." --label enhancement --label backlog --label P2 --body "Pedido do dono... Pronto quando: - [ ] ..."
gh issue edit N --remove-label todo --add-label wip           # ao começar (escrever o teste primeiro)
gh issue edit N --remove-label wip --add-label wtt            # código pronto: completar os testes
gh issue edit N --remove-label wtt --add-label done           # CI do dev verde e conferido em /dev/ (a issue continua ABERTA)
                                                              # em-producao + fechar: o CI faz SOZINHO quando a main é publicada
gh issue list --label wip   # ver o quadro por coluna
```
- Escrever o pedido **com as palavras do Cadu** e uma lista "Pronto quando" (critérios de aceite). Modelos em `.github/ISSUE_TEMPLATE/`.
- Mencionar `#N` nas mensagens de commit.
- Bug achado pelos testes ou pelo dono: abrir a issue **antes** de corrigir.
- **Quadro de colunas (GitHub Projects):** ainda não ligado. Exige uma vez o Cadu rodar `gh auth refresh -s project -h github.com` (abre o navegador). Até lá, as etiquetas `backlog/wip/done` fazem o papel das colunas.
- **Estados** (detalhes e definições de "pronto" em `docs/ENGENHARIA.md` §5): `backlog` ideia · `todo` pronta (tem **cenários BDD**, critérios, testes planejados, riscos de segurança vistos) · `wip` escrevendo código (TDD: teste primeiro) · `wtt` *Working on The Tests* (completar lógica, E2E, mutação, regressão, segurança) · `done` verde no `dev` e conferido · `em-producao` no ar (o CI marca e fecha).
- Issue nova segue `.github/ISSUE_TEMPLATE/`: **cenário BDD, resultado esperado e obtido, evidência, teste de regressão que vai nascer**, regras de negócio (RN-xx) envolvidas.
- Bug achado pelo CI **já vira issue sozinho** (`ci-automatico`): não abrir outra; corrigir, criar/reforçar o teste de regressão e provar por mutação.
- Manter o quadro limpo: conferir se há issues antigas marcadas `wip` que já foram entregues.

### 2. Desenvolver sempre na branch `dev`
- Nunca commitar direto na `main`. Branch: `dev`. Mensagens de commit em português, curtas, dizendo o que mudou para o usuário.
- Fluxo de uma tarefa: issue (`todo`) → `wip` (**teste primeiro**, TDD) → `wtt` → push em `dev` → CI → conferir em `/dev/` → `done` → PR → merge com checks verdes → produção → `em-producao` (o CI fecha).

### 3. Testes: três camadas, todas obrigatórias
| Camada | Comando | Para quê |
|---|---|---|
| Lógica (Node + jsdom) | `npm test` (hoje ~167) | regras de dinheiro, categorias, importação; toda regra nova ganha teste em `tests/` |
| Regras do banco | `npm run test:rules` | emulador do Firebase |
| Ponta a ponta (Chrome de verdade) | `python build.py --env local --out dist/e2e/index.html`, depois `npm run e2e` e `npm run e2e:ver` | cenários em **português (Gherkin)** em `e2e/features`, passos em `e2e/steps` |
| Prova de que o teste presta | `python e2e/verificar-mutacoes.py [filtro]` | estraga o app de propósito; se aparecer **PERIGO**, o teste está fraco e precisa ser reforçado |

Regras dos testes E2E (as do dono):
- **Sem falso positivo:** conferir o resultado final (valor, sinal, texto) e **recarregar a página** nos cenários que gravam. Sem `retries`. Erro de console reprova.
- Toda feature/bug novo: **cenário E2E novo** + entrada nova em `verificar-mutacoes.py` (uma por comportamento importante). Rodar a mutação e ver "OK: o teste reprovou".
- Esperar o autofoco do app (`await expect(...).toBeFocused()`) antes de digitar em diálogos.
- Conta nova já vem com 9 categorias padrão (Salário, Mercado...): não criar categoria com esses nomes nos testes.
- Teste que falha no CI: **entender a causa** antes de qualquer coisa. Defeito do app → corrigir o app. Teste errado → corrigir o teste e provar por mutação. Nunca "tentar de novo" para esconder.

### 4. Ambientes
| | PRODUÇÃO | TESTE / DEV |
|---|---|---|
| Endereço | https://caducondo.github.io/projetoOrcamento/ | https://caducondo.github.io/projetoOrcamento/dev/ |
| Branch | `main` | `dev` |
| Firebase | `gerenciarorcamento` | `gerenciarorcamento-dev` (banco separado) |

CI (`.github/workflows/ci-deploy.yml`): jobs `testes` + `e2e` → só então `publicar` (GitHub Pages). Push em `dev` publica o `/dev/`; merge em `main` publica a produção. Se algo falha, o site continua como estava.

### 5. Passar para produção (PR dev → main)
1. `git push` em `dev`, esperar o CI ficar verde (`gh pr checks N --watch`).
2. Abrir o PR: `gh pr create --base main --head dev --title "..." --body "..."` (descrever em português o que muda para o usuário; terminar o corpo com a linha de atribuição do Claude Code).
3. **O merge é feito pelo Cadu** (botão "Merge pull request" → "Confirm merge"). A `main` está protegida: exige os checks "Testes" e "Testes de ponta a ponta (Chrome)", vale para admin, sem force push/exclusão. O bloqueio automático já negou um merge feito por mim: não contornar, pedir para ele clicar.
4. Depois do merge: esperar o "Publicar site" terminar e conferir que a produção abre (HTTP 200).
5. Se o dono carregar dados em produção: pedir um backup depois e rodar `python -I tools/planilha/comparar-backup.py <original> <atual>` para provar que os totais não mudaram.

## Engenharia: segurança, testes e qualidade (leia `docs/ENGENHARIA.md`)
- **Segurança em tudo que mexe em dado:** perguntar *de quem é, quem lê, quem altera*; escrever o teste **negativo** ("outra pessoa não consegue"). Regras do Firestore são o nosso "RLS": toda coleção nova precisa de regra **e** teste no emulador. Nunca segredo no repositório (público). Rota de API exige autenticação (como o porteiro).
- **Testes na ordem:** TDD (teste que reprova → código mínimo → refatorar) → lógica (`tests/`) → E2E BDD em português (`e2e/features`, celular e computador) → mutação (`verificar-mutacoes.py`) → regressão (o CI roda tudo a cada push). Page Objects: ao mexer em passos E2E, preferir classes por tela em `e2e/support/` (migração gradual a partir de `ui.js`).
- **Código:** comentar o porquê (português); orientação a objetos onde há estado + comportamento; reaproveitar antes de criar; refatorar um pouco a cada mudança (regra do escoteiro), grandes refatorações só em issue própria com a rede de testes verde.
- **Documentar sempre:** regra de negócio em `docs/REGRAS-DE-NEGOCIO.md` (RN-xx) no mesmo PR; decisão em `docs/PEDIDOS-E-DECISOES.md`.
- **Pilha atual** (não trocar sem motivo e sem o dono aprovar): GitHub Pages + Firebase (Auth/Firestore) + Cloudflare Worker + GitHub Actions, tudo R$ 0. Supabase/Vercel são do outro projeto (sistema de locação).

## Mapa do código
- `src/js/NN-*.js` (a ordem dos números é a ordem de montagem): `2x` regras/modelo (sem tela), `4x–7x` telas e eventos. `src/css/styles.css` + `theme.css` (visual "Neo"). `build.py` junta tudo em `dist/`.
- Modelo: `S={anos,saldoIni,saldos,dividas,bens,autos,data,cats}`; `data["catId|ano|mês"]={items:[{v,d,ok,info,...}]}`. `ok` = confirmado, sem `ok` = **previsto**, `info` = informativo (💳, nunca soma). Categorias têm versões (`prevId`) quando o nome muda "daqui em diante".
- Categorias: `src/js/22-model-categories.js` (mesclar, **virar lançamento**, renomear), `24-model-schedule.js` (vigência, criar/revisar categoria), `61-ui-category-merge.js`, `63-ui-category-dialog.js`, `52-dialog-cell.js` (janela dos lançamentos do mês).
- Testes do modelo carregam os arquivos pelo helper `tests/helpers/model.js`: **função nova do modelo precisa ser exportada ali**.
- Carga de planilha Excel → app: `tools/planilha/` (ver `LEIA-ME.md`; `converter.py`, `verificar-no-app.js`, `comparar-backup.py`).
- Documentos: `docs/PEDIDOS-E-DECISOES.md` (cada pedido do dono e a decisão tomada: acrescentar uma seção a cada feature), `docs/KANBAN.md`, `docs/DESENVOLVIMENTO.md`, `docs/SEGURANCA.md`.

## Armadilhas já encontradas (não repetir)
- **Janela `dlg4` (`askChoice`/`askText`):** abrir uma segunda pergunta logo depois da primeira cancelava a segunda (o evento `close` da primeira chegava depois). Já corrigido em `46-ui-dialogs.js`; qualquer janela encadeada tem que ter cenário E2E que **continua** depois da primeira pergunta.
- **`snackbar` fica atrás de qualquer `<dialog>` modal aberto:** em janela modal, mostrar o resultado dentro da própria janela (ou fechar antes de avisar).
- Tabela de Categorias: coluna "Onde aparece" vazia mudava o alinhamento (`.vig:empty`); o teste mede a posição de várias colunas.
- Janela de categoria alta demais escondia os botões: ícone/cor ficam num `<details>` recolhido.
- Windows/PowerShell: o diretório do shell volta ao inicial a cada comando (usar caminhos absolutos); Python no Windows não lê caminhos `/c/...` (usar caminho relativo ou `C:\...`); `sleep` longo é bloqueado (usar `gh pr checks --watch`).
- O servidor local do E2E (`python -m http.server 4173 --directory dist/e2e`) precisa estar de pé para `tools/planilha/verificar-no-app.js`.
- `verificar-mutacoes.py` **altera arquivos de `src/` temporariamente**: não editar o código enquanto ele roda, e conferir `git status` depois.

- **CI avisa sozinho** (`tools/ci/relatar.js`): bug automático por cenário reprovado (fecha sozinho), resultado na issue "📬 Resultados do CI" (vira e-mail) e relatório em `/relatorio/<branch>/`. Não abrir issue de bug à mão para falha de CI: ela já existe (`ci-automatico`). Detalhes em `docs/PEDIDOS-E-DECISOES.md` §5.26.
- Publicação: o `deploy-pages` às vezes não enxerga o pacote recém-enviado ("No artifacts named github-pages"); o workflow já espera e tenta de novo. Se aparecer de novo, ler o log antes de rodar de novo.
- Neste ambiente (sessão na nuvem) o `gh` só fala REST: `gh issue list/view` (GraphQL) é bloqueado; usar `gh api repos/...` ou as ferramentas do GitHub. Para rodar o E2E aqui sem baixar navegador: apontar `PLAYWRIGHT_BROWSERS_PATH` para uma pasta com links para o Chromium já instalado.
- `verificar-mutacoes.py` troca **todas** as ocorrências do trecho: ao estragar o app à mão para provar um teste, estragar do mesmo jeito (trocar só uma pode não ser pego).

## Pendências combinadas
- Subcategorias: **adiadas** pelo dono ("não faz sentido por enquanto"; o nome padronizado já é digitado no lançamento).
- Segurança (tarefas do dono, ver `docs/SEGURANCA.md`): publicar `firestore.rules` no Firebase de produção, girar o segredo Pluggy vazado, restringir a chave de API.
- Ligar o quadro de colunas do GitHub Projects (precisa do `gh auth refresh -s project`).
