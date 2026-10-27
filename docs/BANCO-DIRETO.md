# Buscar do banco (Open Finance) — passo a passo do dono

**O que é:** um botão **🏦 Buscar do banco** em Ajustes (só você vê) que traz extrato da conta e fatura do cartão direto do Itaú, sem baixar arquivo.

**Como funciona (em uma frase):** o Itaú compartilha seus dados com o **Meu Pluggy** (você autorizou no app do Itaú, somente leitura) → o app pergunta ao **"porteiro"** (um pequeno programa no Cloudflare, grátis, que guarda a chave secreta e só atende você logado) → o porteiro pergunta à Pluggy → os lançamentos caem na tela de conferência do app.

**Custo:** R$ 0. **Não cadastre cartão de crédito** em nenhum dos serviços. Se algum site pedir cartão ou oferecer “upgrade/PRO”, **não aceite** e me avise.

Faça **uma etapa por vez**. Se a tela for diferente, tire um print e mande (sem mostrar a Client Secret!).

---

## ETAPA 0 — Antes de tudo (se ainda não fez)
- [ ] Verificação em 2 etapas no **Cloudflare**: clique no ícone de pessoa (canto superior direito) → **My Profile** → **Authentication** → **Two-Factor Authentication** → siga o assistente (app autenticador) e **anote os códigos de recuperação em papel**.
- [ ] Verificação em 2 etapas no Google e no GitHub (Etapas 2 e 3 de `docs/SEGURANCA.md`).

## ETAPA 1 — Trocar a Client Secret da Pluggy (3 min)
A que você usou nos testes deve ser descartada.
1. Abra https://dashboard.pluggy.ai → **Aplicações**.
2. Na sua aplicação, ao lado de **Client Secret**, clique no ícone de **chave** e gere uma nova.
3. Copie a nova Secret e deixe **numa janela do bloco de notas** (não salve em arquivo, não mande para ninguém). Você vai colá-la só no Cloudflare, no passo 3.

Você também precisa de **duas informações** (não são secretas, mas guarde juntas):
- **Client ID** (aparece ao lado da Secret).
- **Item ID**: abra a conexão do Meu Pluggy dentro da aplicação (▶ Iniciar Demo → **MeuPluggy**) e copie o código que aparece em cima do nome (também aparece na barra de endereço depois de `itemId=`).

## ETAPA 2 — Criar o porteiro no Cloudflare (5 min)
1. Abra https://dash.cloudflare.com e entre.
2. No menu da esquerda: **Compute** (ou **Workers & Pages**) → **Workers & Pages**.
3. Clique em **Create** (ou **Create application**) → **Create Worker** (ou *Start with Hello World*).
4. Em **Name**, escreva `orcamento-banco` → clique em **Deploy**.
   (O Cloudflare cria um endereço como `https://orcamento-banco.SEUNOME.workers.dev`. Anote-o: é o **endereço do porteiro**.)
5. Depois do deploy, clique em **Edit code**.
6. No editor que abrir: clique dentro do código, **Ctrl+A** (seleciona tudo) e **apague**.
7. No VS Code, abra o arquivo `tools/pluggy-worker/worker.js`, **Ctrl+A**, **Ctrl+C**.
8. Volte ao editor do Cloudflare e **Ctrl+V** (cola).
9. Clique em **Deploy** (canto superior direito do editor). Aparece uma confirmação.

## ETAPA 3 — Guardar as chaves no cofre do Cloudflare (5 min)
1. Volte à página do Worker `orcamento-banco` → aba **Settings**.
2. Procure **Variables and Secrets** → clique em **Add**.
3. Crie **uma por uma** (em **Type**, escolha **Secret** para as três primeiras e **Text** para as duas últimas):

| Nome (exatamente assim) | Tipo | Valor |
|---|---|---|
| `PLUGGY_CLIENT_ID` | Secret | o Client ID |
| `PLUGGY_CLIENT_SECRET` | Secret | a **nova** Client Secret |
| `PLUGGY_ITEM_IDS` | Secret | o Item ID |
| `ALLOWED_EMAILS` | Text | o e-mail com que você entra no app (o administrador) |
| `PROJECT_IDS` | Text | `gerenciarorcamento,gerenciarorcamento-dev` |

4. Clique em **Deploy** (ou **Save and deploy**) ao final.
5. Esvazie o bloco de notas onde estava a Secret.

## ETAPA 4 — Ligar o app ao porteiro (2 min)
1. Entre no app (o ambiente de teste `/dev/` primeiro) com a sua conta de administrador.
2. **Ajustes** → quadro **🏦 Buscar do banco** → botão **🏦 Buscar do banco**.
3. Em **Endereço do porteiro**, cole o endereço da Etapa 2 (começa com `https://`).
4. Clique em **Conectar e listar contas**. Devem aparecer a conta corrente e os cartões.
5. Escolha a conta (e a fatura, se for cartão) → **Ver lançamentos para conferir** → confira a soma com o total da fatura → **Importar**.

## Se der erro
- **“Não consegui falar com o porteiro”**: endereço errado ou sem internet. Confira o endereço (sem espaços, com `https://`).
- **“Não autorizado”**: o e-mail do login do app tem que ser exatamente o de `ALLOWED_EMAILS`, e o projeto precisa estar em `PROJECT_IDS`.
- **“O porteiro ainda não foi configurado”**: falta algum segredo da Etapa 3 (confira os nomes, letra por letra).
- **“A Pluggy recusou o pedido (código 401)”**: Client ID ou Secret errados — gere uma Secret nova e atualize no Cloudflare.
- **Extrato da conta vazio**: abra https://meu.pluggy.ai → **Conexões** → clique em **Atualizar** no Itaú, espere alguns minutos e tente de novo.
- **Consentimento do Open Finance vence** (geralmente em 12 meses): se parar de funcionar um dia, reautorize no Meu Pluggy.

## O que o porteiro NÃO faz
- Não guarda extratos nem lançamentos (só repassa).
- Não aceita ninguém além do e-mail do dono, nem outro endereço de site (só `caducondo.github.io`, e `localhost` para testes).
- Não movimenta dinheiro: a autorização do Open Finance é **somente leitura**.

## Atenção sobre duplicados
Se você importar a **mesma fatura** por PDF e também direto do banco, as descrições podem vir com textos um pouco diferentes e os itens duplicarem. Escolha **um** caminho por fatura.
