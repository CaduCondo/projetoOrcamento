# language: pt
Funcionalidade: Texto digitado nunca vira código
  Para ninguém conseguir invadir o sistema escrevendo código num campo
  Tudo o que eu (ou um arquivo importado) escrevo aparece como texto e nunca é executado

  Esquema do Cenário: O texto <texto> digitado no nome da categoria e na descrição do lançamento aparece como texto e não roda
    Dado que tenho uma conta nova e vazia
    E que criei a categoria de despesa "<texto>"
    E que lancei "<texto>" de "10,00" na categoria "<texto>" no mês de "Outubro"
    Então o texto "<texto>" aparece escrito na lista de categorias e na tela do mês
    E nenhum código escrito nos campos foi executado nem virou elemento da página
    Quando recarrego a página
    Então o texto "<texto>" aparece escrito na lista de categorias e na tela do mês
    E nenhum código escrito nos campos foi executado nem virou elemento da página

    Exemplos:
      | texto                                  |
      | <img src=x onerror=window.__pwn=1>     |
      | <svg onload=window.__pwn=2>            |
      | <script>window.__pwn=3</script>        |
      | </dialog><b id=pwn4>negrito</b>        |

  Cenário: O leitor de PDF abre o arquivo sem executar código dinâmico (CVE-2024-4367) e continua lendo o texto
    Dado que tenho uma conta nova e vazia
    Quando o leitor de PDF lê um PDF simples com o texto "Fatura de teste 123"
    Então o texto lido do PDF é "Fatura de teste 123"
    E o leitor de PDF foi aberto com a execução de código dinâmico desligada
