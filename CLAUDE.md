# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The API has authentication: `POST /api/auth/register`, `POST /api/auth/login`
issue a JWT; every other route requires `Authorization: Bearer <token>` via a
global `JwtAuthGuard`, except routes marked `@Public()` (`/api/health`,
`/api/auth/register`, `/api/auth/login`). All of `apps/api` is built on CQRS
(`@nestjs/cqrs`) — see "apps/api (Nest.js)" below for the module layout and
the cross-module boundary rule.

`apps/web` is organized with Feature-Sliced Design (FSD) — see "apps/web
(Next.js App Router + Feature-Sliced Design)" below. Login and registration
are implemented end to end: `features/auth/{login,register,logout}` are
Server Actions that call the API and store the JWT in an httpOnly cookie
(`entities/session`), `proxy.ts` redirects unauthenticated requests to
`/login`, and `(dashboard)/layout.tsx` reads the current user via
`GET /auth/me`. The data-fetching pages under `views/{expenses,categories,
dashboard}` are still stubs with TODO comments — listing/creating expenses
and categories isn't wired up yet, only auth is. UI components come from
shadcn/ui (`shared/ui/*`), not hand-rolled primitives.

## Commands

Run from the repo root (npm workspaces monorepo):

```bash
npm install
cp .env.example .env
npm run db:up            # start PostgreSQL in Docker
npm run db:migrate       # prisma migrate dev + generate client
npm run dev              # runs api (:3001) and web (:3000) concurrently
```

| Command | Effect |
| --- | --- |
| `npm run dev` | api + web in watch mode (via `concurrently`) |
| `npm run build` | builds `database` → `api` → `web`, in that order (order matters: api/web depend on the generated Prisma client) |
| `npm run lint` | ESLint across all workspaces |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run format` / `format:check` | Prettier |
| `npm run db:up` / `db:down` | start/stop Postgres container |
| `npm run db:migrate` | `prisma migrate dev` (packages/database) |
| `npm run db:generate` | regenerate Prisma Client after schema changes |
| `npm run db:studio` | Prisma Studio |

Single-workspace commands: `npm run <script> -w @expence-tracker/api` (or
`web`, `database`). Nest e2e tests: `npm run test:e2e -w @expence-tracker/api`
(requires the DB running — hits a real Postgres via Prisma). Unit tests:
`npm run test -w @expence-tracker/api`; a single file:
`npm run test -w @expence-tracker/api -- login.handler.spec.ts`.

## Architecture

npm workspaces monorepo: `apps/*` (deployables) + `packages/*` (shared code).

```
apps/api/        Nest.js REST API (port 3001, prefix /api)
apps/web/        Next.js App Router UI (port 3000)
packages/database/    Prisma schema, migrations, generated client — the only package that knows about PostgreSQL
packages/eslint-config/  shared flat ESLint config (base / next / nest variants)
```

**Data flow contract: the frontend never talks to the database directly.**
`apps/web` imports only *types* from `@expence-tracker/database`; all reads
and writes go through the Nest API (`apps/web/src/shared/api/*` and
`apps/web/src/entities/*/api/*`). This is intentional and should not be
worked around by importing `PrismaClient` into web code.

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

**CQRS module layout and boundary rule.** Each feature module follows:

```
modules/<feature>/
  commands/
    <x>.command.ts     // plain class (or extends Command<TResult>): fields + constructor only
    <x>.handler.ts      // @CommandHandler, business logic, PrismaService injected directly
    index.ts             // export * (command classes only) + export const <Feature>CommandHandlers
  queries/               // same shape, @QueryHandler / QueryHandlers
  dto/                    // class-validator HTTP DTOs, as before
  <feature>.controller.ts  // injects CommandBus/QueryBus only, no PrismaService
  <feature>.module.ts      // imports: [CqrsModule], providers: [...CommandHandlers, ...QueryHandlers]
```

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

### apps/web (Next.js App Router + Feature-Sliced Design)

`src/` is organized in FSD layers, each importing only from layers below it
(never sideways between slices of the same layer, never upward):

```
app/       Next.js routing (route groups, page.tsx, layout.tsx, proxy.ts)
views/     page compositions — one per route, assembles widgets/features/entities
widgets/   self-contained UI blocks (sidebar, header, dashboard-summary, category-breakdown)
features/  user-triggered scenarios (auth/login, auth/register, auth/logout, expense/manage-expense, expense/filter-expenses)
entities/  business entities (session, user, expense, category) — types + API calls + display-only UI
shared/    ui (shadcn/ui components), api (fetch wrappers), lib, config — no business logic
```

- `src/app` is simultaneously the Next.js routing directory *and* the FSD
  `app` layer (root layout, `globals.css`, `proxy.ts`). The FSD `pages`
  layer is named **`views`** here, not `pages` — that name is reserved by
  Next.js's (legacy) Pages Router and would be confusing. `page.tsx` files
  under `app/**` are thin re-exports of a `views/<name>` composition (e.g.
  `app/(dashboard)/page.tsx` just does
  `export { DashboardPage as default } from '@/views/dashboard';`); route
  params that a page needs (like `expenses/[id]/edit`) are awaited in the
  `app/**/page.tsx` file and passed down as props, since `views/*` has no
  access to Next's routing context.
- Each slice (a folder directly under `entities/`, `features/<domain>/`, or
  `views/`) exposes a public API via its own `index.ts`; import from other
  slices through that `index.ts`, not by reaching into `ui/`/`api/`/`model/`
  subfolders directly. `widgets/*` and `shared/*` follow the same
  `index.ts`-per-folder convention. The one deliberate exception:
  `proxy.ts` imports `entities/session/lib/decode-jwt` directly instead
  of the `entities/session` barrel, because the barrel re-exports
  `lib/cookie.ts`, which has a `server-only` guard that isn't meant for the
  edge middleware runtime.
- No ESLint boundaries plugin enforces the layer rule (kept dependency-light
  per this repo's convention) — follow it by convention; new code goes in
  the layer matching what it does: new business entity → `entities/<name>`,
  new user-triggered action → `features/<domain>/<action>`, new page →
  `views/<name>` + a matching `app/**/page.tsx`.
- Route group `(dashboard)` wraps all authenticated pages (dashboard,
  expenses, categories, settings) with a shared sidebar layout (no URL
  segment); `(dashboard)/layout.tsx` is an async Server Component that calls
  `entities/session`'s `getCurrentUser()` and passes the name into
  `widgets/sidebar`. Route group `(auth)` wraps `/login` and `/register`
  with a centered-card layout, no sidebar.
- **Auth (frontend).** `entities/session` owns the JWT: `api/auth.api.ts`
  (`loginRequest`/`registerRequest`, hit the public `/auth/*` endpoints with
  the plain `shared/api/client.ts`, no token), `lib/cookie.ts`
  (`setSessionCookie`/`clearSessionCookie`, httpOnly + `sameSite: lax`,
  `maxAge` matching `JWT_EXPIRES_IN`), `lib/decode-jwt.ts` (decodes the JWT
  payload client-side to read `exp` — does **not** verify the signature,
  that's the API's job), and `api/get-current-user.ts` (`GET /auth/me`).
  `features/auth/{login,register,logout}` hold the Server Actions
  (`'use server'`), each with a zod schema in `model/schema.ts` that mirrors
  the backend DTO's validation rules, and a `'use client'` form using React
  19's `useActionState`/`useFormStatus` — no react-hook-form, no shadcn
  `form` component. `redirect()` is always called outside any `try/catch` in
  these actions (it throws a control-flow exception that a catch block would
  swallow). Registration's `confirmPassword` field is client-only validation
  and is stripped before calling the API — the API's global `ValidationPipe`
  (`forbidNonWhitelisted: true`) would 400 on any extra field.
- `proxy.ts` redirects based on cookie presence + `exp` only (no
  signature check, since that needs the API's secret) — it's a fast UX
  redirect, not the security boundary. The real boundary is the API's
  `JwtAuthGuard`; `shared/api/server.ts`'s `serverApiFetch` catches a 401 from
  any authenticated call and redirects to `/login`, covering revoked/invalid
  tokens that pass the middleware's cheap check.
- Data convention: reads happen in Server Components via `entities/*/api/*`
  (which use `shared/api/server.ts`'s `serverApiFetch`, an
  `import 'server-only'` wrapper around `shared/api/client.ts` that reads the
  cookie and adds `Authorization: Bearer <token>`); mutations go through
  Server Actions in `features/*/api/*.action.ts` calling `shared/api/client.ts`
  or `entities/*/api/*` directly, followed by `revalidatePath`. `"use client"`
  is reserved for interactive leaves (forms, filters, nav links) — see
  `features/expense/manage-expense/ui/expense-form.tsx`,
  `features/expense/filter-expenses/ui/expense-filters.tsx`,
  `widgets/sidebar/ui/nav-link.tsx` for the existing examples.
- `shared/api/client.ts` is the single fetch wrapper (base URL from
  `NEXT_PUBLIC_API_URL`, JSON body, throws typed `ApiError` on non-2xx, takes
  an optional `token` for the `Authorization` header). Public endpoints
  (login/register) call it directly; everything else goes through
  `shared/api/server.ts`'s `serverApiFetch`. New API calls belong in
  `entities/<feature>/api/<feature>.api.ts`, not ad-hoc `fetch()`.
- UI components come from shadcn/ui, installed into `shared/ui/*`
  (`components.json`'s `aliases` point `ui`/`components`/`lib`/`utils` at
  `@/shared/*` so the CLI writes there instead of the default
  `@/components/ui`). `shared/lib/cn.ts` is `clsx` + `tailwind-merge`, the
  signature shadcn's generated components expect. Two components
  (`shared/ui/select.tsx`, `shared/ui/table.tsx`) predate shadcn and were
  kept as hand-rolled (no shadcn equivalent was pulled in for them); new UI
  primitives should go through `npx shadcn@latest add <name>` from
  `apps/web` first.
- Tailwind v4 has no `tailwind.config.js`. `src/app/globals.css` defines
  shadcn's CSS-variable tokens (`--background`, `--primary`, `--muted`,
  `--destructive`, etc., mapped into Tailwind utilities via `@theme inline`)
  plus two app-specific semantic tokens that aren't part of the shadcn kit,
  `--color-expense`/`--color-income` (used in `expense-table.tsx` for
  amount coloring). Dark mode is driven by `prefers-color-scheme` (no
  toggle exists yet); a `.dark` class variant is also wired via
  `@custom-variant dark` for when a theme switcher is added.
- `next.config.ts` sets `transpilePackages: ['@expence-tracker/database']`
  since that workspace package ships TS source, not a pre-built bundle.

## TypeScript version pinning

The whole monorepo is pinned to **TypeScript 5.9.3** rather than the current
latest (7.x). `@nestjs/cli@11` depends on 5.9.3 directly, and Nest relies on
`experimentalDecorators`/`emitDecoratorMetadata`. All `package.json` files
across workspaces should keep this version in sync; don't bump TypeScript in
just one workspace.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>

<body>
```

- `<type>` is one of `feat`, `fix`, `refactor`, `chore`, `docs`, `test`,
  `style`, `perf`, `build`, `ci`. Use `feat`/`fix` only for changes that
  affect runtime behavior; config/tooling/dependency changes are `chore`,
  formatting-only changes are `style`.
- `<scope>` is the workspace or feature the change is about — e.g. `api`,
  `web`, `database`, `auth`, `expenses`, `categories` — omit it only for
  changes that cut across the whole repo (e.g. root tooling).
- `<summary>` is written in the imperative mood ("add", not "added"/"adds"),
  lowercase, no trailing period, under ~72 characters.
- The body (optional, separated by a blank line) explains *why*, not what —
  the diff already shows what changed. Wrap at ~72 characters.
- One logical change per commit; don't bundle unrelated features/fixes into
  a single commit.
- Breaking changes get a `!` after the type/scope (`feat(api)!: ...`) and a
  `BREAKING CHANGE:` footer describing the migration.

## Branching (GitHub Flow)

This repo follows [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

- `main` is always deployable. Nothing is committed directly to `main` —
  all work happens on a branch and lands via a pull request.
- Branch from `main` for every change, including small ones. Branch names
  are `<type>/<kebab-case-description>`, using the same `<type>` values as
  commit types (§ Commit conventions) — e.g. `feature/dashboard-view`,
  `fix/expense-filter-timezone`, `chore/bump-eslint`. Use `feature/` (not
  `feat/`) as the branch prefix to keep branch names visually distinct from
  commit subject lines.
- Push the branch and open a PR early (draft if not ready for review) so
  work is visible; commit to it following § Commit conventions.
- Merge to `main` only through a PR — squash or merge per the repo's
  existing history on the PR, not by pushing directly to `main`.
- Delete the branch after merge; don't reuse a merged branch name for
  unrelated follow-up work.
- Keep branches short-lived and scoped to one feature/fix — if a branch
  starts accumulating unrelated changes, split it.

## Pull request conventions

- **Title** follows Commit conventions above (`<type>(<scope>): <summary>`,
  imperative mood, under ~70 characters) — a PR is one logical change, same
  as a commit, even when it's made up of several commits. Omit `<scope>` if
  the PR spans both `apps/api` and `apps/web` for one feature (e.g. a new API
  contract plus the frontend that consumes it).
- **Before writing the description, read `git diff main` (or
  `git diff main...HEAD`)** — don't describe the change from memory of what
  you intended to do; describe what the diff actually contains.
- **Body structure:**
  - `## Summary` — what the PR implements, in terms of user-visible
    behavior/UI, not a file-by-file narration.
  - `## API changes` — required whenever the diff touches `apps/api`. List
    new endpoints (method + path), and for changed endpoints show the
    before/after response or request shape (a small diff-style snippet is
    enough). Say explicitly "No new endpoints" when that's the case — don't
    make the reviewer infer it from the diff.
  - `## Known limitations` (optional) — call out any deliberate shortcuts or
    deferred work (e.g. "computed client-side, will need a dedicated
    endpoint once volume grows") so they're a visible decision, not a
    surprise found later.
  - `## Test plan` — a checklist of what was actually verified
    (`npm run typecheck`/`test`/`lint`, manual `curl` against changed
    endpoints, browser pass for UI changes per the root-level UI-testing
    rule) with `[x]`/`[ ]` reflecting what was and wasn't done, not a
    generic template.
- Use `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"` (heredoc,
  never a raw `-b` string) so multi-line Markdown survives shell quoting.
- Don't push or open the PR without being asked; once asked, push the current
  branch with `-u` and target `main` unless told otherwise.
