---
name: Bug
about: Algo não funciona como deveria (vira teste de regressão antes de ser corrigido)
labels: bug, backlog
---

**Resumo** (uma frase, em português simples)

**Onde** (produção, teste/dev; celular ou computador; qual tela)

**Cenário (BDD) que reproduz o defeito**
```gherkin
Dado que ...
Quando ...
Então ...
```

**Resultado esperado**

**Resultado obtido** (mensagem de erro, valor errado, print, link do relatório do CI)

**Evidência** (print, vídeo, link da execução do CI)

**Teste de regressão que vai nascer com a correção**
- [ ] cenário E2E em `e2e/features` (e/ou teste de lógica em `tests/`) que **reprova hoje** e passa depois da correção
- [ ] entrada em `e2e/verificar-mutacoes.py` provando que o teste pega o defeito

**Impacto e prioridade sugerida:** P0 urgente (para tudo) · P1 alta · P2 média · P3 baixa

**Segurança/privacidade?** (algum dado de outra pessoa pode vazar ou ser alterado? Se sim, marque P0 e avise o dono)
