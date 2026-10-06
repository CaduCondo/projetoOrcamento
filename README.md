# Meu Orçamento

Controle de orçamento pessoal em um único arquivo HTML.

- Lançamentos por categoria e mês, com os itens que formam cada total
- Previsto × realizado, vários anos, 16 gráficos
- Login por e-mail e senha, dados sincronizados na nuvem (Firebase Auth + Firestore)
- Importação/backup em JSON e exportação para Excel (CSV)

Site: https://caducondo.github.io/projetoOrcamento/

## Estrutura
- `index.html` — o app pronto (gerado)
- `src/template.html` — código-fonte do app
- `src/chart.js` — biblioteca Chart.js (MIT)
- `src/firebase-config.json` — identificadores públicos do projeto Firebase (não são segredo)
- `firestore.rules` — regras de segurança do Firestore: cada pessoa só acessa `users/{seu-uid}`
- `build.py` — `python build.py --cloud` regenera o `index.html`

## Segurança
A chave do Firebase no código é pública por desenho. Quem protege os dados são as regras em `firestore.rules`
(publicadas no console do Firebase). Nunca versionar planilhas, backups `.json` ou `seed.json` (veja `.gitignore`).
