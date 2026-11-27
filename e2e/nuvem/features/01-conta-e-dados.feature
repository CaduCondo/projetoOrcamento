# language: pt
Funcionalidade: Conta e dados na nuvem
  Para usar o app em qualquer aparelho
  Meus lançamentos ficam guardados no banco e voltam quando eu entro de novo

  Cenário: Criar conta, lançar, e o lançamento vir do banco depois de recarregar e de sair e entrar
    Dado que criei uma conta na nuvem
    Quando lanço "Compra da nuvem" de "12,34" na categoria "Mercado"
    Então o banco guarda o lançamento "Compra da nuvem" desta conta
    Quando recarrego a página
    Então o lançamento "Compra da nuvem" está na lista de lançamentos do mês
    Quando saio do app pelo menu
    E entro de novo com a mesma conta
    Então o lançamento "Compra da nuvem" está na lista de lançamentos do mês

  Cenário: Num aparelho novo o lançamento aparece, porque veio do banco e não do aparelho
    Dado que criei uma conta na nuvem
    Quando lanço "Veio do banco" de "50,00" na categoria "Mercado"
    E entro com a mesma conta num aparelho novo
    Então no aparelho novo o lançamento "Veio do banco" aparece, porque veio do banco

  Cenário: Senha errada é recusada e a pessoa continua fora do app
    Dado que criei uma conta na nuvem
    Quando saio do app pelo menu
    E tento entrar com a senha errada
    Então vejo a mensagem de erro de login e continuo fora do app
    Quando entro de novo com a mesma conta
    Então vejo a tela principal do app
