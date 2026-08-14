## Architecture
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

**Data flow contract: the frontend never talks to the database directly.**
`apps/web` imports only *types* from `@expence-tracker/database`; all reads
and writes go through the Nest API (`apps/web/src/shared/api/*` and
`apps/web/src/entities/*/api/*`). This is intentional and should not be
worked around by importing `PrismaClient` into web code.

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