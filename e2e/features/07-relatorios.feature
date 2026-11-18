# language: pt
Funcionalidade: Recorrentes e perguntas rápidas
  Para entender para onde meu dinheiro vai
  Eu vejo o que se repete todo mês e respostas em palavras

  Cenário: Uma assinatura que aparece em três meses é reconhecida como recorrente
    Dado que tenho uma conta nova e vazia
    Quando importo uma fatura OFX do cartão com a compra "NETFLIX" de "39,90" no dia 10 de "Agosto"
    E importo uma fatura OFX do cartão com a compra "NETFLIX" de "39,90" no dia 10 de "Setembro"
    E importo uma fatura OFX do cartão com a compra "NETFLIX" de "39,90" no dia 10 de "Outubro"
    E importo uma fatura OFX do cartão com a compra "MERCADO X" de "20,00" no dia 10 de "Agosto"
    E importo uma fatura OFX do cartão com a compra "MERCADO X" de "180,00" no dia 10 de "Setembro"
    E importo uma fatura OFX do cartão com a compra "MERCADO X" de "60,00" no dia 10 de "Outubro"
    E importo uma fatura OFX do cartão com a compra "ACADEMIA X" de "50,00" no dia 10 de "Setembro"
    E importo uma fatura OFX do cartão com a compra "ACADEMIA X" de "50,00" no dia 10 de "Outubro"
    Então a página Categorias lista a recorrente "NETFLIX" com "39,90"
    E a página Categorias não lista a recorrente "MERCADO X"
    E a página Categorias não lista a recorrente "ACADEMIA X"

  Cenário: As perguntas rápidas respondem com os valores do que eu lancei
    Dado que tenho uma conta nova e vazia
    E que lancei "Salário" de "3.000,00" na categoria "Salário" no mês de "Outubro"
    E que lancei "Aluguel" de "1.000,00" na categoria "Moradia" no mês de "Outubro"
    Quando vou para a aba "gráficos"
    E abro a pergunta "Quanto sobrou?"
    Então a resposta da pergunta "Quanto sobrou?" diz "sobrou" com "2.000,00"
    Quando abro a pergunta "Onde gastei mais?"
    Então a resposta da pergunta "Onde gastei mais?" diz "Moradia" com "1.000,00"
