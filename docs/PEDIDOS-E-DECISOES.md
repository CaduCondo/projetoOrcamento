# Pedidos e decisões do projeto

Registro de **tudo o que o dono do projeto (Cadu) pediu**, na ordem em que surgiu, com as regras de negócio e as decisões tomadas.
Serve como memória do projeto: quem for mexer no código deve ler aqui o *porquê* de cada coisa.
Cada item pendente também vira uma *issue* no GitHub (veja [KANBAN.md](KANBAN.md)).

Legenda: ✅ feito e em produção · 🧪 feito no ambiente de teste (`dev`) · 📋 pendente (issue no GitHub)

---

## 1. Ideia original
- Um **app de controle de gastos** que substitui a planilha manual (`Orçamento 2026.xlsx`, uma aba por ano).
- **Sem conexão automática com bancos** (o dono não quer acesso a apps de banco).
- Muitas células da planilha têm um **total com uma anotação** listando os itens que formam o total
  (ex.: `7.265` = `265 celular + 2000 convênio + 5000 IA`). O app mostra **só o total** e guarda os itens dentro dele. ✅
- **Gráficos** com todas as informações possíveis (na planilha havia só 1). ✅ (16 gráficos)

## 2. Regras de negócio (valem para todo o sistema)
1. **Total = soma dos itens** da célula (categoria × mês). ✅
2. **Previsto × realizado.** Só o que está marcado como **pago/recebido** entra nos totais; o resto é *previsão*.
   O "OK" da planilha vira esse "pago/recebido". O checkbox fica **dentro da janela de itens**, não na linha da categoria. ✅
3. **Valor com `#` na planilha = já está na fatura do cartão.** É só informação: aparece (com 💳) mas **nunca soma**. ✅
4. **A pagar** é sempre mostrado **em vermelho e com sinal negativo** (`-R$ 10,00`). ✅
5. **Linhas "sobrou 20XX"** não são receita: viram o **saldo inicial** do ano. O acumulado continua do ano anterior se o saldo inicial estiver em branco. ✅
6. **Anotação que não bate com o total**: mantém o total e cria a linha `(sem detalhe / diferença)` com ⚠ para revisar. ✅
7. **Planilha antiga**: o Excel ignora números digitados como texto na soma; o app conta (exceto os com `#`). Conferido contra os totais das planilhas; diferenças restantes conhecidas: 2024 jan–abr e 2025 out (intervalos de SOMA do Excel incompletos), 2015 ago (R$ 11,58). ✅
8. **Senhas e logins que estavam nas anotações da planilha NÃO são importados.** ✅

## 3. Telas e comportamento pedidos
- **Mês / Ano**: tela Mês (cartões, tabelas A receber e A pagar) e tela Ano (grade como a planilha, **primeira coluna congelada**). ✅
- **Vários anos**: seletor de ano no topo; botão "＋ ano"; título sem ano fixo. ✅
- **Passar o mouse** no valor mostra os itens; no nome da categoria mostra os últimos 6 meses. ✅
- **Arrastar** as linhas da tela Mês para reordenar. ✅
- **Máscara de moeda** em todo campo de valor (`1.234,56`, sem "R$" nos campos). ✅
- **Categoria obrigatória** e em branco no início; valor obrigatório. ✅
- **Patrimônio** (saldos por banco, dívidas, bens). ✅
- **Backup/restaurar**, **exportar CSV**, **importar anos** (JSON). ✅
- **Categorias**: lista enorme era feia → busca digitando (mostra as mais usadas), criar na hora, atalhos, gerenciador em Ajustes
  com filtros, renomear, dia, **mesclar** duplicadas e excluir. ✅
- **Esqueci a senha**. ✅

## 4. Plataforma
- **Login** por e-mail e senha; dados **na nuvem** (Firebase Auth + Firestore); rodando de graça no GitHub Pages. ✅
- **Dois ambientes**: PRODUÇÃO (`main`) e TESTE (`dev`), cada um com **seu próprio banco**; o teste tem faixa laranja. ✅
- Publicação automática só se **todos os testes passarem**. ✅
- Código **dividido em arquivos pequenos** por assunto, reaproveitando trechos, em vez de um arquivo gigante. ✅
- **Documentar tudo** o que foi pedido e como fazer cada procedimento (este arquivo e o [PASSO-A-PASSO.md](PASSO-A-PASSO.md)). 🧪

## 5. Pedidos novos — detalhes, decisões e situação

| Pedido | Situação |
|---|---|
| 5.1 Perfil (cadastro) | 🧪 no ambiente de teste |
| 5.2 Nuvem × arquivo local + CSV | 🧪 no ambiente de teste |
| 5.3 Administrador (somente leitura) | 🧪 no teste — precisa das regras novas publicadas e do documento `admins` (PASSO-A-PASSO §10) |
| 5.4 Categorias pela tela Mês | 🧪 no ambiente de teste |
| 5.5 Celular responsivo | 🧪 menu fixo embaixo, topo enxuto, botões maiores; PWA e app de loja 📋 |
| 5.6 Kanban e testes | ✅ kanban por etiquetas · 📋 Cypress/BDD com relatório |
| 5.7 Extrato do banco / app nas lojas | respondido; 📋 importar OFX/CSV |

### 5.1 Perfil (cadastro do usuário)
- Acessível clicando no **e-mail** (ou na **foto**, quando houver) no topo da página.
- Campos: **nome, data de nascimento, profissão, foto de perfil, trocar senha**.
- A foto aparece no lugar do e-mail no topo.
- Quem só criou usuário e senha deve ser **lembrado algumas vezes** (não para sempre) de completar o cadastro.
- Deve ter a **escolha de onde salvar os dados** (5.2) com explicação de cada opção (tooltips).

### 5.2 Onde salvar os dados: nuvem ou arquivo local
- **Nuvem (banco de dados):** dados disponíveis em qualquer aparelho onde a pessoa entrar.
- **Arquivo local:** os dados ficam em um arquivo no aparelho; em outro aparelho a pessoa só os vê levando o arquivo e importando.
- **Formato do arquivo:** CSV que abre no Excel, parecido com a tela **Ano** (o formato da planilha original).
- Ao entrar (modo local) a **primeira coisa** é procurar o arquivo e carregar; o local escolhido deve ser lembrado.
- Se o arquivo não for encontrado (ex.: salvou no celular e abriu no computador, ou o contrário): **aviso simples** explicando como
  carregar manualmente em **Ajustes → carregar arquivo**.
- **Tudo precisa funcionar no celular** (ver 5.5).

> **Decisão importante — NÃO será feito:** guardar no banco, *às escondidas*, uma cópia dos dados de quem escolheu "só arquivo local".
> Motivo: a tela diria que os dados não ficam na nuvem, e ficariam — isso engana o usuário e viola a **LGPD** (transparência e consentimento).
> **O que será feito:** quem escolhe local tem os dados **somente** no aparelho; no banco fica apenas o **cadastro** (e-mail, nome, escolha),
> e isso é dito com clareza na tela. Alternativas honestas possíveis: backup na nuvem *opcional*, ativado pelo próprio usuário, ou criptografado
> de modo que nem o administrador consiga ler.

### 5.3 Administrador (somente o dono)
- Só o usuário do dono vê os dados de outros: escolhe num **combo** (mostra o **nome**, ou o e-mail se não houver nome) e vê tudo em **modo somente leitura**
  (bloqueado para alteração, para não mudar nada sem querer).
- Ao lado de cada nome, um ícone de **olho**: **aberto** = a pessoa guarda os dados na nuvem (visíveis); **riscado** = guarda só localmente (dados **não** existem no banco para o administrador ver).
- **Como foi feito:** botão **👥 Usuários** (só aparece para administradores) → lista com busca; clicar abre os dados da pessoa em **modo somente leitura**
  (faixa azul no topo e todos os campos bloqueados). Travas: as regras do banco só deixam o administrador *ler*; `save()` e as gravações ficam desligados; antes de entrar,
  o que estava pendente do próprio administrador é gravado; nada da pessoa é misturado com os dados do administrador.
- **Transparência:** a explicação mostrada ao usuário que escolhe a nuvem deve dizer que os dados ficam protegidos por regras de segurança e que **somente ele e o administrador do sistema (apenas leitura, para suporte)** podem vê-los — não é verdade dizer "ninguém tem acesso".

### 5.4 Categorias: incluir pela tela Mês
- **Tirar** a barra de lançamento rápido do topo da tela Mês.
- Em cada bloco (**A receber** e **A pagar**), um botão **"＋ Categoria"** no canto inferior esquerdo.
- A janela de inclusão tem **nome**, **dia (1 a 31)** — com dica: lembrete do dia do vencimento (a pagar) ou da entrada do dinheiro (a receber) — e **onde vale** (escolher uma opção):
  **só este mês · o ano todo · deste mês em diante**. **Sem campo de valor**: o valor é lançado depois, no botão **Lançar** da linha.
- Em **Ajustes** cada categoria mostra a opção escolhida (além de nome, dia, nº de lançamentos, Mesclar e excluir) e pode ser **editada**.
- **Regra de ouro das alterações:** qualquer mudança (nome, dia, abrangência) vale **do mês atual em diante**; o passado **não muda**.
  Ex.: em abril, "Salário · ano todo · dia 5" vira "Salário Empresa X · deste mês em diante · dia 10": jan–mar continuam "Salário, dia 5".
- "Abrangência" é só controle de **apresentação** da categoria na tabela; não é dado que apareça nas planilhas.
- **Como foi feito:** cada categoria pode ter uma *vigência* (de que mês até que mês aparece). Alterar nome, dia ou abrangência a partir do mês escolhido
  **encerra a versão antiga no mês anterior** e cria uma nova versão daquele mês em diante (os lançamentos dali em diante vão para a nova). Isso preserva o passado
  e permite *Desfazer*. Há também "Em todos os meses (corrigir um erro)" para ajustar, por exemplo, um acento no nome sem dividir o histórico.
- Categorias importadas das planilhas continuam como antes (aparecem onde têm lançamentos).

### 5.5 Celular
- O sistema inteiro deve ser **totalmente responsivo** (usável no celular).
- Pergunta: gerar app instalável para **Android e iOS** para publicar nas lojas? (resposta em [PASSO-A-PASSO.md](PASSO-A-PASSO.md#instalar-no-celular-e-lojas))

### 5.6 Gestão do trabalho e qualidade
- Gerenciar por **Kanban do GitHub**: uma *issue* para cada coisa; colunas **backlog → wip → done**. 📋
- **Testes automatizados** no estilo do outro projeto do dono: **Cypress**, cenários em **BDD**, rodando no **GitHub Actions**, com **relatório e evidências**
  (prints/vídeos) e **bugs registrados direto no Kanban** (com prioridade; ir para wip ao começar e done ao terminar). 📋

### 5.7 Perguntas do dono (respostas)
- **Conexão com banco para trazer extrato automaticamente?** Possível no futuro via *Open Finance* (agregadores como Pluggy), mas exige servidor,
  cadastro/consentimento do usuário, custo e cuidado com a LGPD. Caminho mais simples e grátis primeiro: **importar extrato OFX/CSV** baixado no banco. 📋
- **Gerar app Android/iOS?** Veja [PASSO-A-PASSO.md](PASSO-A-PASSO.md#instalar-no-celular-e-lojas).

---

### 5.8 Senha forte (issue #29)
Pedido: ao criar conta e em Meu Cadastro → Trocar senha, mostrar uma lista de regras; cada linha começa com **X vermelho** e vira **V verde** quando atendida; o botão só habilita com tudo verde. Regras: mínimo 6 caracteres; 1 letra maiúscula; 1 minúscula; 2 números; 1 caractere especial; senhas idênticas. Implementado em `src/js/27-model-password.js` (regras, fonte única) e `47-ui-password.js` (tela). A validação também roda ao enviar (não depende só do botão). Observação: regra no navegador pode ser contornada por quem mexe no código; para blindar de verdade, ativar a política de senha no Firebase Authentication.

### 5.9 Página Categorias e "incluir no mês" (issue #30)
Pedido do dono: (1) meses futuros começam **sem nenhuma categoria**, só as criadas para o **ano inteiro**; (2) ao incluir uma categoria num mês, digitar e ver **sugestões que filtram** (o texto pode estar em qualquer parte do nome, ex.: "sal" acha "Salário Caixa", "Resalte de lucros"); (3) acabar com o erro "Já existe uma categoria com esse nome neste período" (a categoria "Investimento" existia mas não aparecia em setembro); (4) uma **página separada** para CRIAR, EDITAR, EXCLUIR categorias; na tela do mês só se **USA** uma categoria que já existe.
Como ficou:
- Nova aba **Categorias** (criar, editar, mesclar, excluir). A lista saiu de Ajustes. Ao criar: "só onde eu incluir no mês" (padrão) ou "o ano todo".
- Tela Mês: o botão **＋ Categoria** abre uma lista que filtra enquanto digita (sem ligar para acento ou maiúscula) e **inclui a categoria já existente naquele mês**. Não cria nada nem dá "já existe"; a mesma categoria pode ser incluída em quantos meses quiser. Se não existir, a janela oferece ir criar na página Categorias.
- Meses **futuros** (depois do mês atual) só mostram: categoria com lançamento, incluída naquele mês, ou criada com fim definido (ex.: o ano todo). "Deste mês em diante" vale até o mês atual.
- Dados: `extra` (meses incluídos) e `lib` (só sob demanda) em cada categoria; entram no CSV (colunas MesesIncluidos e SoSobDemanda) e na nuvem.

### 5.10 Tabelas da tela Mês com cabeçalho e total embaixo (issue #31)
Pedido: A receber e A pagar com cabeçalho (Categoria · Dia · Valor); clicar no título ordena (alfabética, por dia, por valor) para acompanhar o mês dia a dia, com as categorias sem dia no fim; o total fica embaixo da tabela. Clique 1 = crescente, 2 = decrescente, 3 = volta à ordem manual (arrastar ⋮⋮ só funciona na ordem manual). Cada bloco tem a sua ordem.

### 5.11 Receitas/Despesas, ordem inicial e aviso de vencimento (issue #32)
- Os blocos da tela Mês passaram a se chamar **RECEITAS** e **DESPESAS**, com o título levemente destacado (faixa suave e barra colorida na lateral).
- Ao abrir a tela, as duas tabelas já vêm ordenadas pela coluna **Dia** (sem dia no fim).
- **Aviso suave de vencimento:** na tabela de DESPESAS, a linha ganha um fundo âmbar claro e a etiqueta "⏰ vence hoje" quando (a) a categoria tem dia cadastrado igual ao dia de hoje, no mês atual, e (b) tem pelo menos 1 item ainda **previsto**. Se todos os itens já estão confirmados (pago/agendado) ou são só de cartão (informativos), não avisa. Vale só para despesas.

### 5.12 Ordenação na página Categorias e coluna Dia na tela Ano (issue #33)
- **Categorias:** a lista tem cabeçalho clicável (Nome, Dia, Onde aparece, Último uso, Lançamentos). 1º clique crescente, 2º decrescente, 3º volta ao padrão (último uso). Sem dia sempre no fim.
- **Ano:** nova coluna **Dia** à esquerda da Categoria (as duas ficam fixas ao rolar). Cada grupo abre ordenado por dia (sem dia embaixo); os títulos **Dia**, **RECEITAS/DESPESAS** (nome) e **Total** na linha do grupo ordenam. Dá para **arrastar** uma linha dentro do seu grupo: a ordem que está na tela vira a ordem manual (isso vale também na tela Mês). Não dá para soltar uma despesa em Receitas.
- Os grupos passaram de A RECEBER/A PAGAR para **RECEITAS/DESPESAS** em todo o app (telas, CSV e janelas); totais: "Total de receitas/despesas".

### 5.13 Valor "no cartão" visível e cabeçalho alinhado (issue #34)
- Tela Mês: itens marcados como "já está na fatura do cartão" 💳 passaram a aparecer na linha (ex.: "💳 -R$ 596,99 no cartão · não soma"), em texto menor e itálico, deixando claro que **não entram no total** (já estão dentro do valor do cartão de crédito). O total da categoria e das tabelas não muda.
- Categorias: o cabeçalho estava deslocado porque as colunas variavam de linha para linha; agora todas têm larguras fixas e o cabeçalho fica alinhado com os dados.

### 5.14 Tirar uma categoria só de um mês (issue #35)
Pedido: um jeito fácil de tirar a categoria X de um mês, mas difícil de acontecer sem querer. Solução: dentro da janela de itens da linha há o botão **Tirar do mês** (não há botão solto na linha). Passos: abrir a linha → "Tirar do mês" → confirmar → aparece **Desfazer** por alguns segundos. Só funciona quando a categoria **não tem lançamentos** naquele mês (com itens o botão fica travado e explica; os itens precisam ser apagados antes). Só aquele mês muda: a categoria e os outros meses continuam como estão. Para voltar, use "＋ Categoria" no mês. Dados: `hide` (meses retirados) em cada categoria; vai ao CSV (MesesRetirados) e à nuvem.

### 5.16 Importar fatura do cartão e extrato da conta (PDF do Itaú) (issue #36)
Pedido do dono, com PDFs reais do Itaú (fatura e extrato). Decisões:
- Botão **📥 Importar PDF** na tela Mês. Escolhe-se o **arquivo**, o **mês** e o **ano**. O PDF é lido **dentro do navegador** (leitor pdf.js embutido, só carrega quando se usa); nada é enviado para fora.
- **Fatura do cartão:** entram só “Lançamentos: compras e saques” e “Lançamentos internacionais” (+ o repasse de IOF, que faz parte do total). Ficam de fora pagamentos, compras parceladas das próximas faturas, encargos e simulações. O app confere se a soma bate com o total da fatura. Vão para a categoria **CC Itaú** (reaproveita a que já existe, sem ligar para acento) como **previstos**; a pessoa marca o que foi pago.
- **Extrato da conta:** o extrato vem com dias de outros meses; só entra o mês escolhido. Vai para a categoria **Movimentação CC Itaú** (criada no mês se não existir), como **realizado**. A linha de pagamento da fatura vem **desmarcada** (o cartão já está em CC Itaú; marcar contaria em dobro).
- Importar o mesmo arquivo de novo **não duplica** (cada item tem uma chave).
- **Itens do cartão** (botões na janela de itens da categoria): **→ Virar categoria** (categoria só informativa do mês, igual à Vivo: aparece com 💳, não soma) ou **→ Lançar em categoria** (lançamento com 💳 numa categoria existente). O item **continua no cartão** e continua somando lá; a cópia é só informação. A cópia fica **travada**: o 💳 não pode ser desmarcado e o valor não é editável (senão contaria duas vezes). “Desfazer” no item do cartão (ou apagar a cópia) remove a ligação; apagar o item do cartão pergunta se apaga a cópia também.
- **Itens do extrato:** os mesmos dois botões, mas aqui o item **sai** da Movimentação e **soma** no destino (o saldo do mês não muda). O sinal se ajusta ao tipo do destino; virar categoria nova: entrada vira receita, saída vira despesa.
- Dados: cada item importado tem `imp` (chave); cópias do cartão têm `ref`+`lock`+`info`; itens movidos do extrato guardam `moved` (para não voltarem se importar de novo).

## 6. Princípios que combinamos
- **Privacidade primeiro:** planilhas, backups e dados pessoais **nunca** vão para o GitHub (repositório público).
- **Honestidade com o usuário:** o que a tela promete é o que o sistema faz.
- **Testar antes de publicar:** tudo vai primeiro para `dev`; só vai para produção com aprovação do dono.
- **Linguagem simples** com o dono (não é da área de TI): passos clicáveis, um por vez.
