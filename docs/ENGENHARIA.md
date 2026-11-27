# Engenharia do Meu Orçamento

Como o sistema é construído, protegido e testado, e como o trabalho anda do pedido até a produção.
Este documento diz **o que já existe (✅)**, **o que existe só em parte (🟡)** e **o que falta (📋)**. Nada aqui é promessa que o código ainda não cumpre.

Regras de trabalho do dia a dia (comandos, armadilhas, ambientes) ficam no [CLAUDE.md](../CLAUDE.md). Regras do negócio ficam em [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md). Passo a passo de segurança do dono: [SEGURANCA.md](SEGURANCA.md).

---

## 1. Princípios
1. **Usabilidade acima de tudo:** uma pessoa sem treino entende a tela sozinha.
2. **Segurança por padrão:** cada pessoa só vê o que é dela; nada de dado pessoal no repositório (ele é público).
3. **Custo R$ 0** até o dono aprovar o contrário.
4. **Nada vai para produção sem teste verde.** O CI trava a publicação.
5. **Todo defeito vira teste** que impede de voltar (regressão).
6. **Código limpo e comentado:** cada arquivo diz para que serve; refatorar um pouco a cada mudança, para nunca acumular.
7. **Decisão registrada:** cada pedido e cada decisão ficam em `docs/PEDIDOS-E-DECISOES.md`; cada regra de negócio em `docs/REGRAS-DE-NEGOCIO.md`.

---

## 2. Arquitetura atual

```
 Navegador (celular ou computador)
   └─ site estático: UM arquivo HTML montado por build.py a partir de src/   → GitHub Pages (grátis)
        ├─ Login e senha ........................ Firebase Authentication (Google)
        ├─ Dados na nuvem ....................... Firestore (regras de segurança por usuário)
        ├─ Dados só no aparelho ................. navegador / arquivo local (nada vai ao banco)
        └─ "Buscar do banco" (só o dono) ........ Porteiro: Cloudflare Worker (grátis) → Meu Pluggy (Open Finance)
 Código e processo ............................... GitHub (repositório, issues/kanban, Actions = CI/CD)
```

| Peça | Para que serve | Por que está aqui |
|---|---|---|
| **GitHub Pages** | hospeda o site | grátis, publica sozinho pelo CI |
| **Firebase Auth + Firestore** | login e banco de dados | grátis no nosso volume; **as regras do Firestore fazem o papel das "RLS" do Supabase** |
| **Cloudflare Worker (porteiro)** | guarda a chave secreta do banco e confere quem pede | a chave nunca pode ficar dentro do site |
| **GitHub Actions** | roda os testes e publica | trava a produção se algo falhar |

### Sobre Supabase e Vercel (dúvida do dono)
- **Supabase** = banco Postgres + login + "RLS" (regras por linha). É o equivalente do Firebase. **Não vale migrar este app:** o Firebase já cobre o que precisamos, de graça, e a migração traria risco sem ganho. O Supabase é uma ótima escolha para o **sistema de locação** (dados relacionais: imóveis, contratos, inquilinos), que é outro projeto.
  - Limite do plano grátis: poucos projetos ativos. Alternativas honestas: separar por *schema* dentro do mesmo projeto (com RLS em cada tabela) ou pagar o plano quando o projeto justificar. Criar várias contas só para contornar o limite pode violar os termos do serviço: evite.
- **Vercel** = serviço que **publica sites e aplicações web** a partir do GitHub (a cada envio, constrói e coloca no ar, com endereço de teste para cada mudança). Para este app, o GitHub Pages já faz isso de graça; a Vercel serve melhor para aplicações com servidor (Next.js), como o sistema de locação.

---

## 3. Segurança: ameaças e controles

| Ameaça | Controle | Situação |
|---|---|---|
| Alguém lê ou altera dados de outra pessoa | Regras do Firestore (`firestore.rules`): `isOwner(uid)`; campos permitidos listados (`hasOnly`) | ✅ testado no emulador (`npm run test:rules`) |
| Alguém vira administrador pelo site | `admins/{uid}` só se cria à mão no console; `write: if false` | ✅ |
| Administrador altera dados | Administrador só **lê** (regra) e a tela trava tudo no modo leitura | ✅ testado |
| Senha fraca ou vazada | Firebase Auth guarda a senha com hash (nunca vemos a senha); regras de senha forte no cadastro | ✅ |
| Tentativas de login em massa | limite automático do Firebase Auth (`too-many-requests`) | 🟡 falta App Check + reCAPTCHA (issue) |
| Descobrir quais e-mails existem | "Proteção contra enumeração de e-mails" no Firebase (SEGURANCA.md, etapa 4) | 🟡 ação do dono; conferir se está ligada |
| Rota de API (porteiro) usada por estranho | token do Firebase conferido (assinatura do Google, validade, projeto, **e-mail do dono**), origem permitida, período máximo, campos mínimos | ✅ testado (`tests/pluggy-worker.test.js`) |
| Porteiro sob ataque de volume | limite de pedidos por origem/IP | 📋 issue |
| Chave secreta do banco (Pluggy) | só nos "Segredos" do Cloudflare; nunca no site nem no repositório | 🟡 **girar o segredo que vazou** (ação do dono) |
| Script malicioso na página (XSS) | `esc()` nos textos; foto só base64; ícone/cor/ids/tipo validados na entrada (`saneIds`, `icoOk`, `corOk`, `fotoSegura`); regra do banco para a foto; **testes** em `tests/smoke-xss.test.js` e `e2e/features/12-seguranca.feature` | ✅ (falta a política de conteúdo/CSP: issue; a regra da foto precisa ser publicada pelo dono) |
| Dependências com falha conhecida | workflow **Segurança** (`.github/workflows/seguranca.yml`): `npm audit` (o que vai para o site reprova por qualquer falha; ferramentas de teste reprovam só por falha crítica), CodeQL e Dependabot semanal | ✅ (alertas do CodeQL: aba Security do GitHub) |
| Scripts de fora (Firebase SDK) alterados | versão fixa; falta atualizar para a série atual e usar SRI (`integrity=`) | 📋 issue |
| Segredo ou dado pessoal no repositório público | `.gitignore` + teste de higiene (`tests/repo.test.js`) + varredura de segredos no histórico inteiro (gitleaks, workflow Segurança) | ✅ |
| Conta do dono invadida | verificação em 2 etapas Google e GitHub, chave de API presa ao site | 🟡 ações do dono (SEGURANCA.md) |
| Dados em trânsito | HTTPS em tudo | ✅ |
| Dados em repouso | criptografia do Google (infraestrutura) | ✅; **sem criptografia de ponta a ponta** (dito aos usuários) |
| Perda de dados | backup manual (JSON/CSV) | 🟡 📋 backup automático |

**Regra para qualquer mudança:** se mexe em dado, pergunte *de quem é, quem pode ler, quem pode alterar*, e escreva o teste negativo ("outra pessoa **não** consegue").

---

## 4. Estratégia de testes

Pirâmide: muitos testes rápidos embaixo, poucos e abrangentes em cima. **Tudo roda no CI a cada envio; se algo reprovar, nada é publicado.**

| Camada | Ferramenta | Onde | Situação |
|---|---|---|---|
| Unitário / regras de negócio | Node + jsdom | `tests/*.test.js` | ✅ (~170) |
| Regras de segurança do banco | emulador do Firebase | `tests/rules/` | ✅ |
| Integração (porteiro ↔ banco simulado) | Node, API da Pluggy simulada | `tests/pluggy-worker.test.js` | ✅ |
| Funcional / ponta a ponta (E2E) | **Playwright** + **BDD** em português (Gherkin) | `e2e/features`, `e2e/steps` | ✅ (~55 cenários) |
| Regressão | os testes acima, a cada push; bug do CI vira issue e teste | CI | ✅ |
| Qualidade dos testes (mutação) | `e2e/verificar-mutacoes.py` estraga o app de propósito | local | ✅ (manual) |
| Celular | E2E em 375 px (sem rolagem lateral, toque ≥ 40 px) | `e2e/features/10-*` | ✅ |
| Segurança estática (SAST), dependências e segredos | CodeQL, `npm audit`, gitleaks, Dependabot | workflow Segurança (push, PR e toda segunda) | ✅ |
| Intrusão (pentest) automatizado | OWASP ZAP (varredura baseline) contra o `/dev/` | CI semanal | 📋 |
| Intrusão manual | checklist OWASP ASVS, ver §6 | a cada versão grande | 📋 |
| Carga e estresse | **k6** só no **porteiro** (nosso único servidor) | manual, contra ambiente de teste | 📋 |

Observações honestas:
- **Carga/estresse não faz sentido em Firestore, Auth e GitHub Pages:** são serviços do Google e do GitHub, com limites próprios, e os termos deles proíbem teste de carga. Testamos carga apenas no que é **nosso** (o porteiro).
- **Pentest real** (humano) tem valor que a varredura automática não tem. Antes de guardar muito dado de terceiros, vale um teste de intrusão manual seguindo o checklist da §6.
- **Page Objects:** continuam sendo uma boa prática no mercado, em geral como classes por tela (ou "fixtures" do Playwright). Hoje os passos usam funções em `e2e/support/ui.js`. Plano: migrar **aos poucos** para classes por tela (`MesPage`, `CategoriasPage`, `PerfilPage`, `MenuUsuario`…), sem reescrever tudo de uma vez (issue).
- **BDD:** cenários em português descrevem o comportamento (Dado/Quando/Então) e servem também de documentação.

### Regras dos testes E2E
Resultado final conferido (valor, sinal, texto) e recarregar a página nos cenários que gravam; sem `retries`; erro de console reprova; esperar o autofoco antes de digitar; toda feature ou bug novo ganha cenário **e** mutação. Detalhes no CLAUDE.md.

---

## 5. Processo: do pedido à produção

### Quadro (etiquetas do GitHub)
`backlog` → `todo` → `wip` → `wtt` → `done` → `em-producao`

| Estado | Significa | Entra aqui quando | Sai daqui quando |
|---|---|---|---|
| **backlog** | ideia registrada | a issue é criada | está priorizada e tem **cenários BDD + critérios de aceite** (Definition of Ready) |
| **todo** | pronta para começar | tem cenários, critérios, testes planejados, riscos de segurança vistos | alguém começa |
| **wip** | *Working in Progress*: escrevendo código | começou | o código funciona e passa nos testes escritos |
| **wtt** | *Working on The Tests*: reforçando os testes | o código está pronto | testes de lógica, E2E, mutação, regressão e segurança completos e verdes |
| **done** | pronto no ambiente de teste | CI do `dev` verde e conferido em `/dev/` | a produção é publicada |
| **em-producao** | no ar | o CI marca **sozinho** quando a `main` é publicada, e fecha a issue | — |

Prioridade: `P0` (para tudo) · `P1` · `P2` · `P3`. Tipo: `enhancement`, `bug`, `epic`. Bugs achados pelo CI entram sozinhos (`ci-automatico`).

### Ciclo de uma tarefa (TDD)
1. **Pegar** a `todo` mais prioritária → `wip`.
2. **Escrever primeiro o teste** que descreve o pedido (reprova), depois o código mínimo para passar, depois limpar (vermelho → verde → refatorar).
3. **wtt:** completar a pirâmide: lógica, E2E (celular e computador), mutação, regressão do que já existe, teste negativo de segurança.
4. **Documentar:** regra de negócio, decisão em PEDIDOS-E-DECISOES, comentários no código.
5. **Enviar ao `dev`** → CI → conferir em `/dev/` → `done`.
6. **PR dev → main** → merge só com os checks verdes → produção → o CI marca `em-producao` e fecha.
7. **Se um teste reprovar no CI:** abre uma issue `bug` sozinho (com erro, evidência e como reproduzir). Corrigir o app ou o teste (entendendo a causa), criar/reforçar o teste de regressão, provar por mutação. O CI marca `done` quando passar de novo.

### Definition of Done
Testes verdes (CI) · mutação provou os testes · regra de negócio documentada · decisão registrada · código comentado e mais limpo do que estava · conferido em `/dev/` · nenhum segredo ou dado pessoal no repositório.

---

## 6. Checklist de segurança (para revisão e pentest manual)
Baseado no OWASP ASVS, adaptado ao nosso tamanho.
- **Autenticação:** senha forte, recuperação de senha, bloqueio de tentativas, sessão encerra ao sair.
- **Autorização:** tentar ler/gravar `users/{outro uid}`, `profiles/{outro}`, `admins/*`, `errors/*` com usuário comum (tem que negar). Tentar virar administrador.
- **Entrada:** colar `<script>`, `"><img onerror>`, aspas e emojis em todos os campos (nome de categoria, descrição, nome do perfil) e conferir que aparecem como texto.
- **Porteiro:** chamar sem token, com token de outro projeto, expirado, de outro e-mail, de outra origem, com período maior que o permitido (tem que recusar).
- **Segredos:** procurar chaves no repositório, no HTML publicado e nos logs.
- **Dependências:** `npm audit`, alertas do Dependabot e do CodeQL.
- **Configuração:** domínios autorizados, chave de API presa ao site, proteção de enumeração de e-mails, regras publicadas nos dois projetos.

---

## 7. Qualidade do código
- **Comentar:** cada arquivo começa dizendo para que serve; funções não óbvias explicam o porquê. Em português.
- **Orientação a objetos onde há estado e comportamento juntos** (já é assim em `CloudBackend`, `LocalBackend`, `FirestoreStore`, `DeviceStore`, diálogos). Uma parte do código ainda é funcional com estado global (`S`, `tab`, `selY`): **honestamente, é dívida técnica.** Regra do escoteiro: ao mexer num arquivo, deixá-lo um pouco melhor (extrair função/classe, nomear melhor, remover repetição); refatorações grandes só com a rede de testes verde e em issue própria.
- **Reuso:** antes de criar, procurar o que já existe (`tests/helpers`, `e2e/support`, funções do modelo).
- **Funções do modelo** não mexem na tela e têm teste de lógica; telas só desenham e chamam o modelo.

---

## 8. O que falta (backlog de engenharia)
Cada item é uma issue no quadro: atualizar o Firebase SDK e usar SRI · XSS e CSP · teste de intrusão automatizado (ZAP) · limite de pedidos e teste de carga do porteiro (k6) · App Check (reCAPTCHA) · Page Objects por tela · redução do estado global · backup automático. Ver as issues com a etiqueta `qualidade`.

> **Nota sobre as 14 falhas "altas" do `npm audit` (27/11/2026):** estão nas ferramentas de teste (`firebase`, `firebase-tools`, `@grpc/grpc-js`, etc.), que **não vão para o site**. Entram no resumo semanal e o Dependabot propõe as atualizações; só falha **crítica** ou qualquer falha em dependência de produção reprova o workflow.
