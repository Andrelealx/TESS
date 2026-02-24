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
