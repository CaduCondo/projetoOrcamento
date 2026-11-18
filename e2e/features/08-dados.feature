# language: pt
Funcionalidade: Meus dados
  Para não perder o que lancei
  Eu baixo um backup, posso zerar a conta de teste e carregar o backup de volta

  Cenário: O backup baixado traz o que lancei e pode ser carregado de volta depois de zerar
    Dado que tenho uma conta nova e vazia
    E que lancei "Aluguel" de "1.000,00" na categoria "Moradia" no mês de "Outubro"
    Quando baixo o backup nos Ajustes
    Então o arquivo de backup contém o lançamento "Aluguel" de 1000
    Quando zero os meus dados digitando "APAGAR"
    Então o total pago de "Despesas" mostra "0,00"
    Quando carrego o backup baixado substituindo tudo
    Então o total pago de "Despesas" mostra "1.000,00"

  Cenário: Zerar os dados apaga os lançamentos e volta às categorias básicas
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia"
    E que lancei "Mensalidade" de "99,90" na categoria "Academia" no mês de "Outubro"
    Quando zero os meus dados digitando "APAGAR"
    Então o total pago de "Despesas" mostra "0,00"
    E a categoria "Academia" não está mais na lista de categorias
    E a categoria "Mercado" continua na lista de categorias

  Cenário: Zerar sem digitar APAGAR não apaga nada
    Dado que tenho uma conta nova e vazia
    E que lancei "Aluguel" de "1.000,00" na categoria "Moradia" no mês de "Outubro"
    Quando zero os meus dados digitando "apagar tudo"
    Então o total pago de "Despesas" mostra "1.000,00"
