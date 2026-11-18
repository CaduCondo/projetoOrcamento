# language: pt
Funcionalidade: Carteira (dinheiro em papel)
  Para saber quanto dinheiro vivo eu tenho
  Eu anoto o que entra e o que sai da carteira

  Cenário: Anotar entrada e saída de dinheiro na carteira muda o saldo e o histórico
    Dado que tenho uma conta nova e vazia
    Quando anoto que entraram "300,00" na carteira com a descrição "Saque no caixa"
    E anoto que saíram "45,50" da carteira com a descrição "Feira"
    Então o saldo da carteira é "254,50"
    E o histórico da carteira mostra "Saque no caixa" com "300,00"
    E o histórico da carteira mostra "Feira" com "45,50"
    Quando recarrego a página
    Então o saldo da carteira é "254,50"

  Cenário: Pagar um lançamento em dinheiro desconta da carteira e o gasto aparece no mês
    Dado que tenho uma conta nova e vazia
    E que anotei que entraram "300,00" na carteira com a descrição "Saque no caixa"
    Quando crio o lançamento "Feira" de "45,50" no dia 3 na categoria "Mercado" pago em dinheiro
    Então o saldo da carteira é "254,50"
    E vejo o lançamento "Feira" de "45,50" como "saída"
