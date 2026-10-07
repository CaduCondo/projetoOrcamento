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
2. Rodar os testes: `npm test`. Para ver o app: `npm run build:dev` e `npm run serve` (abre em http://localhost:8000).
3. Enviar ao GitHub (`git push`). Os testes rodam sozinhos; se passarem, o site de **teste** é atualizado.
4. Conferir em `/dev/`. Estando bom, passar para produção: abrir um *Pull Request* de `dev` para `main` e aprovar.
   Os testes rodam de novo e, se passarem, a **produção** é atualizada.

> O site só é publicado se **todos os testes passarem**. Se algo falhar, o site continua como estava.

## Como o código está organizado
```
src/
  index.html            casca da página
  css/styles.css        aparência
  js/                   o programa, em ordem de leitura (os números definem a ordem de montagem)
    00-config.js        constantes (valores do ambiente entram aqui pelo build)
    10-format.js        formatar/ler valores em R$, escapar texto
    20-model-state.js   estado global, conta nova, migração de formato antigo
    21-model-calc.js    totais, saldos, acumulado, previsto × realizado
    22-model-categories.js  categorias: ativas, mesclar, reordenar, excluir, importar anos
    23-model-serialize.js   como os dados viram documentos na nuvem e voltam
    30-storage.js       aviso "Salvo" e pontos de entrada (save/logout/doLogin)
    31-backend-local.js     LocalBackend: contas e dados só neste navegador
    32-backend-cloud.js     CloudBackend: Firebase (login + Firestore)
    36-backend.js       escolhe qual dos dois usar
    40..44-ui-*.js      peças de tela: máscara de moeda, menu, login, balões, utilidades
    50..55-view-*.js    telas: Mês, Ano, janela de itens, Gráficos, Patrimônio, Ajustes
    60..62-ui-*.js      busca de categoria (combobox), mesclar, gerenciador de categorias
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
- `tests/model.test.js` — regras de negócio (valores, totais, saldos, categorias, importação, formato da nuvem).
- `tests/smoke-local.test.js` e `tests/smoke-cloud.test.js` — simulam uma pessoa usando o app (criar conta, lançar,
  editar, mesclar, sair e voltar), com um Firebase simulado para o modo nuvem.
- `tests/repo.test.js` — higiene: nenhuma planilha/dado pessoal versionado, build dos 3 ambientes, regras do Firestore.

Quando corrigir um defeito, **escreva primeiro o teste que o reproduz**.

## Banco de dados (Firestore)
Estrutura por usuário: `users/{uid}/meta/main` (categorias, anos, patrimônio) e `users/{uid}/years/{ano}` (lançamentos do ano).
As regras estão em `firestore.rules` e precisam estar **publicadas nos dois projetos** (Firebase → Firestore → Regras → Publicar).
Mudou o formato dos dados? Teste antes no ambiente de teste, com uma conta de teste.

## Privacidade
- Nunca versionar planilhas, backups `.json` ou dados reais (o `.gitignore` e os testes protegem).
- A chave do Firebase em `src/config/*.json` é pública por desenho; quem protege os dados são as regras do Firestore.
