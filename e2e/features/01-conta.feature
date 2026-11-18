# language: pt
Funcionalidade: Conta e acesso
  Para que meus dados fiquem guardados e protegidos
  Eu crio uma conta, saio e entro de novo com a minha senha

  Cenário: Criar a conta e continuar logada depois de recarregar a página
    Dado que criei a conta "ana@exemplo.com"
    Então vejo o e-mail "ana@exemplo.com" no topo do app
    Quando recarrego a página
    Então vejo o e-mail "ana@exemplo.com" no topo do app

  Cenário: Sair e entrar de novo; senha errada é recusada e a certa abre os mesmos dados
    Dado que criei a conta "ana@exemplo.com"
    E que criei a categoria de despesa "Academia" com o dia 10
    Quando saio do app
    E tento entrar com "ana@exemplo.com" e a senha "SenhaErrada#999"
    Então vejo a mensagem de erro de login
    E não vejo o app aberto
    Quando entro com "ana@exemplo.com" e a senha correta
    Então vejo o e-mail "ana@exemplo.com" no topo do app
    E a categoria "Academia" continua na lista de categorias
