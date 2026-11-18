# language: pt
Funcionalidade: Importar extrato e fatura
  Para não digitar tudo à mão
  Eu importo o arquivo do banco e confiro o que entrou

  Cenário: Importar o extrato da conta por arquivo OFX traz todas as movimentações, sem categoria
    Dado que tenho uma conta nova e vazia
    Quando importo o extrato OFX da conta com 3 movimentações
    Então na lista de lançamentos vejo 3 lançamentos
    E vejo o lançamento "REMUNERACAO SALARIO" de "5.000,00" como "entrada"
    E vejo o lançamento "CONTA VIVO" de "99,90" como "saída"
    E vejo o lançamento "PIX LOJA" de "50,00" como "saída"
    E vejo o aviso de 3 lançamentos sem categoria

  Cenário: Importar o mesmo extrato de novo não duplica nada
    Dado que tenho uma conta nova e vazia
    E que importei o extrato OFX da conta com 3 movimentações
    Quando tento importar o mesmo extrato de novo
    Então na tela de importação os 3 itens aparecem como já importados e não dá para importar de novo
    E na lista de lançamentos vejo 3 lançamentos

  Cenário: Fatura do cartão com compra parcelada mostra as parcelas que faltam nos próximos meses
    Dado que tenho uma conta nova e vazia
    Quando importo uma fatura OFX do cartão com a compra "LOJA TRES 03/05" de "100,00" no dia 21 de "Outubro"
    Então no resumo do mês vejo as parcelas já comprometidas de "nov" com "100,00"
    Quando abro o detalhe das parcelas
    Então o detalhe das parcelas mostra "LOJA TRES" na "parcela 4 de 5"
    E o detalhe das parcelas mostra "LOJA TRES" na "parcela 5 de 5"
    E o detalhe das parcelas não mostra mais parcelas depois da quinta
