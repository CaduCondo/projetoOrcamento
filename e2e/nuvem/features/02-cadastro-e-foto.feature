# language: pt
Funcionalidade: Cadastro e foto de perfil na nuvem
  Para o meu cadastro ficar guardado com segurança
  A foto só pode ser imagem, mesmo que alguém tente gravar outra coisa direto no banco

  Cenário: Salvar o cadastro com foto, e a foto ficar guardada como imagem em base64
    Dado que criei uma conta na nuvem
    Quando salvo o cadastro com nome "Ana Teste" e uma foto
    Então o banco guarda a foto como imagem em base64
    E a foto continua no topo depois de recarregar

  Esquema do Cenário: O banco recusa um cadastro cuja foto é <tipo>
    Dado que criei uma conta na nuvem
    Quando tento gravar direto no banco um cadastro cuja foto é "<foto>"
    Então o banco recusa por falta de permissão

    Exemplos:
      | tipo                    | foto                                   |
      | texto com aspas e código | x' onerror='window.__pwn=1             |
      | endereço javascript      | javascript:alert(1)                    |
      | endereço de fora         | https://exemplo.com/foto.png           |
      | imagem svg               | data:image/svg+xml;base64,PHN2Zz4=     |
