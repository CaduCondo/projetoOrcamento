# Segurança — lista de verificação do dono

O app já protege os dados com regras do banco (cada pessoa só vê o que é dela; o administrador só lê), senha forte exigida pelo servidor, HTTPS e nenhum segredo no código.
O ponto mais sensível é **a conta do dono**: quem entrar no Google ou no GitHub do dono consegue mexer em tudo. Por isso esta lista.

Marque cada item quando terminar. Os nomes dos menus podem mudar um pouco com o tempo.

## A. Conta Google (stefcadu@gmail.com) — a mais importante
- [ ] Abrir https://myaccount.google.com/security → **Verificação em duas etapas** → ativar.
      Preferir **chave de acesso (passkey)** ou o app **Google Authenticator**. Evitar depender só de SMS.
- [ ] Na mesma página: **Códigos alternativos** → gerar, imprimir/anotar em papel e guardar em lugar seguro.
- [ ] Conferir **telefone e e-mail de recuperação** (precisam ser seus e estar atualizados).
- [ ] **Seus dispositivos** → remover qualquer aparelho que você não reconheça.
- [ ] Abrir https://myaccount.google.com/security-checkup e resolver tudo que aparecer em amarelo/vermelho.
- [ ] Senha do Google **única** (não usada em nenhum outro site) e longa.

## B. GitHub (onde está o código)
- [ ] https://github.com/settings/security → **Two-factor authentication** → **Enable** → app autenticador. Guardar os **recovery codes**.
- [ ] https://github.com/settings/sessions → encerrar sessões que não reconhecer.
- [ ] https://github.com/settings/keys e https://github.com/settings/tokens → apagar chaves/tokens que não reconhecer.
- [ ] (Opcional, recomendado) No repositório: **Settings → Branches → Add rule** para `main` → marcar **Require status checks to pass** (escolher “Testes”). Assim nada vai para produção sem os testes passarem.

## C. Firebase / Google Cloud (fazer nos DOIS projetos: `gerenciarorcamento` e `gerenciarorcamento-dev`)
- [ ] **Quem tem acesso:** https://console.cloud.google.com/iam-admin/iam?project=gerenciarorcamento → só o seu e-mail deve aparecer (como Proprietário). Remover qualquer outro.
- [ ] **Restringir a chave do site:** https://console.cloud.google.com/apis/credentials?project=gerenciarorcamento → clicar em **Browser key (auto created by Firebase)** →
      **Restrições de aplicativo: Sites** → adicionar `https://caducondo.github.io/*` → **Salvar**.
      No projeto de teste, adicionar também `http://localhost:8000/*` (para testar no computador). Depois avise: eu confiro se o site continua funcionando.
- [ ] **Authentication → Configurações → Ações do usuário:** ativar **Proteção contra enumeração de e-mails** (impede descobrir quais e-mails têm conta).
- [ ] **Authentication → Configurações → Domínios autorizados:** deixar só `localhost`, `caducondo.github.io` e os domínios padrão do Firebase. Apagar o resto.
- [ ] **Firestore → Regras:** publicar o conteúdo atual de `firestore.rules` (o arquivo do projeto).
- [ ] **Plano:** continuar no **Spark (gratuito)**. Sem cartão cadastrado, não existe cobrança surpresa.

## D. App Check (segunda etapa — precisa de uma ação minha depois)
Faz o Firebase recusar qualquer acesso que não venha do nosso site (robôs e scripts de fora).
- [ ] Criar uma chave em https://www.google.com/recaptcha/admin/create → tipo **reCAPTCHA v3** (pontuação) → domínio `caducondo.github.io`.
- [ ] Firebase → **App Check** → registrar o app da Web com **reCAPTCHA v3**, colando a **chave secreta** lá (a secreta fica só no Firebase).
- [ ] Me mandar a **chave do site** (site key — ela é pública, aparece no site de qualquer jeito). **Nunca** mande a chave secreta.
- [ ] Eu coloco a chave no app, publicamos no teste, acompanhamos alguns dias e só então você clica em **Aplicar (Enforce)** para Firestore e Authentication.

## E. Aparelhos e hábitos
- [ ] Computador e celular com **bloqueio de tela** e sistema **atualizado**.
- [ ] Não instalar extensões de navegador desconhecidas.
- [ ] Desconfiar de e-mails pedindo login “urgente” (golpe de phishing). Entrar sempre digitando o endereço.
- [ ] Baixar um **backup** do app de vez em quando (Ajustes → Baixar backup) e guardar fora do computador.

## O que o app NÃO promete (dito com honestidade aos usuários)
- Os dados na nuvem não são criptografados de ponta a ponta: o Google (infraestrutura) e o administrador (somente leitura, para suporte) conseguem lê-los.
- Quem escolhe “só neste aparelho” não tem lançamentos no banco — nem o administrador vê.
