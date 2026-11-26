# language: pt
Funcionalidade: Uso no celular
  Para usar o app inteiro no celular sem arrastar a tela para o lado
  Todas as telas cabem na largura de um celular e os botões são fáceis de tocar

  Esquema do Cenário: A tela <aba> cabe na largura de um celular
    Dado que tenho uma conta nova e vazia
    Quando abro o app com a largura de um celular
    Então a tela "<aba>" não tem rolagem para o lado

    Exemplos:
      | aba         |
      | mês         |
      | ano         |
      | gráficos    |
      | patrimônio  |
      | categorias  |
      | ajustes     |

  Esquema do Cenário: Na tela <aba> os botões são fáceis de tocar
    Dado que tenho uma conta nova e vazia
    Quando abro o app com a largura de um celular
    Então na tela "<aba>" os botões visíveis têm pelo menos 40 pixels de altura

    Exemplos:
      | aba         |
      | mês         |
      | ano         |
      | gráficos    |
      | patrimônio  |
      | categorias  |
      | ajustes     |
