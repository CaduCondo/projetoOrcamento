# language: pt
Funcionalidade: Menu da foto e do nome
  Para o topo ficar limpo no celular e no computador
  Meu cadastro, Ajuda e Sair ficam num menu que abre ao tocar na foto ou no nome

  Cenário: O menu começa fechado e abre com Meu cadastro, Ajuda e Sair
    Dado que tenho uma conta nova e vazia
    Então o menu do usuário está fechado e "Ajuda desta tela" e "Sair" não aparecem soltos no topo
    Quando abro o menu do usuário
    Então o menu mostra as opções "Meu cadastro", "Ajuda desta tela" e "Sair" e não mostra "Usuários"

  Cenário: O menu fecha com Esc, ao tocar fora e ao tocar de novo na foto
    Dado que tenho uma conta nova e vazia
    Quando abro o menu do usuário
    E aperto a tecla Esc
    Então o menu do usuário está fechado
    Quando abro o menu do usuário
    E toco fora do menu
    Então o menu do usuário está fechado
    Quando abro o menu do usuário
    E toco de novo na foto e no nome
    Então o menu do usuário está fechado

  Cenário: Escolher Meu cadastro abre o cadastro e fecha o menu
    Dado que tenho uma conta nova e vazia
    Quando abro o menu do usuário
    E escolho "Meu cadastro" no menu
    Então vejo a tela de cadastro
    E o menu do usuário está fechado

  Cenário: Escolher Ajuda desta tela mostra a explicação da tela
    Dado que tenho uma conta nova e vazia
    Quando abro o menu do usuário
    E escolho "Ajuda desta tela" no menu
    Então vejo a explicação guiada da tela
    E o menu do usuário está fechado

  Cenário: Escolher Sair volta para a tela de entrada
    Dado que tenho uma conta nova e vazia
    Quando abro o menu do usuário
    E escolho "Sair" no menu
    Então vejo a tela de entrada do app

  Esquema do Cenário: Com <largura> pixels de largura o topo cabe numa linha e o menu abre inteiro, com opções fáceis de tocar
    Dado que tenho uma conta nova e vazia
    Quando a janela do navegador tem <largura> pixels de largura
    Então o ano, o botão "＋ ano" e a foto estão na mesma linha do topo
    E o nome ao lado da foto aparece: <nome>
    Quando abro o menu do usuário
    Então todas as opções do menu aparecem inteiras dentro da tela com pelo menos 40 pixels de altura

    Exemplos:
      | largura | nome |
      | 1280    | sim  |
      | 800     | não  |
      | 375     | sim  |
