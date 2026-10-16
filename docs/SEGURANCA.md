# Guia do dono — passo a passo bem detalhado

Faça **uma etapa por vez**, na ordem. Cada etapa diz **onde clicar**, **o que você deve ver** e **como saber que deu certo**.
Os nomes dos botões podem variar um pouco (o Google muda as telas de vez em quando). Se algo estiver diferente, tire um print e mande.

Por que isso importa: o app já protege os dados (cada pessoa só vê o que é dela, senha forte, site só em HTTPS).
O ponto mais sensível é **a sua conta**: quem entrar no seu Google ou no seu GitHub consegue mexer em tudo. Estas etapas fecham essa porta.

---

## ETAPA 1 — Publicar as regras novas do banco (5 minutos, nos 2 projetos)
Sem isso, o “registro de erros” não funciona.

1. No computador, abra o arquivo `firestore.rules` do projeto (no VS Code: painel da esquerda, clique em `firestore.rules`).
2. Clique dentro do texto, aperte **Ctrl+A** (seleciona tudo) e **Ctrl+C** (copia).
3. Abra https://console.firebase.google.com e clique no projeto **gerenciarorcamento-dev** (o de teste).
4. No menu da esquerda: **Criação** (ou *Build*) → **Firestore Database**.
5. Lá em cima, clique na aba **Regras**.
6. Clique dentro do texto que aparece, aperte **Ctrl+A** e depois **Ctrl+V** (cola o novo por cima).
7. Clique em **Publicar**. Deve aparecer “Regras publicadas” (ou parecido).
8. Volte ao começo do console (logo do Firebase, canto superior esquerdo) e repita os passos 4 a 7 no projeto **gerenciarorcamento** (produção).

✅ Deu certo se: no app, em **Ajustes**, o quadro “🛠 Erros registrados” mostra “Nenhum erro registrado” (e não uma mensagem de erro).

---

## ETAPA 2 — Verificação em 2 etapas no seu Google (10 minutos) — A MAIS IMPORTANTE
Com isso, mesmo que alguém descubra sua senha, não consegue entrar sem o seu celular.

1. Abra https://myaccount.google.com/security (entre com a conta que é administradora do app).
2. Procure o quadro **“Como você faz login no Google”**.
3. Clique em **Verificação em duas etapas** → **Ativar** (ou *Começar*). O Google pede sua senha de novo: digite.
4. Ele vai sugerir confirmar pelo **celular** (aparece “É você tentando fazer login?” no telefone). Aceite.
5. Ainda nessa página, adicione **pelo menos mais um jeito** de confirmar:
   - **Chaves de acesso** (*Passkeys*): clique em **Criar uma chave de acesso** e siga o que aparecer (usa a digital/rosto/PIN do celular ou do computador). É o mais seguro e o mais fácil.
   - ou **App autenticador**: instale o **Google Authenticator** no celular, clique em **Configurar autenticador**, aponte a câmera para o QR code e digite o número de 6 dígitos que aparecer no app.
6. Clique em **Códigos alternativos** → **Gerar códigos**. Aparecem 10 códigos.
   **Anote em papel** (ou imprima) e guarde num lugar seguro de casa. Eles salvam você se perder o celular. **Não** guarde em foto no celular nem mande por mensagem.
7. Volte em https://myaccount.google.com/security e confira **Telefone de recuperação** e **E-mail de recuperação**: precisam ser seus e estar certos.
8. Na mesma página, desça até **Seus dispositivos** → **Gerenciar todos os dispositivos**. Se aparecer algum aparelho que você não conhece, clique nele → **Sair**.
9. Abra https://myaccount.google.com/security-checkup e resolva tudo que aparecer em amarelo ou vermelho.
10. A senha do Google precisa ser **só dela** (não use a mesma em nenhum outro site). Se não for, troque em **Senha** nessa mesma página.

✅ Deu certo se: em https://myaccount.google.com/security aparece “Verificação em duas etapas: **Ativada**”.

---

## ETAPA 3 — Verificação em 2 etapas no GitHub (10 minutos)
O código do app fica lá; quem entrar na sua conta poderia publicar uma versão falsa.

1. Instale no celular um app autenticador (pode ser o mesmo **Google Authenticator** da etapa 2).
2. Abra https://github.com/settings/security (entre na sua conta do GitHub).
3. Em **Two-factor authentication**, clique em **Enable two-factor authentication**.
4. Escolha **Authenticator app**. Aparece um QR code: no celular, no app autenticador, toque em **+** → **Ler QR code** e aponte para a tela.
5. Digite no GitHub o número de 6 dígitos que aparece no celular → **Continue**.
6. O GitHub mostra os **Recovery codes**: clique em **Download** e também anote em papel junto com os códigos do Google. Clique em **I have saved my recovery codes**.
7. Abra https://github.com/settings/sessions e, se houver sessão que você não reconhece, clique em **Revoke**.
8. Abra https://github.com/settings/keys e https://github.com/settings/tokens: apague (**Delete**) qualquer chave/token que você não saiba de onde veio.
   (Se aparecer algo com nome “gh” ou “GitHub CLI”, é do seu computador — pode manter.)

✅ Deu certo se: em https://github.com/settings/security aparece “Two-factor authentication: **Enabled**”.

---

## ETAPA 4 — Proteção contra “descobrir e-mails” (2 minutos, nos 2 projetos)
Impede que alguém teste e-mails para descobrir quem usa o app.

1. https://console.firebase.google.com → projeto **gerenciarorcamento-dev**.
2. **Criação** → **Authentication** → aba **Configurações** (*Settings*).
3. Clique em **Ações do usuário** (*User actions*).
4. Marque **Proteção contra enumeração de e-mails** (*Email enumeration protection*) → **Salvar**.
5. Ainda em **Configurações**, clique em **Domínios autorizados**. Devem estar só: `localhost`, `caducondo.github.io` e os que terminam em `firebaseapp.com` e `web.app`. Se houver outro, clique nos três pontinhos → **Excluir**.
6. Repita tudo no projeto **gerenciarorcamento**.

✅ Deu certo se: a caixa da proteção fica marcada depois de recarregar a página.

---

## ETAPA 5 — Só você com acesso aos projetos (2 minutos, nos 2 projetos)
1. Abra https://console.cloud.google.com/iam-admin/iam?project=gerenciarorcamento
2. Aparece uma lista de “Principais”. Deve existir **só o seu e-mail** (como *Proprietário*) e algumas contas técnicas que terminam em `gserviceaccount.com` (essas são do próprio Google — **não mexa**).
3. Se houver qualquer **outro e-mail de pessoa**, clique no lápis ao lado → **Excluir** (ícone de lixeira) → **Salvar**.
4. Repita trocando o final do endereço para `project=gerenciarorcamento-dev`.

---

## ETAPA 6 — Prender a “chave do site” ao seu endereço (5 minutos, nos 2 projetos)
A chave que fica no site é pública por natureza; esta etapa faz com que **só o seu site** consiga usá-la.

1. Abra https://console.cloud.google.com/apis/credentials?project=gerenciarorcamento
2. Em **Chaves de API**, clique em **Browser key (auto created by Firebase)**.
3. Em **Restrições de aplicativo**, escolha **Sites** (*Websites*).
4. Clique em **Adicionar** e digite: `https://caducondo.github.io/*` → **Concluído**.
5. Clique em **Salvar** (embaixo). Pode levar até 5 minutos para valer.
6. Repita no projeto de teste: https://console.cloud.google.com/apis/credentials?project=gerenciarorcamento-dev
   — lá adicione **também** `http://localhost:8000/*` (para testar no computador).
7. **Me avise** quando terminar: eu abro o site de teste e o de produção e confirmo que o login continua funcionando.

⚠️ Se um dia mudarmos o endereço do site (ver “endereço sem custo” na conversa), esta lista precisa ser atualizada junto.

---

## ETAPA 7 — App Check (opcional, depois das outras) — 15 minutos + uma ação minha
Faz o Firebase recusar acessos que não venham do nosso site (robôs, scripts).
1. Abra https://www.google.com/recaptcha/admin/create
2. **Rótulo**: `Meu Orçamento`. **Tipo**: **Baseado em pontuação (v3)**. **Domínios**: `caducondo.github.io`. Aceite os termos → **Enviar**.
3. Aparecem duas chaves: **Chave do site** e **Chave secreta**. Deixe a página aberta.
4. Em outra aba: https://console.firebase.google.com → projeto **gerenciarorcamento** → **App Check** (menu da esquerda, em *Criação* ou *Build*) → **Apps** → clique no app da Web → **reCAPTCHA** → cole a **Chave secreta** → **Salvar**.
5. **Me mande só a “Chave do site”** (ela é pública). **Nunca** mande a chave secreta para ninguém.
6. Eu coloco a chave no app e publico. Acompanhamos uns dias no App Check (gráfico de “solicitações verificadas”).
   Só quando quase tudo estiver verificado, você clica em **Aplicar** (*Enforce*) para **Cloud Firestore** e **Authentication**.

---

## Hábitos (sempre)
- Celular e computador com **bloqueio de tela** e **atualizados**.
- Não instale extensões de navegador desconhecidas.
- E-mail pedindo para “entrar urgente” em algum lugar? **Não clique**: digite você mesmo o endereço do site.
- De vez em quando: app → **Ajustes → ⬇ Baixar backup** e guarde o arquivo num pendrive.

## O que o app não promete (dito com honestidade aos usuários)
- Dados na nuvem não são criptografados de ponta a ponta: o Google (infraestrutura) e o administrador (só leitura, para suporte) conseguem lê-los.
- Quem escolhe “só neste aparelho” não tem lançamentos no banco — nem o administrador vê.
