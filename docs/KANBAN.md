# Kanban: como o trabalho é acompanhado

Cada coisa a fazer é uma **issue** do GitHub. O estado é a etiqueta:

| Etiqueta | Significa | Quem muda |
|---|---|---|
| `backlog` | ideia registrada; ainda sem cenários/critérios | criada junto com a issue |
| `todo` | pronta para começar: tem **cenários BDD**, critérios de aceite, testes planejados e riscos de segurança vistos | quem priorizou |
| `wip` | *Working in Progress*: escrevendo o código (TDD: teste primeiro) | quem começou |
| `wtt` | *Working on The Tests*: código pronto, completando e reforçando testes (lógica, E2E, mutação, regressão, segurança) | quem está testando |
| `done` | pronto no ambiente de teste: CI do `dev` verde e conferido em `/dev/` | quem concluiu; **o CI também marca** bug que volta a passar |
| `em-producao` | no ar: a `main` foi publicada | **o CI marca sozinho** e fecha a issue |

Fluxo: `backlog → todo → wip → wtt → done → em-producao` (a issue fecha em `em-producao`). Detalhes de cada estado em [ENGENHARIA.md](ENGENHARIA.md#5-processo-do-pedido-à-produção).

**Prioridade:** `P0` urgente (para tudo) · `P1` alta · `P2` média · `P3` baixa.
**Tipo:** `bug`, `enhancement` (melhoria), `epic` (agrupa tarefas), mais etiquetas de área: `perfil`, `armazenamento`, `admin`, `categorias`, `mobile`, `qualidade`, `privacidade`, `documentation`.

## Ver o quadro
- Lista por estado: `gh issue list --label backlog` · `--label wip` · `--label done --state all`.
- No site: github.com/CaduCondo/projetoOrcamento/issues (use os filtros de etiqueta).
- **Quadro de colunas (GitHub Projects):** precisa autorizar o escopo `project` no GitHub CLI uma vez (`gh auth refresh -s project -h github.com`, abre o navegador); depois as colunas
  Backlog / WIP / Done são ligadas às etiquetas acima. Enquanto isso, as etiquetas fazem o papel das colunas.

## Fluxo de cada tarefa
1. Escolher a issue `todo` de maior prioridade → `wip`. (Se só estiver em `backlog`, primeiro escrever cenários BDD e critérios e promover a `todo`.)
2. Trabalhar no ramo `dev`, **teste primeiro**; mencionar `#N` nas mensagens de commit.
3. Código pronto → `wtt` (completar os testes). Testes verdes no CI do `dev` e conferido em `/dev/` → `done` (a issue **continua aberta**).
4. PR dev → main, merge com os checks verdes → o CI marca `em-producao` e **fecha** a issue sozinho.
5. Bug novo: se foi o CI que achou, a issue já foi aberta sozinha; se foi uma pessoa, abrir issue `bug` com cenário, esperado, obtido e evidência. Todo bug ganha teste de regressão.

## Épicos
Os épicos (`epic`) trazem a lista de tarefas com caixas de seleção ligadas às issues (`- [ ] #N`); o GitHub marca sozinho quando a issue fecha.


## Bugs do CI entram sozinhos
Cenário reprovado no GitHub vira issue `bug` + `backlog` + `P1` + `ci-automatico` ("[CI/dev] nome do cenário") e vira `done` sozinha quando passa de novo (e `em-producao`, fechada, quando a `main` é publicada). O resultado de cada execução é comentado na issue "📬 Resultados do CI" (o dono recebe por e-mail). Ver `docs/PEDIDOS-E-DECISOES.md` §5.26.
