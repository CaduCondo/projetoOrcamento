# language: pt
Funcionalidade: Tela do mês
  Para saber quanto já gastei e quanto ainda vou gastar
  Eu lanço valores nas categorias do mês

  Cenário: Lançar um gasto já pago soma no total pago e continua lá depois de recarregar
    Dado que tenho uma conta nova e vazia
    Quando incluo a categoria "Moradia" nas "Despesas" do mês atual
    E lanço "Aluguel" de "1.000,00" na categoria "Moradia" como já pago
    Então o total pago de "Despesas" mostra "1.000,00"
    E a categoria "Moradia" mostra o valor "1.000,00" na tabela do mês
    Quando recarrego a página
    Então o total pago de "Despesas" mostra "1.000,00"

  Cenário: Um lançamento só previsto não entra no total pago
    Dado que tenho uma conta nova e vazia
    Quando incluo a categoria "Moradia" nas "Despesas" do mês atual
    E lanço "Aluguel" de "1.000,00" na categoria "Moradia" como apenas previsto
    Então o total pago de "Despesas" mostra "0,00"
    E a categoria "Moradia" mostra o previsto "1.000,00" na tabela do mês

  Cenário: Apagar um item pede confirmação e só some se eu confirmar
    Dado que tenho uma conta nova e vazia
    E que lancei "Aluguel" de "1.000,00" na categoria "Moradia" no mês de "Outubro"
    Quando abro a categoria "Moradia" do mês
    E clico para apagar o item "Aluguel"
    E cancelo a confirmação
    Então o item "Aluguel" continua na janela da categoria
    Quando clico para apagar o item "Aluguel"
    E confirmo a exclusão do item
    Então a janela da categoria não tem mais itens
    E o total pago de "Despesas" mostra "0,00"

  Cenário: O resumo do mês calcula quanto posso gastar por dia sem contar o dinheiro guardado
    Dado que tenho uma conta nova e vazia
    E que lancei "Salário" de "3.100,00" na categoria "Salário" no mês de "Outubro"
    E que lancei "Aluguel" de "1.000,00" na categoria "Moradia" no mês de "Outubro"
    Então o resumo do mês mostra "Pode gastar por dia" com "R$ 123,53"
    Quando anoto um saldo guardado de "Poupança" com "1.000.000,00" no Patrimônio
    E vou para a aba "mês"
    Então o resumo do mês mostra "Pode gastar por dia" com "R$ 123,53"

  Cenário: Editar o nome da categoria na janela dos lançamentos do mês
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Debitos carro"
    E que lancei "Licenciamento" de "150,00" na categoria "Debitos carro" no mês de "Setembro"
    Quando abro a categoria "Debitos carro" do mês de "Setembro"
    E troco o nome da categoria para "Carro" na janela
    Então o título da janela da categoria mostra "Carro"
    Quando fecho a janela da categoria
    Então no mês de "Setembro" a categoria "Carro" mostra o valor "150,00"
    Quando recarrego a página
    Então no mês de "Setembro" a categoria "Carro" mostra o valor "150,00"

  Cenário: Nome novo vale para todos os meses quando a categoria já tinha lançamentos em meses anteriores
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Debitos carro"
    E que lancei "Licenciamento" de "150,00" na categoria "Debitos carro" no mês de "Agosto"
    E que lancei "IPVA" de "200,00" na categoria "Debitos carro" no mês de "Setembro"
    Quando abro a categoria "Debitos carro" do mês de "Setembro"
    E troco o nome da categoria para "Carro" na janela
    E escolho "Em todos os meses" para o novo nome
    Então o título da janela da categoria mostra "Carro"
    Quando fecho a janela da categoria
    Então no mês de "Agosto" a categoria "Carro" mostra o valor "150,00"
    E no mês de "Setembro" a categoria "Carro" mostra o valor "200,00"

  Cenário: Não deixa dar à categoria um nome que outra categoria já usa
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Aluguel"
    E que criei a categoria de despesa "Condomínio"
    E que lancei "Parcela" de "100,00" na categoria "Aluguel" no mês de "Setembro"
    Quando abro a categoria "Aluguel" do mês de "Setembro"
    E troco o nome da categoria para "Condomínio" na janela
    Então vejo o aviso "Já existe uma categoria com esse nome" ao editar o nome
    Quando corrijo o nome para "Casa própria" e confirmo
    Então o título da janela da categoria mostra "Casa própria"

  Cenário: Depois de mudar o nome só daqui em diante, dá para valer em todos os meses
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Debitos carro"
    E que lancei "Licenciamento" de "150,00" na categoria "Debitos carro" no mês de "Agosto"
    E que lancei "IPVA" de "200,00" na categoria "Debitos carro" no mês de "Setembro"
    Quando abro a categoria "Debitos carro" do mês de "Setembro"
    E troco o nome da categoria para "Carro" na janela
    E escolho "Só de setembro/2026 em diante" para o novo nome
    E fecho a janela da categoria
    Então no mês de "Agosto" a categoria "Debitos carro" mostra o valor "150,00"
    E no mês de "Setembro" a categoria "Carro" mostra o valor "200,00"
    Quando abro a categoria "Carro" do mês de "Setembro"
    E troco o nome da categoria para "Documentos carro" na janela
    E escolho "Em todos os meses" para o novo nome
    E fecho a janela da categoria
    Então no mês de "Agosto" a categoria "Documentos carro" mostra o valor "150,00"
    E no mês de "Setembro" a categoria "Documentos carro" mostra o valor "200,00"
