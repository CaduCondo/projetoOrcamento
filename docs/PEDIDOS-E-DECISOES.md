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

## 6. Princípios que combinamos
- **Privacidade primeiro:** planilhas, backups e dados pessoais **nunca** vão para o GitHub (repositório público).
- **Honestidade com o usuário:** o que a tela promete é o que o sistema faz.
- **Testar antes de publicar:** tudo vai primeiro para `dev`; só vai para produção com aprovação do dono.
- **Linguagem simples** com o dono (não é da área de TI): passos clicáveis, um por vez.
