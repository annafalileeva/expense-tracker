# Архитектура

## Обзор

Трекер расходов — npm-workspaces монорепозиторий из трёх пакетов:

```
apps/api/        Nest.js REST API (порт 3001, префикс /api)
apps/web/        Next.js App Router UI (порт 3000)
packages/database/    Prisma-схема, миграции, сгенерированный клиент
packages/eslint-config/  общий flat-конфиг ESLint (base / next / nest варианты)
```

`packages/database` — единственный пакет, который знает о PostgreSQL.
`apps/api` — единственный, кто напрямую обращается к Prisma. `apps/web`
никогда не говорит с базой данных напрямую: любое чтение/запись идёт через
REST API. Из `@expence-tracker/database` фронтенд импортирует только типы.

```
┌─────────────┐      REST /api/*      ┌─────────────┐      Prisma       ┌──────────────┐
│  apps/web    │ ───────────────────▶ │  apps/api    │ ─────────────────▶ │ PostgreSQL   │
│  (Next.js)   │ ◀─────────────────── │  (Nest.js)   │ ◀───────────────── │ (Docker)     │
└─────────────┘   JSON, JWT в header  └─────────────┘                    └──────────────┘
       ▲                                     ▲
       │ типы (User/Category/Expense)        │ Prisma Client
       └─────────────── packages/database ───┘
```

## apps/api — Nest.js, CQRS без сервисного слоя

Организация — по фиче, а не по слою. У каждого модуля своя папка в
`src/modules/<feature>/`:

```
modules/<feature>/
  commands/
    <x>.command.ts      # только поля + конструктор (или extends Command<TResult>)
    <x>.handler.ts       # @CommandHandler, бизнес-логика, PrismaService напрямую
    index.ts              # export * (только классы команд) + <Feature>CommandHandlers
  queries/                # то же самое: @QueryHandler / QueryHandlers
  dto/                     # class-validator DTO для HTTP
  <feature>.controller.ts   # инжектит только CommandBus/QueryBus, без PrismaService
  <feature>.module.ts       # imports: [CqrsModule], providers: [...CommandHandlers, ...QueryHandlers]
```

Никакого промежуточного service-слоя: контроллер публикует команду/запрос в
шину (`@nestjs/cqrs`), а вся логика и обращения к Prisma живут в
хендлерах.

### Модули

| Модуль | Назначение |
| --- | --- |
| `modules/health` | `GET /health` — публичный healthcheck (пингует БД) |
| `modules/auth` | регистрация, логин, выдача JWT, `GET /auth/me` |
| `modules/users` | `/users/me` — чтение/обновление/удаление своего профиля |
| `modules/categories` | CRUD категорий расходов, скоуплен по пользователю |
| `modules/expenses` | CRUD расходов с фильтрами и пагинацией, скоуплен по пользователю |

### Правило границы между модулями

Модуль может импортировать из `commands/index.ts` или `queries/index.ts`
другой фичи **только классы команд/запросов и их result-типы** — например,
`auth` импортирует `GetUserByEmailQuery` и тип `UserView` из
`modules/users/queries`. Импортировать хендлер, массив
`<Feature>CommandHandlers` или `PrismaService` из чужого модуля — нарушение
конвенции: ничто в типах этого не запрещает, но `AuthModule` никогда не
перечисляет `UsersModule` в своих `imports` и общается с `users`
исключительно через `CommandBus`/`QueryBus`. Каждый модуль явно
импортирует `CqrsModule` — в `@nestjs/cqrs` v11 он не глобальный.

### Сквозные механизмы (`src/common/`, `src/prisma/`)

- **`PrismaModule`/`PrismaService`** (`src/prisma/`) — глобальный модуль,
  подключение к БД поднимается в `onModuleInit`.
- **`PrismaExceptionFilter`** (`src/common/filters/`) — переводит коды
  ошибок Prisma в HTTP-статусы: `P2002` → 409 (Conflict), `P2025` → 404
  (Not Found), `P2003` → 400 (Bad Request), остальное → 500. Хендлеры не
  ловят ошибки Prisma сами — рассчитывают на этот фильтр (см., например,
  `UpdateExpenseHandler`: `update({ where: { id, userId } })` на чужом
  `id` даёт `P2025` → фильтр превращает в 404).
- **Глобальный `ValidationPipe`** — `whitelist: true, forbidNonWhitelisted:
  true, transform: true`. DTO — обязательный контракт: неизвестные поля тела
  запроса отклоняются (400), а не отбрасываются молча.
- **`@Public()`** (`src/common/decorators/public.decorator.ts`) — снимает
  требование JWT с роута/контроллера. Используется на `HealthController`,
  `POST /auth/register`, `POST /auth/login`.
- **`@CurrentUser()`** (`src/common/decorators/current-user.decorator.ts`) —
  достаёт `UserView`, которую `JwtStrategy` положил в `request.user`; тип
  описан глобально в `src/types/express.d.ts`.
- **`PaginationQueryDto`** (`src/common/dto/pagination-query.dto.ts`) —
  базовый класс для query-DTO списков (`page`/`limit` + геттеры
  `skip`/`take`); наследуется, например, `QueryExpensesDto`.
- Глобальный префикс `api` задаётся один раз в `main.ts` — контроллеры его
  не повторяют (`@Controller('expenses')`, не `@Controller('api/expenses')`).
- CORS origin берётся из конфига (`WEB_ORIGIN`), не хардкодится.
- `LoggingInterceptor` (`src/common/interceptors/`) — глобальный интерцептор
  логирования запросов.
- Swagger поднимается на `/api/docs`, конфигурируется в `main.ts`
  (`DocumentBuilder` + `addBearerAuth()`).

### Аутентификация

`modules/auth` выдаёт JWT (`TokenService.sign()`, payload = `{ sub, email }`,
подпись через `@nestjs/jwt`) и регистрирует глобальный guard:
`{ provide: APP_GUARD, useClass: JwtAuthGuard }` в `AuthModule`. По
умолчанию **каждый** роут требует `Authorization: Bearer <token>`; отказ —
через `@Public()`.

- `JwtStrategy` (`modules/auth/strategies/jwt.strategy.ts`) валидирует токен
  и через `GetUserByIdQuery` подгружает актуального пользователя — не
  доверяет данным из самого JWT-payload, кроме `sub`.
- `RegisterHandler`: проверяет уникальность email через
  `GetUserByEmailQuery`, хеширует пароль bcrypt (cost 12), создаёт
  пользователя через `CreateUserCommand`, подписывает токен.
- `LoginHandler`: сверяет bcrypt-хеш; если пользователь не найден,
  всё равно выполняет `bcrypt.compare` против фиктивного хеша
  (`DUMMY_HASH`) — иначе ветка "email не найден" была бы заметно быстрее
  ветки "пароль не совпал" и позволяла бы перебором узнавать
  зарегистрированные email (timing attack).
- `userId` никогда не приходит в теле запроса. `CreateExpenseDto` и
  `CreateCategoryDto` не имеют поля `userId` — контроллеры берут его из
  `@CurrentUser()` и передают в команду. Хендлеры `categories`/`expenses`
  фильтруют каждое чтение/обновление/удаление по `{ id, userId }`
  (не по одному `id`) — так чужой ресурс не читается и не меняется.

### `modules/users`

Единственные роуты — `/users/me` (`GET`/`PATCH`/`DELETE`); нет
`GET /users` или `POST /users` (пользователей создаёт только
`POST /auth/register`). `user.mapper.ts` разделяет два представления:
`UserView` (публичное, без `passwordHash`) и `UserWithCredentials`
(для сверки пароля внутри `auth`/`users`, наружу через HTTP никогда не
уходит).

## packages/database — Prisma 7

- Генератор — `prisma-client` (новый), не устаревший
  `prisma-client-js`; `output` указывает в `src/generated/prisma/`
  (в `.gitignore`, генерируется `prisma generate`).
- Prisma 7 не подхватывает `.env` автоматически: `prisma.config.ts` явно
  грузит корневой `.env` через `dotenv` (CLI запускается из
  `packages/database`, а файл лежит в корне монорепо). Строка подключения
  настраивается только в `prisma.config.ts` — не дублируется в
  `datasource.url` схемы.
- `src/index.ts` реэкспортирует `PrismaClient`, `Prisma` и типы моделей
  (`User`, `Category`, `Expense`) — это единственный публичный API пакета.
- Модели: `User → Category → Expense`, оба направления один-ко-многим.
  Подробности схемы — в `database.md`.

## apps/web — Next.js App Router, Feature-Sliced Design

`src/` организован в слоях FSD, каждый слой импортирует только из слоёв
ниже себя (никогда не вбок между срезами одного слоя, никогда вверх):

```
app/       Next.js-роутинг (route groups, page.tsx, layout.tsx, proxy.ts)
views/     сборка страницы — одна на маршрут, компонует widgets/features/entities
widgets/   самодостаточные UI-блоки (sidebar, header, dashboard-summary, category-breakdown, pagination, user-profile)
features/  пользовательские сценарии (auth/{login,register,logout}, expense/{manage-expense,filter-expenses}, category/{manage-category,delete-category})
entities/  бизнес-сущности (session, user, expense, category) — типы + API-вызовы + display-only UI
shared/    ui (shadcn/ui), api (обёртки fetch), lib, config — без бизнес-логики
```

- `src/app` — одновременно директория роутинга Next.js и FSD-слой `app`
  (корневой layout, `globals.css`, `proxy.ts`). FSD-слой `pages` здесь
  называется **`views`**, а не `pages` — это имя занято (legacy) Pages
  Router Next.js. Файлы `page.tsx` под `app/**` — тонкие реэкспорты
  композиции из `views/<name>`, например
  `export { DashboardPage as default } from '@/views/dashboard';`.
  Параметры маршрута (`expenses/[id]/edit`) дожидаются в
  `app/**/page.tsx` и передаются вниз пропсами — у `views/*` нет доступа
  к routing-контексту Next.js.
- У каждого среза (папка прямо под `entities/`, `features/<domain>/` или
  `views/`) есть публичный API через собственный `index.ts`; импортировать
  из других срезов нужно через этот `index.ts`, а не напрямую в
  `ui/`/`api/`/`model/`. `widgets/*` и `shared/*` следуют той же
  конвенции. Единственное сознательное исключение — `proxy.ts` импортирует
  `entities/session/lib/decode-jwt` напрямую, а не через баррель
  `entities/session`, потому что баррель тянет `lib/cookie.ts` с
  директивой `server-only`, не предназначенной для edge-рантайма.
- Правило слоёв нигде не закреплено плагином ESLint (репозиторий
  сознательно не тянет лишние зависимости) — соблюдается по конвенции:
  новая бизнес-сущность → `entities/<name>`, новый пользовательский сценарий
  → `features/<domain>/<action>`, новая страница → `views/<name>` +
  соответствующий `app/**/page.tsx`.
- Route group `(dashboard)` оборачивает все защищённые страницы (дашборд,
  расходы, категории, настройки) общим layout с сайдбаром;
  `(dashboard)/layout.tsx` — асинхронный Server Component, вызывает
  `entities/session`'s `getCurrentUser()`. Route group `(auth)` оборачивает
  `/login` и `/register` layout'ом с центрированной карточкой, без
  сайдбара.

### Аутентификация (фронтенд)

`entities/session` владеет JWT:
- `api/auth.api.ts` — `loginRequest`/`registerRequest`, бьют в публичные
  `/auth/*` эндпоинты через голый `shared/api/client.ts`, без токена.
- `lib/cookie.ts` — `setSessionCookie`/`clearSessionCookie`, httpOnly +
  `sameSite: lax`, `maxAge` совпадает с `JWT_EXPIRES_IN`.
- `lib/decode-jwt.ts` — декодирует payload JWT на клиенте, чтобы прочитать
  `exp`; подпись **не проверяет** — это задача API.
- `api/get-current-user.ts` — `GET /auth/me`.

`features/auth/{login,register,logout}` — Server Actions (`'use server'`),
у каждой zod-схема в `model/schema.ts`, зеркалящая правила валидации DTO
бэкенда, и `'use client'`-форма на React 19 `useActionState`/
`useFormStatus` (без react-hook-form, без shadcn `form`). `redirect()`
всегда вызывается вне `try/catch` (иначе control-flow-исключение
проглотится catch-блоком). Поле `confirmPassword` при регистрации —
client-only валидация, перед вызовом API вырезается (глобальный
`ValidationPipe` с `forbidNonWhitelisted: true` вернёт 400 на лишнее поле).

`proxy.ts` редиректит только по наличию cookie и `exp` (без проверки
подписи — она требует секрета API) — это быстрый UX-редирект, не граница
безопасности. Реальная граница — `JwtAuthGuard` API;
`shared/api/server.ts`'s `serverApiFetch` ловит 401 с любого
аутентифицированного вызова и редиректит на `/login`, покрывая
отозванные/невалидные токены, прошедшие дешёвую проверку middleware.

### Поток данных

- **Чтение** — в Server Components через `entities/*/api/*`, которые
  используют `shared/api/server.ts`'s `serverApiFetch` (`import 'server-only'`
  обёртка над `shared/api/client.ts`, читает cookie и добавляет
  `Authorization: Bearer <token>`).
- **Запись** — через Server Actions в `features/*/api/*.action.ts`,
  вызывающие `shared/api/client.ts` или `entities/*/api/*` напрямую, затем
  `revalidatePath`.
- `"use client"` — только для интерактивных листьев (формы, фильтры,
  навигационные ссылки): `features/expense/manage-expense/ui/expense-form.tsx`,
  `features/expense/filter-expenses/ui/expense-filters.tsx`,
  `widgets/sidebar/ui/nav-link.tsx`.
- `shared/api/client.ts` — единственная fetch-обёртка (базовый URL из
  `NEXT_PUBLIC_API_URL`, JSON body, типизированный `ApiError` на не-2xx,
  опциональный `token` для заголовка `Authorization`). Новые вызовы API
  оформляются в `entities/<feature>/api/<feature>.api.ts`, не ad-hoc
  `fetch()`.

### UI

Компоненты — из shadcn/ui, устанавливаются в `shared/ui/*`
(`components.json`'s `aliases` указывают `ui`/`components`/`lib`/`utils` на
`@/shared/*`). `shared/lib/cn.ts` — `clsx` + `tailwind-merge`. Два
компонента (`shared/ui/select.tsx`, `shared/ui/table.tsx`) написаны вручную
(нет shadcn-эквивалента); новые примитивы — через
`npx shadcn@latest add <name>` из `apps/web`.

Tailwind v4 без `tailwind.config.js` — токены определены в
`src/app/globals.css` через `@theme inline`, плюс два прикладных токена
`--color-expense`/`--color-income`. Тёмная тема — по
`prefers-color-scheme` (переключателя пока нет), плюс `.dark`-вариант через
`@custom-variant dark` на будущее.

`next.config.ts` включает `transpilePackages: ['@expence-tracker/database']`
— этот workspace-пакет отдаёт TS-исходники, а не собранный бандл.

## Ключевые сквозные паттерны

- **Деньги.** `Expense.amount` — `Decimal(12,2)` в Prisma (никогда не
  `Float`), по HTTP сериализуется в **строку** — см. `ExpenseDto` на
  фронтенде, которая расходится с сырым Prisma-типом `Expense` именно
  из-за этого. Путь чтения/записи денежных значений на фронтенде идёт
  через `formatMoney()` (`apps/web/src/shared/lib/format.ts`), не через
  `Number()`/шаблонные строки напрямую.
- **Изоляция по пользователю.** Любой доступ к `Category`/`Expense`
  фильтруется по `userId` из JWT, а не только по `id` — паттерн
  `findFirst/update/delete({ where: { id, userId } })` намеренно не
  заменяется на lookup по одному `id`.
- **Пагинация.** Общая форма ответа — `PaginatedResult<T>`
  (`items`/`total`/`page`/`limit`), см. `src/common/dto/paginated-result.ts`.
  У расходов пагинация полноценная (используется в списке); у категорий
  контроллер сейчас возвращает просто массив, хотя и принимает
  `page`/`limit` через `PaginationQueryDto`.
