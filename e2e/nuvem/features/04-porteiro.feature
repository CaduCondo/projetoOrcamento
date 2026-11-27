# language: pt
Funcionalidade: Endereço do porteiro lembrado em todos os aparelhos
  Para não digitar o endereço de novo no celular
  O endereço fica guardado na nuvem da minha conta e aparece sozinho em outro aparelho

  Cenário: Informei o endereço no computador e ele já vem preenchido no aparelho novo
    Dado que criei uma conta na nuvem
    E que esta conta foi registrada como administradora no banco
    Quando informo o endereço do porteiro "https://orcamento-banco.exemplo.workers.dev" em Buscar do banco
    Então o banco guarda o endereço do porteiro "https://orcamento-banco.exemplo.workers.dev" na nuvem desta conta
    Quando entro com a mesma conta num aparelho novo
    E abro Buscar do banco no aparelho novo
    Então o campo do endereço do porteiro já vem preenchido com "https://orcamento-banco.exemplo.workers.dev"
