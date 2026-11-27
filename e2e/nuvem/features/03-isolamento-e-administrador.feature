# language: pt
Funcionalidade: Cada pessoa só vê o que é dela; só o administrador lê os dados dos outros
  Para os meus dados financeiros ficarem seguros
  O banco recusa o acesso de outras pessoas, mesmo quando tentam pulando o app

  Cenário: Uma pessoa não lê nem altera os dados de outra, e não vira administradora
    Dado que criei uma conta na nuvem chamada "Ana"
    E lanço "Segredo da Ana" de "99,00" na categoria "Mercado"
    Quando saio do app pelo menu
    E que criei uma conta na nuvem chamada "Bia"
    E tento ler direto no banco os dados de "Ana"
    Então o banco recusa por falta de permissão
    Quando tento ler direto no banco o cadastro de "Ana"
    Então o banco recusa por falta de permissão
    Quando tento gravar direto no banco um lançamento na conta de "Ana"
    Então o banco recusa por falta de permissão
    E o banco não tem o lançamento invadido na conta de "Ana"
    Quando tento me tornar administrador gravando direto no banco
    Então o banco recusa por falta de permissão
    E o menu do usuário não tem a opção Usuários

  Cenário: O administrador vê os dados das pessoas só para ler, e quem não é administrador nem vê a lista
    Dado que criei uma conta na nuvem chamada "Ana"
    E lanço "Lançamento da Ana" de "10,00" na categoria "Mercado"
    Quando saio do app pelo menu
    E que criei uma conta na nuvem chamada "Dono"
    E que esta conta foi registrada como administradora no banco
    E abro a lista de usuários pelo menu
    Então a lista de usuários mostra a conta de "Ana"
    Quando abro os dados de "Ana"
    Então vejo o lançamento "Lançamento da Ana" em modo somente leitura
