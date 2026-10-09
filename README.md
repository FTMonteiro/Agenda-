# SLOTIX

Plataforma de agendamentos organizada como **monólito modular**: uma única API
central (Node.js + TypeScript + Prisma + PostgreSQL) consumida por uma app Web
(Next.js) e uma app Mobile (Expo + React Native).

```text
SLOTIX/
├── apps/
│   ├── api/       Node.js + TypeScript + Express + Prisma — o núcleo do sistema
│   ├── web/       Next.js — consumidor da API, sem acesso direto à BD
│   └── mobile/    Expo + React Native — consumidor da API, sem acesso direto à BD
└── packages/
    ├── types/       Tipos/DTOs partilhados entre API, Web e Mobile
    └── validation/  Schemas Zod partilhados (contratos de API)
```

## Arquitetura

- **Um único backend**: toda a lógica de negócio, autenticação e acesso a dados
  vive em `apps/api`, organizado em módulos por domínio
  (`auth`, `users`, `businesses`, `clients`, `professionals`, `services`,
  `availability`, `appointments`, `payments`, `notifications`, `favorites`,
  `reviews`, `gallery`, `search`).
- **Frontend nunca acede à base de dados**: Web e Mobile falam apenas com a API
  REST versionada em `/api/v1`.
- **Autenticação centralizada**: JWT (access + refresh) emitido pela API,
  usado por Web e Mobile via header `Authorization: Bearer`.
- Cada módulo completo segue o padrão `*.controller.ts` → `*.service.ts` →
  `*.repository.ts`, com validação Zod em `*.schema.ts`.
- Todos os módulos do plano original estão implementados. O storage de
  imagens (`gallery`) usa Supabase Storage.

## Instalação

Requisitos: Node.js 20+, PostgreSQL, npm (workspaces).

```bash
npm install
cp apps/api/.env.example apps/api/.env      # preencher DATABASE_URL, segredos JWT e (opcional) Supabase
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são opcionais — a API arranca
sem eles, só os endpoints de `/gallery` (upload) precisam.

## Base de dados

```bash
cd apps/api
npx prisma migrate dev     # cria as tabelas
npm run seed                # cria negócio/owner/employee/service de exemplo
```

Contas criadas pelo seed (password `password123`):
`owner@slotix.dev`, `employee@slotix.dev`, `customer@slotix.dev`.

## Desenvolvimento

```bash
npm run dev:api      # Express em http://localhost:3000
npm run dev:web      # Next.js em http://localhost:3001
npm run dev:mobile   # Expo (usa o app Expo Go ou um simulador)
```

## Testes

```bash
npm run test:api
```

Cobre as regras críticas de `auth` (registo duplicado, credenciais inválidas),
`availability`/scheduling (cálculo puro de slots livres, horário de
funcionamento, bloqueios), `appointments` (serviço/profissional inexistente
ou inativo, horário indisponível — incluindo fora de horas e bloqueios —,
permissões, transições de estado), `reviews` (só é possível avaliar um
agendamento próprio e concluído, uma única vez), `favorites` (sem
duplicados), `businesses` (filtros e cálculo de rating/paginação), `users`
(soft delete), `payments` (valor sempre vindo da appointment nunca do
cliente, duplicados, ownership, transições de estado válidas/inválidas) e
`gallery` (tipo de ficheiro, limite de imagens, ownership, falha
best-effort do storage — com o cliente Supabase mockado) e `search`
(correspondência por palavra, `nearest` sem localização, ordenação em
cada modo, paginação).

## API

Respostas de item único:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "APPOINTMENT_NOT_AVAILABLE", "message": "..." } }
```

Respostas de lista (`GET /businesses`) incluem paginação:

```json
{ "success": true, "data": [], "meta": { "page": 1, "limit": 20, "total": 100 } }
```

Rotas principais (ver `apps/api/src/app/routes.ts`):
`/api/v1/auth` (`register`, `login`, `refresh`, `logout`, `me`),
`/api/v1/users` (`me` — GET/PATCH/DELETE, `me/password`),
`/api/v1/businesses` (com filtros
`?category=&search=&minRating=&minPrice=&maxPrice=&latitude=&longitude=&radiusKm=&page=&limit=`,
mais `/:id/services`, `/:id/professionals`, `/:id/reviews`, `/:id/hours` — GET público, PUT do OWNER),
`/api/v1/search?q=...&latitude=&longitude=&sortBy=recommended|nearest|bestPrice|topRated&page=&limit=`
(pesquisa livre — ver secção Search abaixo),
`/api/v1/clients`, `/api/v1/professionals` (mais `/:id/blocks` — folgas/bloqueios,
geridos pelo OWNER ou pelo próprio profissional), `/api/v1/services`,
`/api/v1/availability?businessId=&professionalId=&serviceId=&date=YYYY-MM-DD`
(devolve os horários livres, já a considerar horário de funcionamento,
bloqueios e agendamentos existentes),
`/api/v1/appointments` (mais `/:id/payment` — GET do pagamento da appointment),
`/api/v1/favorites` (`POST/DELETE /:businessId`),
`/api/v1/reviews`, `/api/v1/notifications`,
`/api/v1/payments` (`POST` cria; `GET` lista os próprios ou `?businessId=` para
o OWNER; `GET /:id`; `PATCH /:id/pay`, `/:id/fail`, `/:id/refund` — restritos
ao OWNER do negócio ou a um ADMIN),
`/api/v1/businesses/:businessId/gallery` (`GET` público; `POST` — `multipart/form-data`,
campo `file` + `caption` opcional, OWNER; `DELETE /:id`, OWNER).

`DELETE /users/me` é soft delete (marca `deletedAt`, revoga refresh tokens) —
appointments/reviews/negócios existentes não são apagados nem ficam órfãos.
Um access token já emitido continua válido até expirar (15 min por omissão);
só o login/refresh ficam bloqueados de imediato.

Um negócio sem horário configurado é tratado como aberto todos os dias (para
não quebrar negócios criados antes desta funcionalidade); assim que um dia é
configurado, os restantes dias sem linhas próprias passam a "fechado".
`appointments.create`/`reschedule` usam exatamente o mesmo cálculo de
`shared/utils/scheduling.ts` que `/availability`, por isso um horário aceite
na criação é sempre um que `/availability` já tinha listado como livre.

### Payments

Domínio de pagamentos interno — **sem gateway externo integrado ainda**
(nem Multicaixa Express, nem Stripe, nem cartões reais). Um `Payment` é
1:1 com a `Appointment` (`appointmentId` é único): em vez de criar novas
linhas, o mesmo registo transita entre estados, preservando o histórico.

Estados e transições válidas:

```text
PENDING → PAID
PENDING → FAILED
PAID    → REFUNDED
```

Qualquer outra transição (`PENDING → REFUNDED`, `FAILED → PAID`,
`REFUNDED → *`, etc.) é rejeitada com `PAYMENT_INVALID_STATUS`,
`PAYMENT_ALREADY_PAID` ou `PAYMENT_ALREADY_REFUNDED`. `paidAt` é sempre
gerado pelo backend ao marcar como pago e nunca é apagado num reembolso.

`amount`, `currency`, `userId` e `businessId` vêm sempre da `Appointment`
associada — nunca do corpo do pedido, mesmo que o cliente os envie. A
moeda por omissão é `AOA` (`shared/constants`), não fixa na lógica de
negócio. Só o `OWNER` do negócio (ou um `ADMIN`) pode marcar como
pago/falhado/reembolsado; o cliente só pode criar e consultar os seus
próprios pagamentos. `PaymentPaid`/`PaymentRefunded` disparam notificações
via o mesmo event bus interno usado pelos `appointments`.

### Gallery

Imagens dos espaços, guardadas no **Supabase Storage** (bucket
`SUPABASE_STORAGE_BUCKET`, por omissão `slotix-gallery` — cria o bucket
como público no projeto Supabase antes de usar). O upload é
`multipart/form-data` (via `multer`, buffer em memória — nunca escrito em
disco, porque a API pode correr num filesystem efémero) com um limite de
5MB e apenas JPEG/PNG/WEBP/GIF; cada negócio tem um limite de 20 imagens.
Só o `OWNER` do negócio pode fazer upload/apagar; a listagem é pública.

A base de dados guarda o `url` público e o `path` (a chave no bucket, para
conseguir apagar o ficheiro depois) — nunca o ficheiro em si. Apagar uma
imagem remove primeiro a linha da BD (a fonte de verdade para a UI) e só
depois tenta apagar do storage; se isso falhar, fica só um ficheiro órfão
no bucket, nunca uma linha partida na BD.

Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` configuradas, o resto da
API funciona normalmente e só o upload falha com `500`, sem detalhes de
configuração na resposta (só nos logs do servidor).

### Descoberta e pesquisa (Search)

Um negócio criado via `POST /businesses` fica imediatamente visível pela
mesma API a qualquer consumidor (Web ou Mobile) — não há um passo de
"publicação" separado nem um cadastro/rota diferente para o mobile.
`latitude`/`longitude` já existiam em `Business` desde a Fase 1 e não são
limitadas a Angola (confirmado com um teste real Lisboa↔Luanda, ~5773km).

`GET /search?q=...` combina texto com localização:

- **Correspondência por palavra, não por frase inteira**: `q=cortar cabelo`
  divide em `["cortar", "cabelo"]` e encontra qualquer negócio ou serviço
  ativo cujo nome/descrição/categoria contenha *pelo menos uma* dessas
  palavras — assim "Corte de Cabelo" é encontrado mesmo sem a forma exata
  "cortar" aparecer no texto. Sem motor de pesquisa nem extensão
  PostgreSQL nova, só `contains` do Prisma.
- **`matchedService`**: cada resultado traz o serviço mais relevante do
  negócio (o que tem mais palavras da pesquisa em comum; empate resolvido
  pelo mais barato), com nome e preço — ex. `{"name":"Corte Premium","price":12000}`.
- **`distanceKm`**: calculado com Haversine simples (sem PostGIS) só
  quando `latitude`/`longitude` são passadas no pedido — nunca guardadas,
  a localização do utilizador só é usada nesse pedido.
- **`sortBy`** tem 4 modos previsíveis, cada um a ordenar por exatamente
  uma dimensão (só `recommended` combina sinais, com critérios de
  desempate claros):
  - `recommended` (omissão): rating ponderado → distância → nº de reviews.
  - `nearest`: distância ascendente — exige `latitude`+`longitude`
    (`400 SEARCH_LOCATION_REQUIRED` se faltarem).
  - `bestPrice`: preço do `matchedService` ascendente.
  - `topRated`: rating ponderado descendente.
- **Rating ponderado** (`shared/utils/ranking.ts`): uma única avaliação de
  5 estrelas não ultrapassa um negócio com centenas de avaliações
  consistentes de 4.6 — a média é "encolhida" para um prior neutro (3.5)
  até haver reviews suficientes para confiar nela. Isto só afeta a
  *ordenação*; o `ratingAvg`/`ratingCount` mostrados ao utilizador
  continuam a ser a média real, exatamente como antes. O módulo `reviews`
  em si não foi alterado.

`GET /businesses` ganhou os mesmos `latitude`/`longitude`/`radiusKm`
opcionais (para o ecrã de "explorar", sem termo de pesquisa) — a ordem por
omissão (mais recentes primeiro) não mudou; só passa a incluir
`distanceKm` e, com `radiusKm`, filtra o que estiver fora do raio.

A pesquisa/descoberta não recalcula disponibilidade: `matchedService`
mostra o preço, mas confirmar um horário continua a ser exclusivamente
`GET /availability` + `POST /appointments`, tal como já existiam — a
Fase de pesquisa foi verificada em ponta-a-ponta ao vivo exatamente
por este caminho (criar negócio → aparece na pesquisa → `/availability`
→ `/appointments`, sem tocar em nenhum dos dois módulos).

## Deployment

Ainda não configurado nesta fase (ver plano de migração para as fases seguintes).
