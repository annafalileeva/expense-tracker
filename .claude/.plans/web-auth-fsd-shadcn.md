# Страницы логина и регистрации + миграция apps/web на FSD и shadcn/ui

## Context

Бэкенд авторизации готов и закрыт глобальным `JwtAuthGuard`: `POST /api/auth/register`
и `POST /api/auth/login` отдают `{ accessToken, user }`, все остальные роуты требуют
`Authorization: Bearer <token>`. Фронтенд при этом не умеет ничего: страниц логина и
регистрации нет, `apps/web/src/lib/api/client.ts` не шлёт заголовок авторизации,
все страницы — статические заглушки с TODO. Любая попытка подтянуть реальные данные
сейчас упрётся в 401.

Задача: реализовать логин и регистрацию, положив их на две новые опоры —
UI-библиотеку shadcn/ui вместо самописных примитивов и архитектуру Feature-Sliced
Design для всего `apps/web`. Результат: пользователь регистрируется, получает JWT
в httpOnly-cookie, попадает на дашборд; неавторизованный не может открыть защищённые
страницы; в CLAUDE.md зафиксирована FSD-конвенция для будущих задач.

Решения приняты пользователем: **httpOnly cookie + Server Actions**, **полная
миграция** apps/web на FSD, **замена** `components/ui/*` на shadcn/ui.

## Контракт API (проверено по коду)

| Запрос | Тело (ровно эти поля!) | Успех | Ошибки |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ name, email, password }` | **201** `{ accessToken, user }` | 409 `Пользователь с таким email уже зарегистрирован`; 400 `message: string[]` |
| `POST /api/auth/login` | `{ email, password }` | **200** `{ accessToken, user }` | 401 `Неверный email или пароль`; 400 |
| `GET /api/auth/me` | — | 200 `UserView` | 401 |

- `UserView = { id, email, name, createdAt, updatedAt }`, даты — ISO-строки.
- Валидация register: `name` 1..100, `email` формат, `password` **8..72**.
- Глобальный `ValidationPipe` с `forbidNonWhitelisted: true` — **лишнее поле даёт 400**.
  `confirmPassword` на бэкенд отправлять нельзя, сверять пароли только на клиенте/в action.
- 400 отдаёт `message` **массивом строк, не привязанных к полям** — подсветить конкретное
  поле по ответу нельзя, поэтому клиентская валидация обязана зеркалить серверную.
- JWT: HS256, TTL `7d` (`JWT_EXPIRES_IN`), payload `{ sub, email, iat, exp }`.
  Refresh-токенов и logout-эндпоинта нет — logout = удалить cookie.
- Email на бэке **не нормализуется** (поиск регистрозависимый) — делаем `trim().toLowerCase()`
  на фронте перед отправкой.

## Архитектура: FSD в Next.js App Router

Слой FSD `app` конфликтует с директорией роутинга Next.js `src/app`, а слой `pages` —
с Pages Router. Решение (рекомендация официальной FSD-доки для Next.js):

- `src/app/` остаётся **директорией роутинга Next.js** и одновременно играет роль слоя
  `app` (глобальный layout, `globals.css`, `middleware.ts` рядом в `src/`).
  Файлы `page.tsx` — тонкие обёртки: импорт композиции из `views` + `metadata`.
- Слой `pages` переименован в **`views`** во избежание путаницы с Pages Router.

Итоговые слои (сверху вниз, импорт разрешён только вниз):

```
src/app/       — роутинг Next.js, root layout, globals.css
src/views/     — композиции страниц (login, register, dashboard, expenses, categories, settings)
src/widgets/   — самостоятельные блоки UI (sidebar, header, dashboard-summary, category-breakdown)
src/features/  — пользовательские сценарии (auth/login, auth/register, auth/logout, expense/*)
src/entities/  — бизнес-сущности (session, user, expense, category)
src/shared/    — ui (shadcn), api, lib, config — без бизнес-логики
```

Правила: слой импортирует только нижележащие слои; внутри слоя слайсы не импортируют
друг друга напрямую; каждый слайс отдаёт публичный API через `index.ts`. Алиас `@/*`
уже покрывает `@/shared/...`, дополнительные пути в tsconfig не нужны.
ESLint-плагин для границ не подключаем — правило описываем в CLAUDE.md
(проект принципиально минималистичен по зависимостям).

### Таблица переезда «было → стало»

| Было | Стало |
| --- | --- |
| `lib/api/client.ts` | `shared/api/client.ts` (+ новый `shared/api/server.ts`) |
| `lib/api/expenses.ts` | `entities/expense/api/expense.api.ts` |
| `lib/api/categories.ts` | `entities/category/api/category.api.ts` |
| `lib/utils.ts` (`cn`) | `shared/lib/cn.ts` — переписан на `clsx` + `twMerge` |
| `lib/format.ts` | `shared/lib/format.ts` |
| `config/site.ts` | `shared/config/site.ts` |
| `types/index.ts` | разъезжается по `entities/*/model/types.ts` |
| `components/ui/{button,input,card}` | `shared/ui/*` — заменяются на shadcn |
| `components/ui/{select,table}` | `shared/ui/*` — переносятся как есть (shadcn-аналоги не нужны для auth) |
| `components/layout/{sidebar,nav-link}` | `widgets/sidebar/` |
| `components/layout/header` | `widgets/header/` |
| `components/expenses/expense-table` | `entities/expense/ui/expense-table.tsx` |
| `components/expenses/expense-form` | `features/expense/manage-expense/ui/expense-form.tsx` |
| `components/expenses/expense-filters` | `features/expense/filter-expenses/ui/expense-filters.tsx` |
| `components/dashboard/summary-cards` | `widgets/dashboard-summary/` |
| `components/dashboard/category-breakdown` | `widgets/category-breakdown/` |
| тела страниц `app/(dashboard)/**` | `views/<name>/ui/<name>-page.tsx`, в `app/**/page.tsx` — реэкспорт |

`hooks/.gitkeep` удаляется (пустой каталог), `types/index.ts` и `lib/`, `components/`,
`config/` исчезают целиком.

## Реализация

### Шаг 1. Установка shadcn/ui

Из `apps/web` (не из корня — npm workspaces иначе положит пакеты не туда):

```bash
npx shadcn@latest init
npx shadcn@latest add button input label card alert
```

`init` доставит `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`,
`tw-animate-css`, `@radix-ui/react-slot`; `add label` — `@radix-ui/react-label`.
Отдельно: `npm i zod -w @expence-tracker/web` — для валидации в Server Actions.

`apps/web/components.json` — алиасы направлены в FSD-слой `shared`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "zinc", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/shared",
    "ui": "@/shared/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/lib/hooks",
    "utils": "@/shared/lib/cn"
  }
}
```

В `apps/web/tsconfig.json` добавить `"baseUrl": "."` — CLI shadcn его ожидает
(на резолвинг `@/*` это не влияет, пути и так относительны tsconfig).

`shared/lib/cn.ts` — shadcn-совместимая сигнатура (старая `Array<string|false|null>`
несовместима, но все текущие вызовы передают строки, так что переезд безболезненный):

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склейка классов с разрешением конфликтов Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**Форма без react-hook-form.** shadcn-компонент `form` тянет RHF и построен вокруг
клиентской валидации, что дублирует Server Actions. Берём React 19 `useActionState` +
`useFormStatus` + `zod`-схему, которая исполняется внутри Server Action, — меньше
зависимостей, валидация живёт в одном месте и работает без JS. Компонент `form`
не ставим, поля собираем из `label` + `input` + текста ошибки.

### Шаг 2. Тема: слияние токенов

`shadcn init` перепишет `src/app/globals.css` — после этого руками вернуть проектные
токены. Существующая тёмная тема — только `prefers-color-scheme`, переключателя нет;
сохраняем это поведение и дополнительно поддерживаем класс `.dark` на будущее.

Структура `src/app/globals.css`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  /* shadcn-токены в oklch: --background, --foreground, --card, --primary,
     --muted, --border, --input, --ring, --destructive, ... */
}

.dark { /* тёмные значения тех же токенов */ }

@media (prefers-color-scheme: dark) {
  :root:not(.light) { /* те же тёмные значения — сохраняем текущее поведение */ }
}

@theme inline {
  /* мост shadcn-токенов в утилиты Tailwind: --color-background: var(--background) и т.д. */

  /* Проектные токены остаются — они используются в expense-table и category-breakdown */
  --color-expense: #dc2626;
  --color-income: #16a34a;
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

Старые утилиты `bg-surface`, `text-foreground-muted`, `bg-accent`, `border-border`
заменяются в перенесённых компонентах на shadcn-эквиваленты: `bg-card`/`bg-background`,
`text-muted-foreground`, `bg-primary`, `border-border`. `--color-expense`/`--color-income`
сохраняются (семантика приложения, а не UI-кита).

### Шаг 3. shared/api — авторизованный fetch

`shared/api/client.ts` — прежний `apiFetch`, но с опциональным токеном:

```ts
type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  next?: NextFetchRequestConfig;
  /** JWT для заголовка Authorization; на публичные роуты не передаётся. */
  token?: string;
};
```

Внутри — `...(token ? { Authorization: `Bearer ${token}` } : {})` в заголовках.
Разбор ошибок (`message: string | string[]` → `ApiError`) остаётся как есть,
он уже корректно обрабатывает оба формата бэкенда.

`shared/api/server.ts` — обёртка для серверного контекста:

```ts
import 'server-only';
// serverApiFetch(path, options) — читает access_token через getAccessToken()
// из entities/session и подставляет его в apiFetch.
```

Здесь нарушения слоёв нет: чтобы `shared` не зависел от `entities`, `serverApiFetch`
принимает функцию чтения токена не импортом, а через `cookies()` напрямую —
имя cookie живёт в `shared/config/auth.ts` (`ACCESS_TOKEN_COOKIE`), а `entities/session`
использует ту же константу. Так `shared` остаётся самодостаточным.

Все функции в `entities/expense/api` и `entities/category/api` переключаются с
`apiFetch` на `serverApiFetch` — это соответствует конвенции «чтения происходят
в Server Components». Публичные `login`/`register` вызывают `apiFetch` без токена.

### Шаг 4. entities/session

```
entities/session/
  api/auth.api.ts     — loginRequest({email,password}), registerRequest({name,email,password}) → AuthResponse
  model/types.ts      — AuthResponse, JwtPayload
  lib/decode-jwt.ts   — читает exp без проверки подписи (base64url + JSON.parse), edge-safe
  lib/cookie.ts       — setSessionCookie(token) / clearSessionCookie() / getAccessToken()
  api/get-current-user.ts — getCurrentUser(): Promise<UserDto | null> через GET /auth/me
  index.ts
```

Подпись JWT на фронте не проверяем — это делает API. Своя мини-функция декодирования
вместо зависимости `jose`: нужен только `exp`, а проект намеренно держит мало пакетов.

Опции cookie:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 дней — совпадает с JWT_EXPIRES_IN
}
```

`entities/user/model/types.ts` — переезжает `UserDto` из `types/index.ts`.

### Шаг 5. features/auth

```
features/auth/
  login/
    model/schema.ts        — zod: email (формат), password (min 1)
    api/login.action.ts    — 'use server'
    ui/login-form.tsx      — 'use client', useActionState
    index.ts
  register/
    model/schema.ts        — zod: name 1..100, email, password 8..72, confirmPassword (сверка на клиенте)
    api/register.action.ts
    ui/register-form.tsx
    index.ts
  logout/
    api/logout.action.ts   — чистит cookie, redirect('/login')
    ui/logout-button.tsx
    index.ts
```

Форма состояния действия:

```ts
export interface AuthFormState {
  /** Общая ошибка от API (401/409/сеть). */
  message?: string;
  /** Ошибки по полям — только от клиентской zod-схемы, бэкенд их не привязывает. */
  fieldErrors?: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;
}
```

Скелет `register.action.ts`:

```ts
'use server';

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const { name, email, password } = parsed.data; // confirmPassword отбрасываем: бэкенд его отвергнет
  try {
    const { accessToken } = await registerRequest({ name, email: email.trim().toLowerCase(), password });
    await setSessionCookie(accessToken);
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message };
    throw error;
  }
  redirect('/'); // redirect бросает исключение — только вне try/catch
}
```

`redirect()` обязательно **вне** `try/catch`, иначе его служебное исключение
будет поглощено обработчиком ошибок.

Формы (`'use client'`): `useActionState(loginAction, {})`, кнопка через
`useFormStatus().pending` («Вход…»), общая ошибка — в `<Alert variant="destructive">`,
ошибки полей — под инпутами. Атрибуты `autoComplete` (`email`, `current-password`,
`new-password`), `required`, `minLength={8}` — нативная валидация как первый барьер.

### Шаг 6. Роуты и middleware

```
src/app/(auth)/layout.tsx        — центрированная карточка, без сайдбара
src/app/(auth)/login/page.tsx    — реэкспорт views/login
src/app/(auth)/register/page.tsx — реэкспорт views/register
src/middleware.ts
```

`views/login/ui/login-page.tsx` — `<Card>` с заголовком, `<LoginForm/>` и ссылкой
на регистрацию; для регистрации симметрично.

`middleware.ts`:

```ts
// Матчер исключает /_next, /favicon.ico и статику.
// Есть валидная (непротухшая) cookie + путь из (auth) → redirect на '/'
// Нет cookie + защищённый путь → redirect на '/login?from=<pathname>'
// Протухший exp → cookie удаляется в ответе, redirect на '/login'
```

Подпись здесь не проверяется (нужен был бы Node runtime и секрет) — middleware даёт
только быстрый UX-редирект, реальную проверку делает API. Дополнительно: в
`serverApiFetch` ловим 401 и редиректим на `/login`, чтобы отозванный токен
не приводил к пустому экрану.

`(dashboard)/layout.tsx` становится `async`: подтягивает `getCurrentUser()` и передаёт
имя пользователя в `Sidebar`, где рядом появляется `LogoutButton`.

### Шаг 7. CLAUDE.md

- **Project status**: убрать «no login page, or token storage wired up yet»; описать,
  что логин/регистрация работают через Server Actions и httpOnly-cookie `access_token`,
  а страницы данных всё ещё заглушки.
- Раздел **apps/web** переписать под заголовком
  «apps/web (Next.js App Router + Feature-Sliced Design)»: список слоёв, правило импорта
  «только вниз», причина переименования `pages` → `views` и того, что `src/app` —
  одновременно роутинг Next и слой `app`; публичные API слайсов через `index.ts`;
  где заводить новый код (новая сущность → `entities/`, новый сценарий → `features/`).
- Обновить упоминания путей: `lib/api/client.ts` → `shared/api/client.ts` и
  `shared/api/server.ts`; `formatMoney()` → `shared/lib/format.ts` (упомянут также
  в разделе packages/database); `components/ui/*` → `shared/ui/*`, shadcn/ui вместо
  «No component library»; `apps/web/src/types/index.ts` → `entities/*/model/types.ts`.
- Зафиксировать: тело запроса к API должно точно соответствовать DTO
  (`forbidNonWhitelisted`), поэтому `confirmPassword` не покидает фронт.

## Порядок работ

Репозиторий остаётся компилируемым после каждого шага:

1. shadcn init + add, `cn` на clsx/twMerge, слияние `globals.css`.
2. Создать `shared/*` (api, lib, config, ui), перенести туда client/format/site/select/table.
3. Создать `entities/*` (user, expense, category) — типы и api-функции на `serverApiFetch`.
4. Перенести компоненты в `widgets/*` и `features/expense/*`, заменить классы старых
   токенов на shadcn-эквиваленты.
5. Перенести тела страниц в `views/*`, `app/**/page.tsx` свести к реэкспортам.
6. Удалить `lib/`, `components/`, `config/`, `types/`, `hooks/`.
7. `entities/session` + `features/auth/*` + роуты `(auth)` + `middleware.ts`.
8. Обновить CLAUDE.md.

## Проверка

```bash
npm run db:up && npm run db:migrate   # если БД ещё не поднята
npm run dev                            # api :3001, web :3000
npm run lint && npm run typecheck && npm run format:check
npm run build                          # проверяет прод-сборку Next
```

Сценарии в браузере:

1. `/` без cookie → редирект на `/login`.
2. Регистрация валидными данными → 201, редирект на `/`, в DevTools → Application →
   Cookies виден `access_token` с флагами HttpOnly и SameSite=Lax.
3. Повторная регистрация тем же email → в форме «Пользователь с таким email уже
   зарегистрирован» (409), редиректа нет.
4. Регистрация с паролем короче 8 символов → ошибка под полем, запрос к API не уходит.
5. Пароли не совпадают → ошибка под `confirmPassword`, в Network видно, что
   `confirmPassword` в теле запроса **отсутствует**.
6. Logout → cookie удалена, редирект на `/login`, возврат назад в браузере не даёт
   доступ к дашборду.
7. Логин с неверным паролем → «Неверный email или пароль» (401).
8. Логин верными данными → дашборд, в сайдбаре имя пользователя (`GET /auth/me` с
   заголовком `Authorization` — проверить во вкладке Network со стороны API-лога).
9. Открыть `/login` с валидной cookie → редирект на `/`.
10. Испортить значение cookie руками → следующий запрос даёт 401 → редирект на `/login`.
11. Регистрация с email в другом регистре (`Anna@X.com`) → логин тем же адресом
    в нижнем регистре проходит (нормализация на фронте работает).
