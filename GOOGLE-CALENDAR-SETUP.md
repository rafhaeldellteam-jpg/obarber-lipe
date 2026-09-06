# Configurar Google Agenda no Obarber Lipe

Guia passo-a-passo para conectar o Google Agenda de cada barbeiro ao site.
Cada barbeiro conecta a **própria** conta Google — as agendas não se misturam.

## O que você vai precisar

- A conta Google da **barbearia** (ou a sua). Uma única credencial de app é usada;
  cada barbeiro autoriza com a conta Google dele.

---

## 1. Criar o projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Se necessário, entre com a conta Google da barbearia.
3. Clique no seletor de projeto (topo da página) → **Novo projeto**.
   - Nome: `obarber-lipe`
   - Clique em **Criar**.
4. Com o projeto selecionado, continue no passo 2.

## 2. Ativar a API (biblioteca) do Google Calendar

1. No menu lateral: **APIs e serviços** → **Biblioteca**.
2. Pesquise **Google Calendar API**.
3. Clique nela → botão **Ativar**.

## 3. Configurar a tela de consentimento (OAuth)

1. **APIs e serviços** → **Tela de consentimento do OAuth**.
2. Escolha `Externo` → **Criar**.
3. Dados do app:
   - Nome do app: `Obarber Lipe`
   - E-mail de suporte: o e-mail da barbearia
   - E-mail para contato do desenvolvedor: o mesmo e-mail
4. **Salvar e continuar** (Scopes) — sem precisar adicionar escopo manual.
5. Em **Usuários de teste**, adicione os e-mails dos barbeiros
   (ex.: `comercial.barberlipe@gmail.com`, `comercial.lucasbarber@gmail.com`)
   enquanto o app ainda estiver em modo de teste.
6. **Salvar e continuar** até concluir.

> Depois de tudo funcionando, você pode voltar aqui e **publicar** o app
> (botão **Publicar app**) para que qualquer pessoa autorize sem depender
> da lista de usuários de teste.

## 4. Criar o Client ID de OAuth (Web application)

1. **APIs e serviços** → **Credenciais** → **Criar Credenciais** → **ID do cliente OAuth**.
2. Tipo: **App da Web**.
   - Nome: `obarber-lipe`
3. Em **URIs de redirecionamento autorizados** clique em **Adicionar URI** e cole:

   `https://obarber-lipe.vercel.app/api/calendar/callback`

4. Clique em **Criar**.
5. Uma janela mostra o **Client ID** e o **Client Secret**.
   - **Copie os dois** e envie para mim aqui no chat (Client ID e Client Secret).

> Importante: o Client Secret é uma credencial sensível — ele é usado
> **somente no servidor** (Vercel), nunca aparece no navegador.

---

## 5. Depois que eu setar as variáveis na Vercel

1. Faça login no painel administrativo (`https://obarber-lipe.vercel.app/admin`).
2. Aba **Configurações** → seção **Google Agenda**.
3. Clique em **Conectar Google** ao lado do e-mail do barbeiro.
4. Autorize na janela do Google (use a conta do próprio barbeiro).
5. Pronto. Agora os agendamentos desse barbeiro criam eventos no
   Google Agenda dele, e cancelamentos removem o evento.

Repita para cada barbeiro — cada um com a conta dele.

## Problemas comuns

- **"Access blocked / precisa de aprovação"**: coloque o e-mail do barbeiro
  em **Usuários de teste** (seção 3) ou publique o app.
- **"Redirect URI" não autorizado**: confira se a URI de redirecionamento termina
  com `/api/calendar/callback` e sem barra extra.
- **Calendário não sincroniza**: confira se o app não está em modo de teste com
  o barbeiro fora da lista, e se a API do Calendar está **Ativada** no projeto certo.