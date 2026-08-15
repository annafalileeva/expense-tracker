# База данных

PostgreSQL 17 (Docker, `docker-compose.yml`), схема и миграции — в
`packages/database/prisma/`. Единственная миграция на данный момент:
`20260803055230_init_auth`.

Модели описаны в `packages/database/prisma/schema.prisma`. Комментарий в
начале файла фиксирует явную границу текущей предметной области: это
стартовый набор моделей, бюджеты/повторяющиеся траты/теги — отдельная
будущая задача, их в схеме нет.

## ER-диаграмма

```
User (users)
 │ 1
 │
 ├──── * Category (categories)   [User.id = Category.userId, ON DELETE CASCADE]
 │
 └──── * Expense (expenses)      [User.id = Expense.userId, ON DELETE CASCADE]

Category (categories) ──── * Expense (expenses)
                             [Category.id = Expense.categoryId, ON DELETE SET NULL, опционально]
```

- `User → Category`: один-ко-многим, обязательная связь. Удаление
  пользователя каскадно удаляет все его категории.
- `User → Expense`: один-ко-многим, обязательная связь. Удаление
  пользователя каскадно удаляет все его расходы.
- `Category → Expense`: один-ко-многим, **опциональная** связь
  (`categoryId` nullable). Удаление категории не удаляет расходы — у них
  `categoryId` становится `NULL` (`ON DELETE SET NULL`).

## `users`

| Колонка | Тип | Назначение |
| --- | --- | --- |
| `id` | `TEXT` (UUID) | первичный ключ, `default(uuid())` |
| `email` | `TEXT` | уникальный (`@unique` → `users_email_key`), логин |
| `name` | `TEXT` | отображаемое имя |
| `passwordHash` | `TEXT` | bcrypt-хеш пароля (cost 12). Никогда не покидает `apps/api`'s `users`/`auth` модули как есть — на HTTP-границе доступен только `UserView` (без этого поля), см. `user.mapper.ts` |
| `createdAt` | `TIMESTAMP(3)` | `default(now())` |
| `updatedAt` | `TIMESTAMP(3)` | `@updatedAt`, обновляется Prisma автоматически при каждом `update` |

Индексы: уникальный по `email`.

## `categories`

| Колонка | Тип | Назначение |
| --- | --- | --- |
| `id` | `TEXT` (UUID) | первичный ключ |
| `name` | `TEXT` | название категории |
| `color` | `TEXT?` | hex-цвет для UI, например `#7C3AED` |
| `icon` | `TEXT?` | имя иконки |
| `createdAt` / `updatedAt` | `TIMESTAMP(3)` | как у `users` |
| `userId` | `TEXT` | FK → `users.id`, `ON DELETE CASCADE` |

Индексы/ограничения:
- `@@unique([userId, name])` — имя категории уникально **в пределах
  пользователя** (у разных пользователей могут быть одноимённые категории).
- `@@index([userId])` — под выборку категорий конкретного пользователя.

## `expenses`

| Колонка | Тип | Назначение |
| --- | --- | --- |
| `id` | `TEXT` (UUID) | первичный ключ |
| `amount` | `DECIMAL(12,2)` | сумма расхода. **Не `Float`** — с деньгами плавающая точка недопустима. По HTTP сериализуется в строку (см. `apps/web`'s `ExpenseDto`) |
| `currency` | `CHAR(3)` | код валюты ISO 4217, по умолчанию `'RUB'` |
| `note` | `TEXT?` | произвольный комментарий, ≤500 символов на уровне DTO |
| `spentAt` | `TIMESTAMP(3)` | дата/время самой траты (не создания записи) |
| `createdAt` / `updatedAt` | `TIMESTAMP(3)` | как у `users` |
| `userId` | `TEXT` | FK → `users.id`, `ON DELETE CASCADE` |
| `categoryId` | `TEXT?` | FK → `categories.id`, `ON DELETE SET NULL`, опционально |

Индексы:
- `@@index([userId, spentAt])` — основной сценарий чтения: "траты
  пользователя за период". На него опирается `ListExpensesHandler`
  (фильтр по `from`/`to` через `spentAt`).
- `@@index([categoryId])` — под фильтр/джойн по категории.

## Как читать миграции

`packages/database/prisma/migrations/<timestamp>_<name>/migration.sql` —
это применённый к БД raw SQL, автоматически сгенерированный из diff'а
схемы Prisma (`prisma migrate dev`). Файл не редактируется руками задним
числом — если нужно изменить уже применённую миграцию, создаётся новая.
`migration_lock.toml` фиксирует провайдера (`postgresql`), чтобы Prisma не
дала смешать провайдеров в одной истории миграций.

Порядок применения — по имени папки (timestamp в начале), Prisma хранит
факт применения каждой миграции в служебной таблице `_prisma_migrations`
внутри той же БД.

## Как подключаться / исследовать данные

```bash
npm run db:up        # поднять Postgres в Docker (docker-compose.yml)
npm run db:migrate   # prisma migrate dev + generate client
npm run db:studio    # Prisma Studio — GUI поверх текущей схемы/данных
```

Строка подключения — `DATABASE_URL` в корневом `.env` (см.
`.env.example`): `postgresql://postgres:postgres@localhost:5432/expence_tracker?schema=public`
по умолчанию для локальной разработки.

## Специфика Prisma 7 в этом репозитории

- Генератор — `prisma-client` (не `prisma-client-js`), `output` обязателен
  и указывает в `packages/database/src/generated/prisma/` (в `.gitignore`,
  генерируется `prisma generate`/`db:generate`).
- Prisma 7 не подхватывает `.env` автоматически. `packages/database/prisma.config.ts`
  явно грузит **корневой** `.env` через `dotenv` (CLI Prisma запускается из
  `packages/database`, а `.env` лежит в корне монорепозитория).
- Строка подключения задаётся **только** в `prisma.config.ts` — Prisma
  7.9.1 не даёт указать `url` в блоке `datasource` схемы одновременно с
  этим (падает с ошибкой), поэтому в `schema.prisma` у `datasource db`
  указан только `provider`.
- `packages/database/src/index.ts` — единственная точка входа пакета
  наружу: реэкспортирует `PrismaClient`, `Prisma` (неймспейс с типами
  вроде `Prisma.PrismaClientKnownRequestError`) и типы моделей (`User`,
  `Category`, `Expense`). Другие пакеты импортируют схему только отсюда,
  не из `src/generated/prisma/` напрямую.
