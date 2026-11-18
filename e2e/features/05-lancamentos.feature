# language: pt
Funcionalidade: Lançamentos e automações
  Para achar, organizar e categorizar cada movimentação
  Eu uso a lista de lançamentos, as automações e as tags

  Cenário: Criar um lançamento à mão numa categoria e achá-lo pela busca
    Dado que tenho uma conta nova e vazia
    Quando crio o lançamento "Padaria" de "12,50" no dia 20 na categoria "Mercado"
    E crio o lançamento "Farmácia" de "30,00" no dia 21 na categoria "Saúde"
    Então na lista de lançamentos vejo 2 lançamentos
    E vejo o lançamento "Padaria" de "12,50" como "saída"
    E o lançamento "Padaria" está na categoria "Mercado"
    Quando busco por "farm" nos lançamentos
    Então a lista mostra só 1 lançamento

  Cenário: Uma automação criada num lançamento organiza sozinha o próximo extrato
    Dado que tenho uma conta nova e vazia
    E que importei o extrato OFX da conta com 3 movimentações
    Quando abro o lançamento "CONTA VIVO"
    E escolho a categoria "Contas (luz, água, internet)" e peço para lembrar
    Então o lançamento "CONTA VIVO" está na categoria "Contas (luz, água, internet)"
    E vejo o aviso de 2 lançamentos sem categoria
    Quando importo o extrato OFX da conta com a conta Vivo de outro dia
    Então o lançamento "CONTA VIVO 05/10" está na categoria "Contas (luz, água, internet)"
    E vejo o aviso de 2 lançamentos sem categoria
    E a página Categorias mostra a automação "conta vivo" para "Contas (luz, água, internet)"

  Cenário: Tags com # juntam lançamentos de categorias diferentes
    Dado que tenho uma conta nova e vazia
    Quando crio o lançamento "Hotel #viagem" de "300,00" no dia 5 na categoria "Moradia"
    E crio o lançamento "Lanche #viagem" de "80,00" no dia 6 na categoria "Mercado"
    E crio o lançamento "Pão" de "20,00" no dia 7 na categoria "Mercado"
    Então na lista de lançamentos vejo 3 lançamentos
    Quando clico na tag "#viagem"
    Então a lista mostra só 2 lançamentos
