# Passo a passo dos procedimentos

Guia para quem **não é da área de TI**. Cada procedimento tem: *quando fazer*, os *passos* (com o nome exato dos botões) e *como conferir*.

Sumário
1. [Criar e configurar um projeto Firebase (produção ou teste)](#1-criar-e-configurar-um-projeto-firebase)
2. [Publicar as regras de segurança do banco](#2-publicar-as-regras-de-segurança-do-banco)
3. [Criar a sua conta e importar o histórico](#3-criar-a-sua-conta-e-importar-o-historico)
4. [Atualizar o histórico quando a planilha mudar](#4-atualizar-o-historico-quando-a-planilha-mudar)
5. [Rotina de desenvolvimento: do teste à produção](#5-rotina-de-desenvolvimento-do-teste-a-producao)
6. [Rodar o sistema e os testes no seu computador](#6-rodar-o-sistema-e-os-testes-no-seu-computador)
7. [Como o site é publicado (GitHub Pages e Actions)](#7-como-o-site-e-publicado)
8. [Backup, restaurar e exportar](#8-backup-restaurar-e-exportar)
9. [Esqueci a senha](#9-esqueci-a-senha)
10. [Tornar-se administrador](#10-tornar-se-administrador)
11. [Kanban e issues no GitHub](#11-kanban-e-issues-no-github)
12. [Instalar no celular e lojas](#instalar-no-celular-e-lojas)
13. [Regras de ouro de privacidade](#13-regras-de-ouro-de-privacidade)

---

## 1. Criar e configurar um projeto Firebase
**Quando:** uma vez para a *produção* (`gerenciarorcamento`, já feito) e uma vez para o *teste* (`gerenciarorcamento-dev`, já feito).
Para um novo ambiente, repita tudo trocando o nome. Antes de cada passo, **confira o nome do projeto no alto da tela do Firebase** para não mexer no errado.

**Passos** (`console.firebase.google.com`, entre com a conta Google):
1. **Criar o projeto:** botão **Criar um projeto** (ou, num projeto aberto, clique no nome dele no alto à esquerda → **Adicionar projeto**).
   Nome: `gerenciarorcamento-dev` (ou outro) → **Continuar** → (tela de IA/Gemini: **Continuar**) → no **Google Analytics** *desligue* o interruptor → **Criar projeto** → aguarde → **Continuar**.
2. **Criar o banco:** menu da esquerda, em *Atalhos do projeto*, clique em **Firestore** → **Criar banco de dados**.
   - Etapa 1 *Selecionar a edição*: deixe **Standard** → **Avançar**.
   - Etapa 2 *ID e local*: deixe `(default)`; em **Local** escolha **`southamerica-east1` (São Paulo)** (não dá para mudar depois) → **Avançar**.
   - Etapa 3 *Configurar*: marque **Iniciar no modo de produção** (**não** o modo de teste, que deixa o banco aberto) → **Avançar**.
   - Etapa 4 *Backups programados (opcional)*: não mexa → **Criar**. Espere ~20 segundos.
3. **Colar as regras de segurança:** veja o procedimento [2](#2-publicar-as-regras-de-seguranca-do-banco).
4. **Ativar o login por e-mail:** menu **Authentication** → **Vamos começar** (se aparecer) → **E-mail/senha** → ligue a **primeira** chave (E-mail/senha) e deixe a segunda (*Link por e-mail*) desligada → **Salvar**.
5. **Autorizar o site:** em Authentication → aba **Configurações** → **Domínios autorizados** → **Adicionar domínio** → `caducondo.github.io`.
6. **Registrar o app e pegar a configuração:** **Visão geral do projeto** → **+ Adicionar app** → ícone **`</>`** (Web) → apelido (ex.: `orcamento-web-dev`) → **não** marque *Firebase Hosting* → **Registrar app**.
   Aparece um bloco `const firebaseConfig = { ... }`. **Copie** `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` e `appId`.
7. **Guardar no projeto:** cole esses 6 valores (em JSON) em `src/config/firebase.dev.json` (teste) ou `src/config/firebase.prod.json` (produção) e envie ao GitHub (procedimento [5](#5-rotina-de-desenvolvimento-do-teste-a-producao)).
   Essas chaves **são públicas por desenho** (não são senha); quem protege os dados são as regras do passo 3.

**Como conferir:** abra o site do ambiente, crie uma conta de teste, lance algo, recarregue a página; no Firebase → Firestore → **Dados** deve existir `users → (um código) → meta` e `years`.
Depois **apague a conta de teste**: Authentication → **Usuários** → ⋮ → *Excluir conta*, e apague o documento em Firestore.

## 2. Publicar as regras de segurança do banco
**Quando:** na criação de cada projeto e **sempre que o arquivo `firestore.rules` mudar** (nos dois projetos).
1. Abra `firestore.rules` no projeto e copie **todo** o texto.
2. No Firebase (confira o projeto!) → **Firestore** → aba **Regras**.
3. Clique dentro da caixa, **Ctrl+A**, **Delete**, cole o texto novo.
4. Clique em **Publicar**.

**Como conferir:** os testes do repositório garantem o conteúdo do arquivo; no Firebase, a aba Regras deve mostrar a data/hora da publicação.

## 3. Criar a sua conta e importar o histórico
1. Abra o site (produção: `https://caducondo.github.io/projetoOrcamento/`; teste: `.../dev/`) → **Criar conta** → e-mail e senha (mín. 6 caracteres).
2. Vá em **Ajustes** → **Importar anos anteriores (.json)** → escolha o arquivo `historico.json`
   (como gerá-lo: procedimento [4](#4-atualizar-o-historico-quando-a-planilha-mudar)).
3. Se algum ano já tiver lançamentos, o app avisa que será **substituído**; confirme só se a planilha for a "verdade" daquele ano.
4. Confira alguns totais com a planilha (tela **Ano**).

> Importar de novo **substitui os anos que estão no arquivo**. Se você já lançou direto no app num ano, gere o JSON só dos anos fechados
> (`--anos 2015-2025`) e mantenha o ano atual direto no app.

## 4. Atualizar o histórico quando a planilha mudar
1. Instale uma vez: Python (python.org) e, no terminal, `pip install openpyxl`.
2. No terminal, dentro da pasta do projeto:
   ```
   python tools/planilha_para_json.py "C:/Users/voce/Downloads/Orçamento completo.xlsx" --saida "C:/Users/voce/Downloads/historico.json" --saldo-inicial 2026=90000
   ```
   Opções: `--anos 2015-2025` (só alguns anos) · `--saldo-inicial ANO=VALOR` (repita para mais anos).
3. O programa mostra, por ano, quantas células leu e as **diferenças contra os totais da própria planilha** (explicadas em *PEDIDOS-E-DECISOES.md*, regra 7).
4. Importe o `historico.json` em **Ajustes** (procedimento 3). **Nunca envie esse arquivo ao GitHub** (tem dados pessoais; o `.gitignore` bloqueia).

## 5. Rotina de desenvolvimento: do teste à produção
Quem programa (você pode pedir ao Claude) segue sempre este caminho:
1. `git switch dev` — trabalhar no ramo de teste.
2. Fazer a mudança e rodar `npm test` (todos os testes devem passar).
3. `git add -A` · `git commit -m "o que mudou"` · `git push` — o GitHub roda os testes e, se passarem, atualiza o site **de teste** (`/dev/`).
4. **Conferir** no site de teste (faixa laranja "AMBIENTE DE TESTE").
5. Estando bom, abrir um *Pull Request* de `dev` para `main` (`gh pr create --base main --head dev`), conferir que os testes ficaram verdes e **aprovar/mesclar**.
   O GitHub publica a **produção**.
6. Se algo der errado na produção: reverter o *merge* (`git revert`) e enviar — os testes e a publicação rodam de novo.

## 6. Rodar o sistema e os testes no seu computador
Precisa de Node.js 22 e Python 3 (e Java 21+ só para `npm run test:rules`).
```
npm install          # uma vez
npm test             # roda todos os testes (leva ~6 segundos)
npm run build:dev    # monta dist/index.html (ambiente de teste)
npm run serve        # abre em http://localhost:8000
```
Outros ambientes: `python build.py --env local` (sem Firebase, dados só no navegador) e `--env prod`.

## 7. Como o site é publicado
- O arquivo `.github/workflows/ci-deploy.yml` roda a cada envio: **1)** os testes; **2)** se passarem e o envio for em `main` ou `dev`, monta o site
  (produção = ramo `main` na raiz; teste = ramo `dev` em `/dev/`) e publica no GitHub Pages.
- O GitHub Pages está no modo **"GitHub Actions"** (Settings → Pages → Source).
- O ambiente `github-pages` precisa **permitir os ramos `main` e `dev`** (Settings → Environments → github-pages → *Deployment branches*), senão a publicação do `dev` falha.
- Acompanhar: aba **Actions** do repositório; ou `gh run list`.

## 8. Backup, restaurar e exportar
Em **Ajustes**: **Baixar backup (.json)** (guarde em lugar seguro), **Restaurar backup** (substitui tudo), **Exportar para Excel (.csv)**.
Faça backup de vez em quando, mesmo com os dados na nuvem.

## 9. Esqueci a senha
- **Nuvem (site publicado):** na tela de login → **Esqueci minha senha** → digite o e-mail → chega um link por e-mail (veja também o spam).
- **Modo local (sem Firebase):** a mesma opção define uma senha nova *neste navegador* mantendo os dados (não é uma proteção forte).

## 10. Tornar-se administrador
O administrador é definido **no banco**, por você, no console do Firebase (ninguém consegue se tornar administrador pelo site). Ele vê o botão **👥 Usuários** no topo
e consegue **ver** (nunca alterar) os dados de quem guarda na nuvem:
1. Crie sua conta no ambiente (procedimento 3) e anote seu **UID**: Firebase → **Authentication → Usuários** → coluna *UID de usuário*.
2. Firebase → **Firestore → Dados → Iniciar coleção** → ID da coleção `admins` → ID do documento = **seu UID** → adicione um campo qualquer (ex.: `ativo` = `true`) → **Salvar**.
3. Publique as regras novas (procedimento 2). Repita nos dois projetos (teste e produção; os UIDs são diferentes).
4. Saia e entre de novo no site. Aparece **👥 Usuários** no topo. Na lista: **olho aberto** = a pessoa guarda na nuvem (você consegue ver);
   **olho riscado** = a pessoa guarda só no aparelho (não existem dados dela no sistema). Para voltar aos seus dados: **Voltar aos meus dados**.
5. Para **tirar** um administrador: apague o documento dele em `admins`.

## 10b. Escolher onde guardar os dados (para quem usa o app)
No topo, clique no seu **nome/foto** → **Onde guardar meus dados**:
- **Nuvem:** dados em qualquer aparelho. Só você e o administrador (somente leitura, para suporte) conseguem ver.
- **Neste aparelho (arquivo CSV):** os lançamentos **não vão para a nuvem**; ficam num arquivo CSV (Excel). No computador (Chrome/Edge) você escolhe onde o arquivo fica;
  no celular o app guarda uma cópia no navegador e você usa **Baixar CSV**.
- Ao trocar para "neste aparelho" o app pergunta se apaga a cópia que está na nuvem. Para voltar à nuvem, o app envia os dados de novo.
- Abriu o app em **outro aparelho** e escolheu "arquivo"? Aparece o aviso "não encontramos seus dados neste aparelho": vá em **Ajustes → Carregar arquivo (.csv)** e escolha o arquivo.

## 10c. Conferir a segurança do banco
`npm run test:rules` roda 8 testes das regras no emulador oficial do Firebase (precisa de Java; leva ~10 s): ninguém lê dados de outra pessoa, o administrador só lê,
ninguém vira administrador pelo site. A publicação automática também roda esses testes.

## 11. Kanban e issues no GitHub
Veja [KANBAN.md](KANBAN.md): cada tarefa é uma *issue*; o estado é indicado pelas etiquetas `backlog` → `wip` → `done`, e a prioridade por `P0`…`P3`.

## Instalar no celular e lojas
- **Hoje:** o site já abre no celular. No Chrome (Android) ou Safari (iPhone): menu → **Adicionar à tela inicial**.
- **PWA (próximo passo, grátis):** o site vira "app instalável" com ícone e tela cheia, sem loja.
- **Android (Google Play):** dá para empacotar o site (com *Capacitor* ou *TWA*) num arquivo `.aab`/`.apk`. Precisa de conta de desenvolvedor Google (US$ 25, uma vez), Android SDK e uma chave de assinatura.
- **iPhone (App Store):** exige **Mac com Xcode** e conta Apple Developer (US$ 99/ano) — não dá para gerar no Windows (só em nuvem, com Mac alugado/CI), e a Apple pede revisão do app.
- Vantagem do pacote nativo (Capacitor): acesso real a **arquivos do aparelho** (útil para o "salvar em arquivo local" no celular).

## 13. Regras de ouro de privacidade
- Planilhas, backups `.json`, `historico.json`, `seed.json` e qualquer dado real **nunca** vão para o GitHub (o repositório é público).
- Ao fazer commits, usar o e-mail "noreply" do GitHub.
- Nunca colar chaves *service account* ou senhas em arquivos do projeto. A chave do Firebase em `src/config` é pública por desenho.
- A tela só pode prometer o que o sistema cumpre (ex.: quem escolhe "arquivo local" **não** tem dados na nuvem).
