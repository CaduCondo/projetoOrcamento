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
