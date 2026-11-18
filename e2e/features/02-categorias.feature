# language: pt
Funcionalidade: Categorias
  Para organizar meu dinheiro do meu jeito
  Eu crio, edito e excluo categorias

  Cenário: Criar uma categoria de despesa com dia e ícone e ela continuar lá depois de recarregar
    Dado que tenho uma conta nova e vazia
    Quando crio a categoria de despesa "Academia" com o dia 10 e o ícone "🎮"
    Então a categoria "Academia" aparece na lista de categorias com o dia 10
    E a categoria "Academia" aparece na lista com o ícone "🎮"
    Quando recarrego a página
    Então a categoria "Academia" aparece na lista de categorias com o dia 10

  Cenário: Mudar só o dia de uma categoria que já tem histórico não cria uma segunda categoria
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia"
    E que lancei "Mensalidade" de "99,90" na categoria "Academia" no mês de "Setembro"
    Quando mudo o dia da categoria "Academia" para 10
    Então a categoria "Academia" aparece só uma vez na lista de categorias
    E a categoria "Academia" tem o dia 10
    E no mês de "Setembro" a categoria "Academia" também mostra o dia 10 na tela do mês

  Cenário: Renomear uma categoria com histórico mostra uma linha só, com o nome novo
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia"
    E que lancei "Mensalidade" de "99,90" na categoria "Academia" no mês de "Setembro"
    Quando mudo o nome da categoria "Academia" para "Academia Smart"
    Então a categoria "Academia Smart" aparece só uma vez na lista de categorias
    E a lista de categorias não tem uma linha só chamada "Academia"

  Cenário: Excluir uma categoria pede confirmação e ela some da lista
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia"
    Quando excluo a categoria "Academia" e confirmo
    Então o app perguntou se eu queria mesmo excluir "Academia"
    E a categoria "Academia" não está mais na lista de categorias

  Cenário: Desistir na confirmação mantém a categoria
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia"
    Quando excluo a categoria "Academia" e desisto na confirmação
    Então o app perguntou se eu queria mesmo excluir "Academia"
    E a categoria "Academia" continua na lista de categorias

  Cenário: Escolher um dos novos ícones e uma das novas cores na categoria
    Dado que tenho uma conta nova e vazia
    Quando crio a categoria de despesa "Dentista" com o ícone "🦷" e a cor "#2dd4bf"
    Então a categoria "Dentista" aparece na lista com o ícone "🦷"
    E a categoria "Dentista" aparece na lista com a cor "#2dd4bf"
    Quando recarrego a página
    Então a categoria "Dentista" aparece na lista com o ícone "🦷"
    E a categoria "Dentista" aparece na lista com a cor "#2dd4bf"

  Cenário: Cabeçalho e linhas da lista de categorias ficam alinhados
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "Academia" com o dia 10
    E que criei a categoria de receita "Freelance"
    Então os títulos da lista de categorias estão alinhados com os dados das linhas
