# Regras de negócio do Meu Orçamento (versão 1)

O que o sistema **deve fazer** e por quê, em português simples. É a fonte para os cenários BDD (`e2e/features`) e para os testes de lógica (`tests/`).
Regra nova ou alterada **entra aqui no mesmo PR** que muda o código. O histórico de cada pedido e a decisão tomada ficam em [PEDIDOS-E-DECISOES.md](PEDIDOS-E-DECISOES.md) (as seções 5.x são citadas abaixo).

Convenção: **RN-xx** = regra de negócio (para citar em issues e testes).

---

## 1. Dinheiro, lançamentos e totais
- **RN-01 Total = soma dos itens.** Cada célula (categoria × mês) guarda itens; o total mostrado é a soma deles.
- **RN-02 Previsto × realizado.** Só o item marcado como **pago/recebido** entra nos totais "realizado". Sem a marca, é **previsto**. A marca fica dentro da janela de itens.
- **RN-03 Informativo (💳).** Item "já está no cartão" aparece, mas **nunca soma** em nenhum total.
- **RN-04 Despesa em vermelho e com sinal negativo** (`-R$ 10,00`).
- **RN-05 Saldo do mês** = recebido − pago (realizado); "previsto" usa todos os itens.
- **RN-06 Saldo inicial do ano** vem do saldo inicial informado; se estiver em branco, o acumulado continua do ano anterior.
- **RN-07 Pode gastar por dia** (só no mês de hoje) = (receitas − despesas **previstas** deste mês) ÷ dias que faltam, **sem contar** o que está guardado/investido; se for zero ou negativo, mostra "sem folga". (§5.21)
- **RN-08 Valor digitado** usa máscara de moeda: digitam-se só números (`4550` vira `45,50`).
- **RN-09 Planilha antiga:** números digitados como texto contam no total (o Excel os ignora), **exceto** os marcados com `#`, que são informativos (RN-03). Notas que não batem com o total criam a linha "(sem detalhe / diferença)" com ⚠ para revisar.

## 2. Categorias
- **RN-10 Categoria é obrigatória** num lançamento; valor é obrigatório.
- **RN-11 Fixa × sob demanda.** "Fixa — aparece todo mês" (inclusive meses futuros). Desligada: só aparece quando incluída no mês ou quando tem lançamento. Meses futuros começam **sem** categoria, exceto as fixas. (§5.9, §5.18)
- **RN-12 Mudar nome ou dia vale do mês atual em diante;** o passado não muda. Cria uma **versão** nova (a antiga termina no mês anterior). Se não há nada antes do mês atual, muda direto. Mudar **só o dia** edita no lugar, sem versão. "Em todos os meses" corrige erro de digitação sem dividir o histórico.
- **RN-13 Nomes únicos por tipo:** nome vazio ou já usado por outra categoria do mesmo tipo (Receita/Despesa) é recusado, com aviso. O mesmo nome pode existir em Receita e em Despesa.
- **RN-14 Mesclar** junta categorias duplicadas (os lançamentos vão para a escolhida). **Virar lançamento** transforma cada valor de uma categoria em lançamento de outra, **no mesmo mês**, com o nome antigo na descrição; a categoria antiga some. Em ambos, **o total geral não muda** (verificável com `tools/planilha/comparar-backup.py`).
- **RN-15 Tirar uma categoria só de um mês** pede confirmação e tem desfazer. Apagar um item pede confirmação.
- **RN-16 Parcelas do cartão** ("LOJA 03/08"): projetam as parcelas que faltam usando sempre a parcela **mais recente** conhecida (não conta a mesma compra duas vezes). (§5.22)
- **RN-17 Assinaturas/recorrentes:** despesa que aparece em 3+ dos últimos 6 meses com valor parecido (variação até 30%), ignorando parcelas.

## 3. Importação (arquivo ou banco)
- **RN-20 Importar o mesmo arquivo de novo não duplica** (cada item tem uma chave).
- **RN-21 Fatura do cartão** entra como **previsto** na categoria "CC Itaú" (ou equivalente) e o app **confere a soma** com o total da fatura; pagamentos, encargos e parcelas de faturas futuras ficam de fora. (§5.16)
- **RN-22 Extrato da conta** entra como **realizado**, só o mês escolhido, em **Receitas** (entradas) e **Despesas** (saídas) da "Movimentação"; rendimentos do mês são somados num único lançamento; a linha de pagamento da fatura vem desmarcada (evita contar em dobro). (§5.16)
- **RN-23 Automações:** texto que se repete leva à categoria certa na importação; a regra mais específica ganha; entrada e saída não se misturam. O que não casa fica "sem categoria".
- **RN-24 Arquivo que não consegue ler:** mensagem amigável; o registro para o administrador guarda só tipo de arquivo, banco e motivo, **nunca o conteúdo**. (§5.19)
- **RN-25 Buscar do banco** é só do dono (o porteiro confere o login e o e-mail). O endereço do porteiro **não é segredo** e fica no aparelho e na nuvem do próprio usuário; só `https://` (§5.28).
- **RN-26 Segredos de banco** (chave da Pluggy) **nunca** ficam no site nem no repositório; só no Cloudflare.

## 4. Privacidade e acesso
- **RN-30 Cada pessoa só vê os próprios dados.** As regras do banco impõem isso (não só a tela).
- **RN-31 Onde guardar:** *nuvem* (qualquer aparelho) ou *só neste aparelho* (nada dos lançamentos vai ao banco; no banco fica só o cadastro). **Proibido** guardar às escondidas cópia de quem escolheu só no aparelho (transparência e LGPD). (§5.2)
- **RN-32 Administrador** (só o dono, criado à mão no console) **só lê**: vê os dados de quem guarda na nuvem em modo somente leitura; quem guarda só no aparelho aparece com o olho riscado e não tem dados no banco. A tela diz isso com honestidade. (§5.3)
- **RN-33 Trocar de modo** (nuvem ↔ aparelho) pede confirmação e explica o que vai acontecer; ao ir para o aparelho, pergunta se apaga os dados da nuvem.
- **RN-34 Senha forte** no cadastro e na troca de senha: mínimo 6 caracteres, 1 maiúscula, 1 minúscula, 2 números, 1 caractere especial, e as duas senhas iguais.
- **RN-35 Cadastro (perfil):** escolher ou tirar a foto **não** apaga o que já foi digitado e ainda não salvo (nome, nascimento, profissão).
- **RN-35b Cadastro (perfil):** nome, nascimento, profissão, foto (reduzida antes de salvar), troca de senha; quem só criou usuário e senha é lembrado **até 3 vezes**.
- **RN-36 Dados pessoais fora do repositório:** planilhas, backups e dados reais **nunca** vão para o GitHub (público); exemplos e testes usam dados inventados.

## 5. Telas e uso
- **RN-40 Celular em primeiro lugar:** nenhuma tela passa da largura do celular (375 px) e todo botão visível tem pelo menos 40 px de altura. (§5.25)
- **RN-41 Menu do usuário** (foto e nome): Meu cadastro, Usuários (só administrador), Ajuda desta tela e Sair; fecha ao tocar fora, com Esc ou ao escolher. (§5.27)
- **RN-42 Ambiente de teste** mostra faixa laranja e usa banco separado do de produção.
- **RN-43 Zerar meus dados** existe só no ambiente de teste/local, pede para digitar APAGAR, e **nunca** é feito pelo assistente: o dono clica.
- **RN-44 Honestidade com o usuário:** o que a tela promete é o que o sistema faz.
- **RN-45 Texto de fora nunca vira código:** nome, descrição, perfil, backup importado e o cadastro de outra pessoa aparecem sempre como **texto**. Foto de perfil só pode ser imagem em base64; ícone só da lista; cor só hexadecimal; identificadores de categoria só com letras, números, `_` e `-` (senão o app troca por um novo). (§5.31)

---

## Como usar este documento
1. Ao escrever uma issue, citar as **RN-xx** envolvidas e escrever os cenários BDD a partir delas.
2. Ao mudar uma regra: atualizar aqui, os testes e `PEDIDOS-E-DECISOES.md`.
3. Regra sem teste automático é dívida: abrir issue `qualidade`.
