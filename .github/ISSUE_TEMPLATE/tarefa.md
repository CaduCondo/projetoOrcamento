---
name: Tarefa / melhoria
about: Algo novo ou uma melhoria (nasce em backlog; só vai para todo quando tiver cenários e critérios)
labels: enhancement, backlog
---

**Pedido** (com as palavras do dono, em português simples)

**Regra de negócio** (o que o sistema deve fazer e por quê; se mudar uma regra, atualizar `docs/REGRAS-DE-NEGOCIO.md`)

**Cenários (BDD)**
```gherkin
Cenário: ...
  Dado que ...
  Quando ...
  Então ...
```

**Critérios de aceite** ("pronto quando")
- [ ] ...

**Testes planejados** (TDD: escrever primeiro)
- [ ] lógica/modelo (`tests/`)
- [ ] ponta a ponta no Chrome (`e2e/features`), celular e computador quando a tela muda
- [ ] mutação (`e2e/verificar-mutacoes.py`)
- [ ] regressão: o que já existe e pode quebrar?

**Segurança e privacidade** (dados de quem? quem pode ler/alterar? precisa de regra do banco?)

**Documentação** (docs/PEDIDOS-E-DECISOES.md, docs/REGRAS-DE-NEGOCIO.md)

**Prioridade sugerida:** P0 · P1 · P2 · P3
