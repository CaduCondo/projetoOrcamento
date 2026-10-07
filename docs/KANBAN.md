# Kanban: como o trabalho é acompanhado

Cada coisa a fazer é uma **issue** do GitHub. O estado é a etiqueta:

| Etiqueta | Significa | Quem muda |
|---|---|---|
| `backlog` | pedido registrado, ainda não começou | criada junto com a issue |
| `wip` | em andamento (trocar `backlog` por `wip` ao **começar**) | quem está trabalhando |
| `done` | concluída (trocar por `done` e **fechar** a issue ao terminar, com os testes verdes) | quem concluiu |

**Prioridade:** `P0` urgente (para tudo) · `P1` alta · `P2` média · `P3` baixa.
**Tipo:** `bug`, `enhancement` (melhoria), `epic` (agrupa tarefas), mais etiquetas de área: `perfil`, `armazenamento`, `admin`, `categorias`, `mobile`, `qualidade`, `privacidade`, `documentation`.

## Ver o quadro
- Lista por estado: `gh issue list --label backlog` · `--label wip` · `--label done --state all`.
- No site: github.com/CaduCondo/projetoOrcamento/issues (use os filtros de etiqueta).
- **Quadro de colunas (GitHub Projects):** precisa autorizar o escopo `project` no GitHub CLI uma vez (`gh auth refresh -s project -h github.com`, abre o navegador); depois as colunas
  Backlog / WIP / Done são ligadas às etiquetas acima. Enquanto isso, as etiquetas fazem o papel das colunas.

## Fluxo de cada tarefa
1. Escolher uma issue `backlog` de maior prioridade → trocar para `wip` (`gh issue edit N --remove-label backlog --add-label wip`).
2. Trabalhar no ramo `dev`, com testes; mencionar `#N` nas mensagens de commit.
3. Testes verdes e conferido no ambiente de teste → `done` (`gh issue edit N --remove-label wip --add-label done`) e fechar (`gh issue close N`).
4. Bug novo (achado por pessoa ou pelos testes): abrir issue `bug` com passos, evidência e prioridade.

## Épicos
Os épicos (`epic`) trazem a lista de tarefas com caixas de seleção ligadas às issues (`- [ ] #N`); o GitHub marca sozinho quando a issue fecha.
