## Architecture
### packages/database (Prisma 7 specifics)

- Generator is `prisma-client` (the new one), not the deprecated
  `prisma-client-js`. `output` is required and points into
  `src/generated/prisma/` (gitignored, produced by `prisma generate`).
- Prisma 7 does **not** auto-load `.env`. `prisma.config.ts` explicitly loads
  the root-level `.env` (not a local one) via `dotenv`, since the CLI runs
  from `packages/database` but the env file lives at the repo root. The
  installed Prisma version (7.9.1) also rejects a `url` in the
  `datasource` block of `schema.prisma` when `prisma.config.ts` already
  supplies one — the connection string is configured in exactly one place
  (`prisma.config.ts`), not both.
- `src/index.ts` re-exports `PrismaClient`, `Prisma`, and model types
  (`User`, `Category`, `Expense`) — this is the package's only public API.
- Models: `User` → `Category` → `Expense`, one-to-many both ways.
  `User.passwordHash` is a bcrypt hash and **never** leaves `apps/api`'s
  `users` module as-is — see the CQRS boundary rule under "apps/api
  (Nest.js)" below. `apps/web/src/entities/user/model/types.ts` does not
  re-export the raw Prisma `User` type for this reason; it defines `UserDto`
  (`Omit<User, 'passwordHash' | ...>`) instead, mirroring
  `entities/expense/model/types.ts`'s `ExpenseDto` and
  `entities/category/model/types.ts`'s `CategoryDto`. `Expense.amount` is
  `Decimal(12,2)` (never `Float`, for correctness with money) and is
  serialized as a **string** over HTTP/JSON — see `ExpenseDto`, which
  diverges from the raw Prisma `Expense` type for this reason. Read/write
  path for money values must go through `formatMoney()`
  (`apps/web/src/shared/lib/format.ts`), not `Number()`/template literals
  directly.
- Primary query pattern is "user's expenses in a date range" — backed by the
  `@@index([userId, spentAt])` index on `Expense`.

### apps/api (Nest.js)

Organized by feature, not by layer: `src/modules/<feature>/` contains its own
controller/DTOs and a `commands/` + `queries/` pair (CQRS via `@nestjs/cqrs`
— there is no service layer). Cross-cutting code lives in `src/common/`
(exception filter, logging interceptor, `PaginationQueryDto` base class,
`@Public()`/`@CurrentUser()` decorators) and `src/prisma/` (global
`PrismaModule`/`PrismaService`, connects on `onModuleInit`).

A module may **only** import, from another feature's `commands/index.ts` or
`queries/index.ts`, the command/query classes and their result types (e.g.
`auth` imports `GetUserByEmailQuery` and the `UserView` type from
`modules/users/queries`). Importing a handler, a `<Feature>CommandHandlers`
array, or `PrismaService` from another module is against the convention —
even though nothing in the type system stops it, `AuthModule` never lists
`UsersModule` in its `imports`, and talks to `users` exclusively through
`CommandBus`/`QueryBus`. `CqrsModule` is not global in `@nestjs/cqrs` v11,
so every feature module imports it explicitly.

- `PrismaExceptionFilter` (`src/common/filters/`) translates Prisma error
  codes to HTTP status: P2002 → 409, P2025 → 404, P2003 → 400. Command/query
  handlers that can hit unique constraints or FK violations rely on this
  filter rather than catching Prisma errors themselves.
- Global `ValidationPipe` runs with `whitelist: true, forbidNonWhitelisted:
  true, transform: true` — DTOs are the enforced contract; unlisted body
  fields are rejected, not silently dropped.
- Global prefix is `api`, set in `main.ts` — route paths in controllers
  (`@Controller('expenses')`) don't repeat it.
- CORS origin comes from config (`WEB_ORIGIN` env var), not hardcoded.
- **Auth.** `modules/auth` issues JWTs (`POST /auth/register`,
  `POST /auth/login`) and registers a global guard: `{ provide: APP_GUARD,
  useClass: JwtAuthGuard }` in `AuthModule`. Every route requires a valid
  `Authorization: Bearer <token>` header by default; opt out per-route or
  per-controller with `@Public()` (`src/common/decorators/public.decorator.ts`
  — used on `HealthController` and the register/login endpoints).
  `@CurrentUser()` (`src/common/decorators/current-user.decorator.ts`) reads
  the `UserView` that `JwtStrategy` (`modules/auth/strategies/`) put on
  `request.user`; its shape is declared globally in
  `src/types/express.d.ts`.
- `userId` no longer comes from the request body — `CreateExpenseDto` and
  `CreateCategoryDto` have no `userId` field. Controllers pull it from
  `@CurrentUser()` and pass it into the command; `categories`/`expenses`
  handlers filter every read/update/delete by `{ id, userId }` (or
  `findFirst`/`findMany` with `userId` in `where`), not by `id` alone —
  don't reintroduce an `id`-only lookup, it reopens cross-user access.
- `modules/users` exposes only `/users/me` (`GET`/`PATCH`/`DELETE`) — there
  is no `GET /users` or `POST /users` (`POST /auth/register` creates users).
  It returns `UserView` (`id`, `email`, `name`, timestamps) via
  `user.mapper.ts`'s `toUserView()`; `passwordHash` never leaves the mapper's
  `UserWithCredentials` shape, which itself never leaves
  `modules/users`/`modules/auth`.
- `PartialType`/`OmitType` from `@nestjs/mapped-types` build Update DTOs from
  Create DTOs where the two still diverge; `UpdateCategoryDto`/
  `UpdateExpenseDto` are now plain `PartialType(CreateCategoryDto)` /
  `PartialType(CreateExpenseDto)` since `userId` isn't in the Create DTOs
  anymore and there's nothing left to `OmitType`.

## Документация
После изменения методов — обновляй JSDoc.
Для DTO и контроллеров — добавляй/обновляй Swagger декораторы.