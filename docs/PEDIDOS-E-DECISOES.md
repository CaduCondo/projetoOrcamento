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
| 5.5 Celular responsivo | ✅ menu fixo embaixo, topo enxuto, botões ≥ 40 px, testes automáticos em largura de celular; PWA ✅; falta só conferir num celular de verdade (#11); app de loja 📋 |
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
- **Extrato da conta:** o extrato vem com dias de outros meses; só entra o mês escolhido, como **realizado**. Como o extrato tem entradas e saídas, existem **duas** categorias **Movimentação CC Itaú** (criadas no mês se não existirem): uma em **RECEITAS** (entradas) e outra em **DESPESAS** (saídas); cada lançamento vai para o seu lado. Os vários **"REND PAGO APLIC AUT MAIS"** (rendimento do saldo) do mês são **somados num único lançamento** de receita; se importar de novo depois e chegarem mais rendimentos, a soma é **atualizada** (sem duplicar). A linha de pagamento da fatura vem **desmarcada** (o cartão já está em CC Itaú; marcar contaria em dobro).
- Importar o mesmo arquivo de novo **não duplica** (cada item tem uma chave).
- **Itens do cartão** (botões na janela de itens da categoria): **→ Virar categoria** (categoria só informativa do mês, igual à Vivo: aparece com 💳, não soma) ou **→ Lançar em categoria** (lançamento com 💳 numa categoria existente). O item **continua no cartão** e continua somando lá; a cópia é só informação. A cópia fica **travada**: o 💳 não pode ser desmarcado e o valor não é editável (senão contaria duas vezes). “Desfazer” no item do cartão (ou apagar a cópia) remove a ligação; apagar o item do cartão pergunta se apaga a cópia também.
- **Itens do extrato:** os mesmos dois botões, mas aqui o item **sai** da Movimentação e **soma** no destino (o saldo do mês não muda). O sinal se ajusta ao tipo do destino (uma entrada levada para uma despesa vira valor negativo lá, como estorno); virar categoria nova: nasce do mesmo lado de onde veio.
- Ajustes pós-teste: a janela “Lançar em qual categoria?” ficou maior e com a lista de categorias aberta embaixo do campo (antes ficava cortada). Rendimentos “avulsos” de uma importação antiga (um item por linha) são trocados pela soma do mês ao importar de novo, para não contar em dobro.
- **PDF com senha:** o app pergunta a senha (campo mascarado; pergunta de novo se errar; cancelar desiste). A senha só abre o arquivo: não é guardada nem exibida depois.
- Dados: cada item importado tem `imp` (chave); cópias do cartão têm `ref`+`lock`+`info`; itens movidos do extrato guardam `moved` (para não voltarem se importar de novo).

### 5.17 Visual novo "Neo" (celular em primeiro lugar) (issue #37)
Pedido: refazer o layout, moderno/futurista, continuar escuro, com o celular como prioridade. Feito em `src/css/theme.css` (vem depois de `styles.css`, só muda a aparência):
- Fundo escuro com brilhos suaves (violeta, ciano, verde), cartões de "vidro fosco", botões em degradê, números em fonte geométrica (Space Grotesk) e texto em Inter (com fonte do sistema como reserva, se estiver sem internet).
- Receitas em verde-neon e despesas em rosa-neon; o dia de cada categoria vira uma "etiqueta"; "vence hoje" ganha brilho âmbar.
- Celular: menu em pílula flutuante embaixo (6 abas), meses rolando de lado (o mês escolhido aparece no meio), **Saldo do mês em destaque no topo**, tabelas em formato de lista, janelas viram "folhas" que sobem de baixo, aviso "Salvo" no topo.
- Computador: mesmo visual, com o menu no topo.

### 5.18 Simplificações e tour de ajuda (issue #38)
- **Importar/exportar num lugar só:** um botão **📥 Importar arquivo** (Ajustes e tela Mês) que reconhece sozinho PDF do Itaú, planilha CSV ou backup .json (backup pergunta: substituir tudo ou juntar os anos). Para sair: **Baixar planilha (Excel)** e **Baixar backup**. Antes eram 6 botões espalhados.
- **Celular sem "passar o mouse":** os balões só aparecem em aparelhos com mouse. O histórico de 6 meses da categoria agora fica dentro da janela de itens ("📈 Últimos 6 meses"), que abre com um toque.
- **Categorias mais simples:** cada categoria é nome, dia e um interruptor **"Fixa — aparece todo mês"** (inclusive meses futuros). Desligada: aparece só quando incluída no mês ou quando tem lançamento. Na página Categorias, toca-se na linha para abrir a janela (editar, mesclar, excluir); acabou a edição direto na lista e as várias opções de vigência. **Mudar nome/dia vale do mês atual em diante** (decisão do dono): os meses anteriores continuam com o nome antigo, a janela avisa antes e uma mensagem confirma depois. Se a categoria não tem nada antes do mês atual, muda direto (sem guardar "versão antiga").
- **Tour guiado:** na primeira vez em cada tela (por aparelho), um passo a passo destaca um item por vez e escurece o resto. O botão **?** no topo abre a explicação da tela atual quando quiser. Esc ou "Pular" fecham.

### 5.19 Outros bancos, registro de erros e "histórico" (issue #39)
- **Qualquer banco:** além do PDF do Itaú (leitura exata), o app lê **OFX** (padrão de quase todos os bancos, conta e cartão), **CSV/planilha** de banco (adivinha as colunas Data/Descrição/Valor — ou Crédito/Débito separados — e a pessoa confere/troca; dá para inverter sinais) e **PDF de outros bancos** em modo genérico (linhas com data + descrição + valor; a pessoa confere antes). Excel (.xlsx) pede para salvar como CSV. Valem as mesmas regras do Itaú (cartão em "CC Itaú" como previsto; extrato em Receitas/Despesas; pagamento de fatura desmarcado).
- **Quando não consegue ler:** mensagem amigável com o que fazer (OFX, CSV) e registro para o administrador **só com tipo de arquivo, banco e motivo — nunca o conteúdo**. Quem guarda na nuvem: registro automático. Quem guarda só no aparelho: só se apertar "Avisar o administrador" (o texto em Meu Cadastro explica).
- **Registro de erros (Ajustes, só o administrador vê):** erros do programa, falhas ao salvar/ler o perfil e arquivos não lidos, com quem, quando, tela e ambiente; botão "Resolvido" apaga. No banco: coleção `errors` — cada pessoa só cria em nome próprio e com campos limitados; só o administrador lê e apaga; ninguém altera (testado no emulador). **É preciso publicar as regras novas no Firebase (teste e produção).**
- Página Categorias: tirada a palavra "histórico" (categorias antigas simplesmente não mostram etiqueta).

### 5.20 Buscar do banco (Open Finance via Meu Pluggy)
- Teste real (27/10/2026) com o Itaú do dono pelo Meu Pluggy (grátis): cartão (110 lançamentos, faturas com total que bate com o PDF) e conta corrente (134 lançamentos) chegaram pela API `/v2/transactions` (filtros `dateFrom`/`dateTo`, paginação por `next`). Para o extrato aparecer, foi preciso **atualizar a conexão** no Meu Pluggy.
- **Porteiro** (`tools/pluggy-worker/worker.js`, Cloudflare Workers grátis): guarda a Client Secret fora do site, confere o token do login do Firebase (assinatura do Google, validade, projeto e **e-mail do dono**), aceita só o site do app, limita o período (400 dias) e devolve só os campos necessários (sem merchant, saldo por lançamento nem número do cartão).
- **App:** em Ajustes, painel **🏦 Buscar do banco** (só administrador). Escolhe conta (e fatura, no cartão) ou mês (conta) e cai na **mesma tela de conferência** da importação de arquivo (cartão como previsto com conferência do total da fatura; conta em Receitas/Despesas; rendimentos somados; sem duplicar).
- Custo: R$ 0 (Meu Pluggy gratuito para uso pessoal, até 5 conexões do mesmo titular; Cloudflare Workers plano grátis). Se um dia a Pluggy cobrar, o plano B é a importação de arquivo. Guia: `docs/BANCO-DIRETO.md`.

### 5.21 Lançamentos, Automações e ícone/cor (inspirado em outro app financeiro; ideias, sem copiar marca nem textos)
Pedido: aproveitar o que o outro app faz bem (categoria como etiqueta em cada lançamento, automações, ícone e cor, detalhe do lançamento) **sem complicar** o uso. Comparação honesta: o nosso é de *planejamento* (categoria do mês, previsto × realizado); o deles é de *acompanhamento*. Decidimos **juntar os dois**, sem trocar o modelo.
- **Tela Mês ganhou um alternador "Por categoria | Lançamentos"** (continuam as mesmas 6 abas e o menu de baixo). Em **Lançamentos**: todos os itens do mês numa lista por dia (total do dia, entrada +/saída −), busca, filtros Todos/Entradas/Saídas/Sem categ., aviso "⚠ N lançamentos sem categoria — resolver" e botão **＋ Lançamento** (novo lançamento rápido).
- **"Sem categoria"** = o que ainda está na Movimentação CC Itaú (extrato) ou item do cartão ainda não levado a uma categoria. Nenhum dado foi migrado: é só uma forma de ver.
- **Janela do lançamento** (toque na linha): descrição, valor, categoria (busca; cria na hora), "já pago/recebido", excluir e **"Lembrar para os próximos"** = cria a **automação** (texto que se repete → categoria). Ao salvar, o app já organiza os parecidos que estavam sem categoria.
- **Automações** (`S.autos`, guardadas junto das categorias; painel com ✕ na página Categorias): na importação (arquivo ou banco) o extrato já cai na categoria certa (realizado) e o item de cartão ganha a cópia informativa 💳 (não soma) na categoria; o que não casa fica "sem categoria". A regra mais específica ganha; entrada e saída não se misturam. Texto da regra: sem acento, data, parcela e símbolos, mínimo 3 letras.
- **Ícone e cor da categoria** (enfeite, opcionais): 30 ícones e 10 cores na janela da categoria; sem escolha, o app sugere o ícone pelo nome (ex.: Mercado 🛒). Renomear (nova versão da categoria) leva ícone e cor junto. Aparecem na tela Mês, em Categorias e nos Lançamentos.
- **Resumo do mês** (só no mês de hoje, topo da tela Mês): "Pode gastar por dia" = (receitas − despesas PREVISTAS só deste mês) ÷ dias que faltam, **sem contar o saldo acumulado/investido** (dinheiro guardado não entra; "sem folga" se ≤ 0); "Ainda a pagar"; próximos 3 vencimentos (toque abre a categoria).
- Ainda não feito: subcategorias (o resto foi feito: ver §5.22). Princípio reforçado pelo dono: **sempre facilitar o uso; não encher de informação**.

### 5.22 Parcelas, Carteira, Recorrentes, Perguntas, Tags e ajustes de uso (nov/2026)
- **Parcelas do cartão já comprometidas** (`29-model-parcelas.js`, `69-ui-parcelas.js`): lê "LOJA 03/08" nos itens que vieram da **fatura do cartão** e projeta as parcelas que faltam, usando sempre a parcela MAIS RECENTE que o app conhece (não conta a mesma compra duas vezes quando a fatura seguinte é importada). Aparece no Resumo do mês ("Parcelas do cartão já comprometidas: dez R$ …") e abre o detalhe por mês ("parcela 4 de 5"). É previsão: mantém o valor da última fatura.
- **Carteira** (`29-model-carteira.js`): dinheiro em papel = um saldo do Patrimônio marcado `carteira:true`, com histórico (30 últimos). Painel no Patrimônio (＋ Entrou dinheiro / － Gastei em dinheiro) e, ao criar lançamento novo, a chave "Paguei/Recebi em dinheiro" mexe na Carteira.
- **Assinaturas e contas recorrentes** (`29-model-recorrentes.js`, painel na página Categorias): despesas que aparecem em 3+ dos últimos 6 meses com valor parecido (variação até 30%); ignora parcelas; avisa "ainda não veio" neste mês.
- **Perguntas rápidas** (topo de Gráficos): 6 perguntas respondidas em palavras (onde gastei mais, quanto sobrou, maior gasto, média mensal, o que mais cresceu, o que já está comprometido).
- **Tags**: escrever `#palavra` na descrição; na lista de Lançamentos aparecem chips de tag para filtrar (junta categorias diferentes).
- **Buscar do banco**: depois de importar a janela volta à lista de contas (dá para importar conta e cartão na mesma sessão); a rolagem não pula ao marcar itens; o "saldo" do cartão é explicado como total devido (pode incluir parcelas futuras).
- **Apagar item (✕)** na janela de itens pede confirmação; **"Lançar em categoria"** só oferece categorias do mesmo tipo, mostra qual movimentação é e avisa quando a categoria digitada não existe.
- **Categorias**: mudar só o DIA edita no lugar (sem criar "versão"); renomear continua criando versão, mas a lista mostra UMA linha por categoria (somando o uso das versões antigas, "antes: …") e marca Receita/Despesa quando o nome se repete.
- **Zerar meus dados** (Ajustes, só em dev/local; pede para digitar APAGAR). Não existe em produção.
- Ainda não feito: **subcategorias** (mudança grande no modelo; combinar antes).

### 5.23 Testes de ponta a ponta (E2E) como trava de publicação (nov/2026)
Pedido do dono: testes funcionais E2E de cada funcionalidade, **sem falso positivo**, validando o resultado final, rodando no GitHub Actions; se der erro, **o sistema não sobe** e o erro só é "liberado" depois de entendido (defeito do app = corrigir o app).
- **Playwright + playwright-bdd**, cenários em **português (Gherkin)** em `e2e/features` (27 cenários: conta/login, categorias, tela do mês, importação OFX de conta e fatura, parcelas, lançamentos, automações, tags, carteira, recorrentes, perguntas rápidas, backup/zerar, tabela sem corte em 1280/800/390 px).
- Trava no GitHub: job `e2e` em `.github/workflows/ci-deploy.yml`; o job `publicar` só roda se `testes` **e** `e2e` passarem. Em falha, o relatório/foto/trace sobem como artefato `e2e-falha`.
- Anti-falso-positivo: data fixa, navegador novo por cenário, erro de console reprova, sem retry, recarregar a página para provar gravação, `e2e:ver` (nada pulado/esquecido) e `e2e/verificar-mutacoes.py` (estraga o app de propósito e exige que o teste reprove). Na primeira rodada essa verificação achou 3 testes fracos (saldo negativo passava; mudar só o dia passava mesmo com a "versão" antiga escondida pela lista; recorrente só era barrada por uma regra) e eles foram reforçados.
- Limite: Firebase na nuvem e Pluggy/Cloudflare não entram no E2E (serviço externo). Para o merge ficar **impossível** com E2E vermelho, ativar no GitHub: Settings → Branches → regra para `main` exigindo os checks "Testes" e "Testes de ponta a ponta (Chrome)".

### 5.24 Carga da planilha e "Virar lançamento"
- **Carga da planilha Excel** (abas 2015–2026): `tools/planilha` (veja o `LEIA-ME.md`). Converte para o arquivo que o app carrega em Ajustes → Carregar backup → **Juntar**, e `verificar-no-app.js` confere no Chrome que os totais de cada mês batem com os da planilha (288 de 288). Regras: nota até a 1ª linha em branco = confirmada, depois = prevista; "OK" = confirmado (em 2026, sem OK = previsto); texto/`#` e linhas fora do `=SUM` do TOTAL = informativo (💳, não soma); nota que não fecha = linha "(sem detalhe / diferença)" ⚠. Os arquivos gerados têm dados pessoais e ficam **fora do repositório**.
- **Virar lançamento de outra categoria** (pedido do dono): na janela da categoria, ao lado de **Mesclar**, o botão "↪ Virar lançamento de outra categoria…" abre a mesma busca; cada valor da categoria vira **um lançamento da escolhida, no mesmo mês**, com o nome antigo na descrição ("IPVA - parcela 1"); a categoria antiga some (inclusive nomes anteriores, cada mês com o nome que tinha); regras de importação passam a apontar para a nova. A janela mostra exemplos antes de confirmar. Só entre categorias do mesmo tipo. Código: `virarLancamento` em `22-model-categories.js`.
- "Ícone e cor" na janela da categoria agora fica **recolhido** (são 107 ícones e 28 cores; abertos escondiam os botões de baixo). Lista de categorias: colunas alinhadas com o título mesmo quando "Onde aparece" está vazio.

## 6. Princípios que combinamos
- **Privacidade primeiro:** planilhas, backups e dados pessoais **nunca** vão para o GitHub (repositório público).
- **Honestidade com o usuário:** o que a tela promete é o que o sistema faz.
- **Testar antes de publicar:** tudo vai primeiro para `dev`; só vai para produção com aprovação do dono.
- **Usabilidade acima de tudo:** o app tem muita informação; cada novidade deve ficar simples (poucos botões, escolhas padrão boas, nada obrigatório).
- **Linguagem simples** com o dono (não é da área de TI): passos clicáveis, um por vez.

### 5.25 Editar o nome da categoria na janela dos lançamentos (issue #44)
**Pedido:** ao abrir os lançamentos de uma categoria (página Mês), poder editar o nome dela ali mesmo.
**Decisão:** botão "✏️ Editar nome" ao lado do título da janela. Pergunta o novo nome (recusa vazio ou nome já usado por outra categoria do mesmo tipo). Se a categoria já existia em meses anteriores, pergunta: **"Em todos os meses"** (corrige o nome em todas as versões, os valores não mudam) ou **"Só de mês/ano em diante"** (mesma regra do cadastro: o passado guarda o nome antigo). Categoria nova, sem passado, muda direto.
**Defeito achado no caminho:** duas perguntas seguidas (`askChoice`) se cancelavam pelo evento `close`; corrigido em `46-ui-dialogs.js`.

### 5.25 Celular: testes automáticos de largura e de toque (issue #11)
- Novo `e2e/features/10-celular.feature`: com 375 px de largura, **nenhuma das 6 telas** passa da largura do celular (sem rolagem para o lado) e **todo botão** visível tem pelo menos **40 px de altura**. Ficam fora da regra só os cabeçalhos que ordenam tabelas/listas e as células da planilha da tela Ano (dezenas de valores lado a lado).
- Ajustados no visual: botões do topo (＋ ano, ?, Sair, e-mail), meses e "＋ Lançar" da tela Mês passaram de 32–36 px para 40 px.
- Provado por mutação (`verificar-mutacoes.py`): estragando o CSS de propósito, os dois cenários reprovam.
- Falta: conferir num celular de verdade (por isso a issue #11 continua aberta).

### 5.26 CI que avisa sozinho: relatório, bugs e e-mail (issues #15 e #16)
Pedido do dono: o processo tem que ser **automático**, sem depender de alguém abrir o relatório, e os testes têm que ter **certeza** de testar de verdade (sem falso positivo).
- **E-mail com o resultado:** ao fim de cada execução (push em `main`/`dev`), o CI comenta na issue fixa **"📬 Resultados do CI"** mencionando o dono; o GitHub manda o e-mail (resumo por etapa, quantos cenários passaram, links). O título do aviso diz a verdade: ✅ tudo passou · ⚠️ testes passaram mas a publicação falhou · ❌ algo reprovou. Para receber: no GitHub, Settings → Notifications, deixar e-mail ligado para "Participating, @mentions".
- **Relatório abrível:** quando tudo passa, o relatório do Playwright (passo a passo e foto de cada cenário) fica em `https://caducondo.github.io/projetoOrcamento/relatorio/dev/` (e `/relatorio/main/`). Fica só o último de cada ambiente. Quando algo reprova, o site não é publicado; o relatório, as fotos e o trace vão num `.zip` (link no aviso, vale 14 dias).
- **Bug automático:** cada cenário reprovado vira uma issue `bug` + `backlog` + `P1` + `ci-automatico` (título `[CI/dev] nome do cenário`), com erro, evidência e como reproduzir. Não duplica; **fecha sozinha** (`done`) quando o cenário volta a passar. Falha dos testes de lógica ou da publicação também vira issue.
- **Provado de verdade (25/11/2026):** estragamos a tabela do mês de propósito no `dev`; o E2E reprovou, o site não foi publicado, a issue #46 abriu sozinha com o erro e fechou sozinha quando desfizemos o defeito.
- **Correções no caminho:** o aviso dizia "tudo passou" mesmo com a publicação falhando (agora testado); a publicação falhava às vezes com "No artifacts named github-pages" (o GitHub demora a listar o pacote novo): agora o CI espera o pacote aparecer e tenta de novo uma vez.
- Código: `tools/ci/relatar.js` (regras testadas em `tests/ci-relatar.test.js`) e `.github/workflows/ci-deploy.yml`.

### 5.27 Menu da foto e do nome no topo (issue #49)
Pedido do dono (olhando o celular): "?" e "Sair" ficavam perdidos numa linha de baixo. A foto com o nome virou um **menu que abre para baixo**, no celular e no computador:
- **Meu cadastro** (mostra o seu nome; leva ao cadastro), **Usuários** (só para o administrador), **Ajuda desta tela** (mostra de novo a explicação guiada) e **Sair**.
- Abre ao tocar na foto/nome; fecha ao tocar de novo, tocar fora, apertar **Esc** ou escolher uma opção. Opções com pelo menos 44 px de altura.
- Topo no celular: ano, "＋ ano" e foto+nome numa linha só. Em telas médias (701–1240 px) o nome some e fica só foto e seta, por falta de espaço.
- O passo "Ajuda" do tour agora aponta para a foto/nome (o botão "?" não existe mais solto).
- Testes: `tests/smoke-profile.test.js` (abre/fecha, itens, administrador x usuário comum) e `e2e/features/11-menu-usuario.feature` (Chrome de verdade, 1280/800/375 px); 6 mutações em `verificar-mutacoes.py`, todas detectadas.

### 5.28 Endereço do porteiro lembrado em todos os aparelhos (issue #50)
Pedido do dono: no celular o campo "Endereço do porteiro (Cloudflare)" vinha vazio (só o computador o lembrava) e ele teria que digitar.
- **Por que era assim:** o endereço ficava só no navegador de cada aparelho (`localStorage`).
- **É seguro guardar?** Sim: o endereço do porteiro **não é segredo** (como a chave pública do Firebase). A proteção está no porteiro, que só atende quem tem login válido do Firebase **com o e-mail do dono**, vindo do site permitido. Por isso o endereço **não** vai para o código nem para o repositório (público); fica na nuvem **da própria pessoa**.
- **Como ficou:** ao digitar, o endereço é guardado no aparelho e em `users/{uid}/config/banco` (formato `{json}`, que as regras do banco atuais já permitem: não precisa publicar regra nova). Ao abrir "Buscar do banco": aparelho vazio busca na nuvem e preenche sozinho; aparelho com endereço que a nuvem não tem, envia. Sem internet, vale o do aparelho.
- **Regras:** só endereços `https://` (até 300 caracteres) vão para a nuvem; quem escolheu **guardar só no aparelho** nunca grava nada no banco; "apagar dados da nuvem" apaga o endereço também.
- Testes: 4 em `tests/smoke-admin.test.js`, provados por mutação manual (puxar da nuvem, modo só aparelho, aceitar `http`, apagar junto).

### 5.29 Processo de engenharia (issue #51)
Pedido do dono: processo de desenvolvimento muito bem feito, seguro, com testes de várias camadas e o quadro **backlog → todo → wip → wtt → done → em-producao**.
- Nova documentação: `docs/ENGENHARIA.md` (arquitetura, ameaças e controles, estratégia de testes, processo, checklist de segurança, o que falta) e `docs/REGRAS-DE-NEGOCIO.md`.
- **Quadro de 6 estados** com etiquetas novas `todo`, `wtt` e `em-producao`. O CI promove **sozinho** `done` → `em-producao` (e fecha a issue) quando a `main` é publicada; bug do CI que volta a passar vira `done` e segue o mesmo caminho.
- Modelos de issue pedem cenário BDD, resultado esperado e obtido, evidência e o teste de regressão que vai nascer.
- O que ainda falta (issues de backlog): varredura de segurança no CI, teste de intrusão automatizado, limite de pedidos e teste de carga do porteiro, App Check, CSP/XSS, Page Objects, redução do estado global.

### 5.30 Segurança no CI (issue #52)
- Novo workflow **Segurança** (`.github/workflows/seguranca.yml`), separado do CI de publicação (não trava o site por falha antiga de ferramenta de teste): **CodeQL** (análise de código, com as consultas de segurança e qualidade), **npm audit** (reprova por qualquer falha no que vai para o site e por falha crítica nas ferramentas; as altas das ferramentas aparecem no resumo) e **gitleaks** (procura chaves/senhas no histórico inteiro). Roda em todo envio, PR e toda segunda-feira. **Dependabot** abre PR semanal (npm e ações do GitHub).
- Primeira execução (27/11/2026): os três passaram. Alertas do CodeQL ficam na aba Security do GitHub.
- Achado: o site usa o Firebase SDK 10.12.5 carregado de endereço de fora, sem SRI → issue própria (atualizar + `integrity`).

### 5.31 Texto de fora nunca vira código: testes de XSS e correções (issue #56)
Pedido do dono: sistema que não pode ser invadido; testes de intrusão. Primeira rodada: **injeção de código por texto** (XSS) em tudo que o usuário, um backup importado ou o cadastro de OUTRA pessoa pode escrever.
- **Testes novos:** `tests/smoke-xss.test.js` (5 testes: textos perigosos em categoria, lançamento, patrimônio, regra, perfil; identificadores vindos de backup; perfil de outra pessoa visto pelo administrador; foto; ícone e cor) e `e2e/features/12-seguranca.feature` (no Chrome de verdade: o texto aparece escrito, nada roda, nada vira elemento; recarregando também).
- **O que o teste achou (falhas reais):** (1) a **foto do perfil** entrava crua no `src` do `<img>` (um cadastro gravado direto no banco por um atacante com login poderia virar código no navegador de quem visse a foto, inclusive o administrador); (2) **ícone** e **cor** da categoria entravam crus no HTML (vêm de backup importado); (3) **identificador** e **tipo** da categoria vindos de backup entravam em atributos.
- **Correções:** foto só vale se for imagem em base64 (`fotoSegura`, também no cadastro e na regra do banco); ícone só da lista e cor só hexadecimal (`icoOk`/`corOk`); ao carregar ou importar dados, `saneIds` troca ids estranhos por ids novos (os lançamentos acompanham), força o tipo `receber`/`pagar` e descarta lançamento órfão com id estranho.
- **Regra do banco** (`firestore.rules`): `foto` só aceita `data:image/(png|jpeg|webp|gif);base64,...` (testada no emulador). **Precisa ser publicada no Firebase de teste e de produção** (SEGURANCA.md, etapa 1). Enquanto não for, a defesa do app já protege quem usa esta versão.
- **Provado por mutação:** tirar cada proteção (ícone, cor, foto, ids, o `esc` geral) reprova os testes; no Chrome, estragar o `esc` reprova o cenário.
- **Fica para a issue de CSP:** política de conteúdo (precisa ser conferida pelo dono no `/dev/` com login e nuvem, para não quebrar o app).

### 5.32 Testes E2E da nuvem: o app de verdade contra os emuladores do Firebase (issue #68)
Pedido do dono: ter CERTEZA de que os testes testam o sistema de verdade. Até aqui o E2E rodava sem Firebase; login, banco e regras só tinham simulação.
- **Como funciona:** `npm run e2e:nuvem:emu` sobe os emuladores de **login (Auth)** e **banco (Firestore)** com as **regras reais** (`firestore.rules`), monta o site em modo `emu` (`build.py --env emu`: projeto de demonstração e `useEmulator`; **nunca publicado**, e há teste que garante que `prod` e `dev` não têm nada disso) e roda cenários em português no Chrome (`e2e/nuvem/features`). O Firebase SDK vem de `e2e/.sdk` (baixado por `tools/baixar-sdk.py` **com conferência do hash**) e o `integrity` do site continua valendo.
- **O que os 11 cenários provam:** criar conta, lançar, o dado **vir do banco** depois de recarregar, sair/entrar e num **aparelho novo**; senha errada recusada; foto salva como imagem em base64; o **banco recusa** foto com código, endereço `javascript:` ou de fora e svg; uma pessoa **não lê nem altera** os dados de outra e **não vira administradora**; o administrador vê os dados dos outros **só para ler**; o endereço do porteiro fica na nuvem e aparece em outro aparelho.
- **Provado por mutação (6 estragos):** não gravar no banco, abrir a leitura para todos, deixar qualquer um escrever em `admins`, aceitar qualquer foto, não guardar o endereço, bloquear os botões de visão do administrador. Todos reprovaram o cenário certo.
- **Defeitos reais achados já no primeiro dia:** (1) em modo somente leitura o administrador **não conseguia abrir a aba Lançamentos** (a trava bloqueava também os botões que só mudam a visão): agora Por categoria/Lançamentos, filtros, tags e busca funcionam, e o que altera dado continua bloqueado; (2) no cadastro, **escolher ou tirar a foto apagava o nome, nascimento e profissão já digitados** e ainda não salvos: agora o formulário é preservado.
- **CI:** novo job `Testes da nuvem (Chrome + emuladores do Firebase)` trava a publicação junto com os outros; `npm run e2e:nuvem:ver` confere que nenhum cenário foi pulado; o relatório fica em `/relatorio/<ambiente>-nuvem/`; o aviso por e-mail mostra a linha da nuvem; cenário da nuvem que reprova vira issue `bug` como os outros.
- Limite honesto: emuladores não são o Firebase de verdade (por isso a conferência do dono no `/dev/` continua valendo para mudanças de SDK ou de configuração do projeto).

### 5.33 Porteiro: limite de pedidos e teste de carga/estresse (issue #54)
Pedido do dono: sistema que não pode ser invadido e processo com teste de carga e estresse. O porteiro (Cloudflare Worker) é o **único servidor nosso**; Firestore, Auth e GitHub Pages são do Google e do GitHub e **não entram em teste de carga** (os termos deles proíbem).
- **Dois freios** em `tools/pluggy-worker/worker.js`: (1) **por endereço (IP)**, 60 pedidos por minuto, aplicado **antes** de conferir o login (conferir assinatura e buscar chaves do Google gasta CPU e rede; quem erra o login também conta); (2) **por conta** (uid do login), 10 buscas a cada 5 minutos, só para pedidos válidos que chegariam à Pluggy (pedido inválido não gasta o limite; trocar de IP não adianta). Resposta **429** com `Retry-After` e a mensagem "Muitos pedidos. Espere N segundos e tente de novo." (o app já mostra a mensagem do porteiro). Janela deslizante; pedido barrado não prolonga o castigo.
- **Limite honesto:** a contagem fica na memória do servidor do Cloudflare; ele pode manter mais de um, então o limite real pode ser algumas vezes maior. Para contagem global, o porteiro também respeita o recurso opcional **Rate Limiting** do Cloudflare (nome `LIMITADOR`). Valores ajustáveis por variáveis (`LIMITE_IP_POR_MIN`, `LIMITE_BUSCAS`, `JANELA_BUSCAS_SEG`); valor inválido volta ao padrão, nunca desliga.
- **Carga e estresse** (`npm run carga:porteiro`, roda no CI): código real do porteiro num servidor HTTP local, Google e Pluggy simulados. Resultados na primeira execução: uso normal (6 buscas) 100% atendido, p95 49 ms; abuso com login verdadeiro (40 clientes, 9 mil pedidos): **exatamente 8 passaram**, o resto 429, Pluggy acionada só 8 vezes, p95 31 ms; inundação com login falso (24 mil pedidos): só 60 chegaram a conferir o login; estresse (120 contas, até 150 simultâneos, 21 mil pedidos): zero 5xx, nenhuma conta passou do limite, p95 71 ms. Estragar o limitador reprova o script.
- **Ferramenta:** o plano citava o k6, mas ele é um programa externo que não pude baixar neste ambiente; o script em Node cumpre o papel sem instalar nada e roda igual no CI. Se um dia quisermos o k6 (gráficos, cenários mais longos), é uma issue nova.
- **Ação do dono:** colar o `worker.js` novo no Cloudflare (`docs/BANCO-DIRETO.md`, "Atualizar o porteiro"). Enquanto não colar, o porteiro de produção segue sem os limites.

### 5.34 Varredura de intrusão automática (OWASP ZAP) e o primeiro achado real (issue #53)
- **Workflow `Intrusão (ZAP)`** (`.github/workflows/intrusao.yml`): toda terça-feira e sob demanda, o ZAP em modo **baseline** (só observa) varre o `/dev/` e abre uma issue com os achados. Nunca contra a produção, o Firebase/Google ou o porteiro. `.zap/regras.tsv` separa o que **não dá para corrigir** no GitHub Pages (cabeçalhos; ignorado com justificativa escrita) do que fica **visível** (WARN).
- **Limite honesto:** o site é HTML estático com JavaScript; a varredura enxerga as respostas HTTP e a página inicial, não o que só aparece depois do login. Complementa os testes de XSS/isolamento e o teste de intrusão manual.
- **Achado real:** o leitor de PDF embutido (**pdf.js 3.11.174**) tem a **CVE-2024-4367** (PDF malicioso executa código ao montar fontes). Corrigido com a defesa oficial para essa versão, `isEvalSupported:false` ao abrir o PDF (`66-ui-import.js`). Cenário E2E no Chrome de verdade confere que o PDF continua sendo lido e que o app abre o PDF com a opção ligada; provado por mutação. Exposição já era baixa (o app só extrai texto, não desenha a página), mas a mitigação custa nada.
- **Outros achados:** Google Fonts sem SRI (o CSS das fontes não aceita SRI) e `eval` dentro do próprio pdf.js. Viram uma issue: atualizar o pdf.js para a série 4.x e hospedar as fontes no próprio site.

