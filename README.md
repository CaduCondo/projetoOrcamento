# Meu Orçamento

Controle de orçamento pessoal em um único arquivo HTML, com login e dados na nuvem.

- Lançamentos por categoria e mês, com os itens que formam cada total
- Previsto × realizado, vários anos, 16 gráficos, busca de categorias, mesclar duplicatas
- Login por e-mail e senha; dados sincronizados entre aparelhos (Firebase Auth + Firestore)
- Importação/backup em JSON e exportação para Excel (CSV)

| Ambiente | Endereço |
|---|---|
| Produção | https://caducondo.github.io/projetoOrcamento/ |
| Teste (dev) | https://caducondo.github.io/projetoOrcamento/dev/ |

Para desenvolver, testar e publicar: veja [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md).

```bash
npm install        # uma vez
npm test           # 78 testes automáticos
npm run test:rules # 8 testes das regras de segurança (precisa de Java)
npm run build:dev  # monta dist/index.html (ambiente de teste)
npm run serve      # http://localhost:8000
```
