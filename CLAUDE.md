# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The API has authentication: `POST /api/auth/register`, `POST /api/auth/login`
issue a JWT; every other route requires `Authorization: Bearer <token>` via a
global `JwtAuthGuard`, except routes marked `@Public()` (`/api/health`,
`/api/auth/register`, `/api/auth/login`). All of `apps/api` is built on CQRS
(`@nestjs/cqrs`) — see the module layout below and `apps/api/CLAUDE.md` for
the cross-module boundary rule and other Nest-specific conventions.

`apps/web` is organized with Feature-Sliced Design (FSD) — see
`apps/web/CLAUDE.md`. Login and registration
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

## TypeScript version pinning

The whole monorepo is pinned to **TypeScript 5.9.3** rather than the current
latest (7.x). `@nestjs/cli@11` depends on 5.9.3 directly, and Nest relies on
`experimentalDecorators`/`emitDecoratorMetadata`. All `package.json` files
across workspaces should keep this version in sync; don't bump TypeScript in
just one workspace.

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

<important if="Нужно сделать pull request">
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
</important>

## Документация
При добавлении функционала проверяй .claude/docs/*.
Актуализируй файлы при изменении архитектуры или API.