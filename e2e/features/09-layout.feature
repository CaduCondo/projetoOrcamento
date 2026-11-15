# language: pt
Funcionalidade: Tela legível
  Para ver os valores sem precisar arrastar a tela
  A tabela de Despesas nunca corta o valor, mesmo com descrição longa

  Esquema do Cenário: O valor aparece inteiro dentro do painel de Despesas com <largura> pixels de largura
    Dado que tenho uma conta nova e vazia
    E que lancei "PAG BOLETO NEW STAR BANK COMERCIO DE ALIMENTOS E BEBIDAS LTDA 000012345" de "1.234,56" na categoria "Moradia" no mês de "Outubro"
    Quando a janela do navegador tem <largura> pixels de largura
    Então o valor "1.234,56" da categoria "Moradia" aparece inteiro dentro do painel de Despesas

    Exemplos:
      | largura |
      | 1280    |
      | 800     |
      | 390     |
