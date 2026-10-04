# Meu Orçamento

Controle de orçamento pessoal em um único arquivo HTML. Funciona offline, sem servidor:
os dados ficam no navegador de cada pessoa (localStorage).

- Lançamentos por categoria e mês, com os itens que formam cada total
- Previsto × realizado, vários anos, 16 gráficos
- Importação/backup em JSON e exportação para Excel (CSV)

## Estrutura
- `index.html` — o app pronto (gerado, sem dados pessoais)
- `src/template.html` — código-fonte do app
- `src/chart.js` — biblioteca Chart.js (MIT)
- `build.py` — `python build.py` regenera o `index.html`

> Os dados não vão para o servidor. Para login e sincronização entre aparelhos, é preciso um backend (próxima etapa).
