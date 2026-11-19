# Carga da planilha (Excel → Meu Orçamento)

Converte as abas de ano (2015–2026) da planilha para um arquivo que o app carrega, e **confere sozinho** que os totais bateram.

```bash
python tools/planilha/converter.py "C:/caminho/Orçamento.xlsx"          # gera a pasta Downloads/orcamento-carga
python build.py --env local --out dist/e2e/index.html
python -m http.server 4173 --directory dist/e2e                          # em outro terminal
node tools/planilha/verificar-no-app.js "C:/Users/<você>/Downloads/orcamento-carga"
```

Os arquivos gerados têm dados financeiros pessoais: ficam **fora do repositório** (o `.gitignore` bloqueia `*.xlsx`).

## Regras (do dono)
- Valor da célula = soma das linhas da nota até a **1ª linha em branco** (confirmadas). Linhas **depois** da linha em branco = **previstas**.
- **OK** ao lado do valor = confirmado. Em 2026, sem OK = previsto (nos anos já encerrados, sem OK = confirmado).
- Valor em **texto** (`#  571,99`, `R$1.100#`, `11,58`) e linhas de nota que começam com `#` = informativo (💳, não soma), como o Excel (que não soma texto).
- Linha que o **TOTAL da planilha não soma** (fora do `=SUM(...)` daquele mês) = informativa, para o app bater com o total que a planilha mostra.
- Nota que não fecha com a célula: o total da planilha manda; entra a linha `(sem detalhe / diferença)` com ⚠ (regra já existente do app).
- Saldo inicial de cada ano: ajustado para que o saldo de janeiro bata com o "TOTAL ACUMULADO" digitado na planilha.

## Como carregar no app
Ajustes → **Carregar backup** → escolha `orcamento-planilha.json` → **Juntar** (os anos do arquivo substituem os mesmos anos que já estão no app). Faça um backup antes.
