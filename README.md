# TESS - Assistente de IA Web

Aplicacao full-stack em **Next.js + TypeScript** com chat de IA, autenticacao por email/senha, historico por usuario e persistencia em MySQL via Prisma.

Projeto pronto para deploy como **Node.js App** na Hostinger (Web Apps Hosting), com backend no proprio App Router do Next.js.

## Visao geral

O TESS foi construido para ser um MVP de producao com:

- login e cadastro
- amostra publica sem login (`/demo`)
- chat com IA (OpenAI no backend)
- streaming de resposta no chat
- historico de conversas por usuario
- persistencia de mensagens no banco
- endpoint de healthcheck (`/api/health`)
- painel admin basico (`/admin`)

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL
- JWT em cookie HTTP-only
- bcryptjs (hash de senha)
- zod (validacao)
- OpenAI SDK

## Funcionalidades MVP implementadas

1. Tela de login (`/login`)
2. Tela de cadastro (`/register`)
3. Tela principal de chat (`/chat`)
4. Historico de conversas por usuario (sidebar)
5. Persistencia de mensagens no banco
6. Healthcheck (`/api/health`)
7. Amostra publica sem login (`/demo`)
8. Painel admin basico (`/admin`)
   - lista de usuarios
   - lista de conversas
   - placeholder para metricas

## Estrutura do projeto

```txt
app/
  api/
    admin/conversations/route.ts
    admin/users/route.ts
    auth/login/route.ts
    auth/logout/route.ts
    auth/me/route.ts
    auth/register/route.ts
    chat/route.ts
    chat/demo/route.ts
    conversations/route.ts
    conversations/[id]/route.ts
    health/route.ts
  admin/page.tsx
  chat/page.tsx
  demo/page.tsx
  login/page.tsx
  register/page.tsx
  layout.tsx
  page.tsx
components/
  auth-form.tsx
  demo-chat.tsx
  chat-message.tsx
  chat-shell.tsx
lib/
  auth.ts
  http.ts
  network.ts
  openai.ts
  prisma.ts
  rate-limit.ts
  sanitize.ts
  session.ts
  types.ts
  validators.ts
prisma/
  schema.prisma
.env.example
next.config.ts
package.json
README.md
```

## Requisitos

- Node.js 20+
- npm 10+
- MySQL 8+

## Configuracao de ambiente

Copie `.env.example` para `.env` e ajuste:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/tess_db"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
JWT_SECRET="troque-para-um-segredo-forte"
NODE_ENV="development"
ADMIN_EMAIL="admin@tess.local"
TESS_SYSTEM_PROMPT="Voce e a TESS..."
```

### Variaveis obrigatorias para producao (Hostinger)

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`

## Subindo o banco de dados local (Docker)

Se voce quiser criar o banco de forma rapida para desenvolvimento, use o MySQL via Docker Compose:

```bash
cp .env.example .env
npm run db:up
npx prisma migrate dev --name init
```

Isso cria um container `mysql:8`, inicializa o banco `tess_db` e deixa pronto para o Prisma aplicar as tabelas.

Comandos uteis:

- `npm run db:logs` - acompanha logs do MySQL
- `npm run db:down` - para os containers
- `npm run db:reset` - remove containers e volume (apaga dados locais)

## Como rodar localmente

```bash
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run dev
```

Aplicacao local: `http://localhost:3000`

## Scripts disponiveis

- `npm run dev` - desenvolvimento
- `npm run build` - build de producao
- `npm run start` - start de producao
- `npm run lint` - lint
- `npm run prisma:generate` - gera Prisma Client
- `npm run prisma:migrate` - cria/aplica migration local
- `npm run prisma:deploy` - aplica migrations em producao
- `npm run prisma:studio` - Prisma Studio
- `npm run server:up` - sobe app + MySQL para servidor (Docker)
- `npm run server:down` - derruba stack de servidor
- `npm run server:logs` - logs de app e MySQL
- `npm run server:migrate` - aplica migrations na stack de servidor

## Migracoes Prisma

Desenvolvimento:

```bash
npx prisma migrate dev --name init
```

Producao:

```bash
npx prisma migrate deploy
```

## Seguranca aplicada

- `OPENAI_API_KEY` usada somente no backend (`/app/api/chat/route.ts`)
- senha com hash `bcrypt`
- JWT em cookie `httpOnly`
- validacao de entrada com `zod`
- rate limit in-memory em rotas sensiveis
- sanitizacao basica de entrada

## Streaming do chat

- `/api/chat` retorna stream de texto quando disponivel
- frontend le `ReadableStream` e renderiza tokens em tempo real
- fallback para resposta completa quando stream nao estiver disponivel

## Amostra sem login

- Pagina publica: `/demo`
- Endpoint backend: `POST /api/chat/demo`
- Sem persistencia em banco (sessao local no navegador)
- Rate limit por IP para reduzir abuso

## Como subir no GitHub

```bash
git init
git add .
git commit -m "feat: initial production-ready TESS app"
git branch -M main
git remote add origin https://github.com/andrelealx/tess.git
git push -u origin main
```

## Hospedando tudo em um servidor (front + back + banco)

Se voce quer rodar **tudo no mesmo servidor** (VPS), este projeto agora inclui um `docker-compose.server.yml` para subir:

- `app` (Next.js frontend + backend API)
- `mysql` (banco de dados)

### 1) Preparar o servidor

No Ubuntu/Debian, instale Docker + Compose plugin e abra as portas necessarias:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2) Publicar o projeto no servidor

```bash
git clone <SEU_REPO> tess
cd tess
cp .env.server.example .env.server
```

Edite o `.env.server` com senhas fortes e chaves reais (OpenAI/JWT).

### 3) Subir aplicacao completa

```bash
npm run server:up
```

### 4) Aplicar migrations no banco de producao

```bash
npm run server:migrate
```

### 5) Operacao no dia a dia

- `npm run server:logs` - logs da app e banco
- `npm run server:down` - para os containers

### 6) Dominio e HTTPS (recomendado)

- Aponte o DNS para o IP do servidor.
- Use um proxy reverso (Nginx/Caddy/Traefik) para expor a app na porta 80/443.
- Se usar Cloudflare, mantenha SSL ativo e bloqueie acesso direto desnecessario.

> Fluxo recomendado para atualizacao: `git pull` -> `npm run server:up` -> `npm run server:migrate`.

## Conectar no MySQL da Hostinger (phpMyAdmin)

Se voce vai usar o banco gerenciado da Hostinger (acesso via phpMyAdmin), configure apenas a `DATABASE_URL` com os dados do painel da Hostinger.

Formato:

```env
DATABASE_URL="mysql://USUARIO:SENHA_URL_ENCODED@HOST:3306/NOME_DO_BANCO"
```

Exemplo com os dados que voce informou (senha com `@` deve ser encoded como `%40`):

```env
DATABASE_URL="mysql://u305836601_TESS_KEYDB:SENHA_URL_ENCODED@HOSTINGER_DB_HOST:3306/u305836601_tess_IA"
```

> Troque `HOSTINGER_DB_HOST` pelo host real do MySQL mostrado no painel da Hostinger.

### Passos recomendados

1. Atualize o `.env` local com a `DATABASE_URL` da Hostinger.
2. Gere o client Prisma: `npm run prisma:generate`.
3. Aplique estrutura no banco remoto: `npm run prisma:deploy`.
4. Valide a conexao: acesse `/api/health` com a app em execucao.

### Se der erro de conexao

- Verifique se usuario/senha/host/porta estao corretos no painel da Hostinger.
- Confirme se a senha foi URL-encoded (`@` -> `%40`, `#` -> `%23`, etc.).
- Verifique se o plano/host permite conexao externa ao MySQL.

## Deploy na Hostinger (passo a passo)

1. Crie uma aplicacao em **Web Apps Hosting** (Node.js).
2. Conecte o repositorio GitHub e selecione a branch (`main`).
3. Configure comandos:
   - Install: `npm install`
   - Build: `npm run build`
   - Start: `npm run start`
4. No painel de variaveis de ambiente, configure:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - opcionais: `OPENAI_MODEL`, `ADMIN_EMAIL`, `TESS_SYSTEM_PROMPT`
5. Garanta que o MySQL esteja acessivel externamente para a app.
6. Aplique migrations em producao:
   - via terminal/SSH da Hostinger: `npm run prisma:deploy`
7. Faça o primeiro acesso:
   - `https://SEU_DOMINIO/api/health` deve retornar `status: ok`
8. Cadastre o primeiro usuario admin usando `ADMIN_EMAIL` (ou ajuste role no banco).

## Troubleshooting

- **Erro `JWT_SECRET nao configurado`**
  - Defina `JWT_SECRET` no `.env` local e no painel da Hostinger.

- **Erro de conexao MySQL**
  - Verifique `DATABASE_URL`, host, porta, usuario/senha e whitelist de IP.

- **Build falha por Prisma Client**
  - Rode `npm run prisma:generate` e depois `npm run build`.

- **Falha na OpenAI**
  - Confirme `OPENAI_API_KEY` e modelo configurado em `OPENAI_MODEL`.

- **401/403 em rotas protegidas**
  - Token pode estar expirado; faca logout e login novamente.

## Observacoes

- O rate limit atual e in-memory (simples, MVP). Em escala, substitua por Redis.
- O painel admin foi feito como estrutura inicial de operacao.
