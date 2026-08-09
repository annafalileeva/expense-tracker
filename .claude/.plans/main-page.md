# Главный экран: меню, профиль и последние транзакции с пагинацией

## Context

Авторизация готова с обеих сторон, а дашборд — нет. `views/dashboard` сейчас
синхронный компонент-заглушка:

```tsx
// apps/web/src/views/dashboard/ui/dashboard-page.tsx
// TODO: заменить заглушки на агрегаты из API (GET /api/expenses с фильтром по месяцу).
export function DashboardPage() {
  return (<>
    <Header title="Дашборд" />
    <main className="space-y-6 p-6">
      <DashboardSummary total={0} count={0} average={0} />
      <CategoryBreakdown items={[]} />
    </main>
  </>);
}
```

Данные о пользователе уже читаются в `(dashboard)/layout.tsx` через
`getCurrentUser()`, но дальше строки с именем в сайдбаре никуда не идут; списка
транзакций на главной нет вовсе.

Задача: довести главный экран до рабочего состояния — навигация к транзакциям и
категориям, карточка профиля с именем, агрегаты за текущий месяц и список
последних 10 транзакций с постраничной навигацией. Всё по FSD: чтение — в
Server Components через `entities/*/api/*`, композиция — в `views/dashboard`,
переиспользуемые блоки — в `widgets/*` и `shared/ui/*`.

Решения, принятые пользователем:

- **Пагинация — с конвертом на бэкенде** (`{ items, total, page, limit }`),
  чтобы были номера страниц и «Всего: N», а не только «Назад/Вперёд».
- **Профиль — карточкой на главном экране** (сайдбар не трогаем).
- **Карточки итогов заполняем, считая на фронте** из выборки за текущий месяц;
  отдельный эндпоинт агрегатов пока не делаем.

## Контракт API (проверено по коду)

| Запрос | Параметры | Ответ сейчас | Ответ после задачи |
| --- | --- | --- | --- |
| `GET /api/expenses` | `page`, `limit`, `categoryId`, `from`, `to` — **и ничего больше** | `Expense[]` | `{ items, total, page, limit }` |
| `GET /api/categories` | `page`, `limit` | `Category[]` | без изменений |
| `GET /api/auth/me` | — | `UserView` | без изменений |

- `PaginationQueryDto`: `page` по умолчанию `1` (min 1), `limit` по умолчанию
  `20`, **max 100** — больше сотни за запрос не вытащить.
- Сортировка жёстко `spentAt: 'desc'`, параметра сортировки нет.
  «Последние 10» = `listExpenses({ page, limit: 10 })`.
- `include: { category: true }` есть только в GET-ответах; фильтр по датам
  включающий (`gte`/`lte`).
- `amount` приходит **строкой** (Prisma сериализует `Decimal` через
  `toString()`, `42.50` → `"42.5"`), даты — ISO-строки. Это уже зафиксировано в
  `ExpenseDto`.
- Глобальный `ValidationPipe` с `forbidNonWhitelisted: true` — **любой лишний
  query-параметр даёт 400**. Ничего, кроме перечисленного выше, слать нельзя.
- `UserView = { id, email, name, createdAt, updatedAt }`; `/auth/me` отдаёт его
  синхронно из `request.user`, без похода в БД.

Ни один тест не завязан на формат ответа `/expenses`: юнит-тесты есть только у
`auth` (`login.handler.spec.ts`, `register.handler.spec.ts`), e2e — `app` и
`auth`. На фронте `listExpenses` вызывается только из своего барелла
(`views/expenses` — заглушка с пустым массивом). Смена формата ничего не ломает.

## 1. Бэкенд: пагинационный конверт для `GET /api/expenses`

**`apps/api/src/common/dto/paginated-result.ts`** (новый):

```ts
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

**`modules/expenses/queries/list-expenses.query.ts`** — вместо `skip`/`take`
класс принимает `page`/`limit` (skip считается в хендлере, чтобы `page`/`limit`
попали в ответ), результат — `PaginatedResult<Expense>`:

```ts
export class ListExpensesQuery extends Query<PaginatedResult<Expense>> {
  constructor(
    readonly userId: string,
    readonly filters: ListExpensesFilters,
    readonly page: number,
    readonly limit: number,
  ) { super(); }
}
```

**`modules/expenses/queries/list-expenses.handler.ts`** — `where` не меняется;
`findMany` и `count` идут одним `prisma.$transaction`, чтобы `total` относился к
той же выборке:

```ts
const [items, total] = await this.prisma.$transaction([
  this.prisma.expense.findMany({
    where,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    orderBy: { spentAt: 'desc' },
    include: { category: true },
  }),
  this.prisma.expense.count({ where }),
]);

return { items, total, page: query.page, limit: query.limit };
```

**`modules/expenses/expenses.controller.ts`** — `findAll` возвращает
`Promise<PaginatedResult<Expense>>` и передаёт `query.page ?? 1`,
`query.limit ?? 20` вместо `query.skip`, `query.take`.

`PaginationQueryDto` и модуль `categories` не трогаем: там `skip`/`take`
остаются как есть, категорий мало и конверт им не нужен.

## 2. Фронтенд: тип ответа и API-слой

**`shared/api/types.ts`** (новый) — транспортный тип, зеркалящий бэкенд:

```ts
export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; }
```

**`entities/expense/api/expense.api.ts`** — `listExpenses` возвращает
`Promise<Paginated<ExpenseDto>>`. Сборка querystring из `ExpenseFilters`
(отбрасывание `undefined`/`''`) и `cache: 'no-store'` остаются без изменений;
`ExpenseFilters` уже содержит `page` и `limit`.

## 3. Фронтенд: агрегаты за месяц

**`shared/lib/date.ts`** (новый) — `getMonthRange(date = new Date())` →
`{ from, to }` в ISO: первый день месяца `00:00:00.000` и последний день
`23:59:59.999`. Бэкенд валидирует `from`/`to` как `@IsDate() @Type(() => Date)`,
ISO-строка подходит.

**`entities/expense/lib/summary.ts`** (новый, экспорт через барелл слайса):

- `summarizeExpenses(expenses: ExpenseDto[]): { total: number; count: number; average: number }`
- `groupByCategory(expenses: ExpenseDto[]): CategoryTotal[]` — сортировка по
  убыванию суммы; расходы без категории собираются в псевдо-элемент
  «Без категории».

Суммируем **в копейках** (`Math.round(Number.parseFloat(amount) * 100)`), делим
на 100 только на выходе — иначе накапливается float-дрейф. Валюты не
конвертируются: складываем как есть и показываем через `formatMoney` с валютой
по умолчанию (`siteConfig.defaultCurrency`) — при смешанных валютах итог
формально некорректен, отметить комментарием в коде.

**`CategoryTotal`** сейчас объявлен в `widgets/category-breakdown` — переносим
интерфейс в `entities/expense/model/types.ts`, виджет импортирует его из
`@/entities/expense`. Причина: `entities` не может импортировать из `widgets`,
это импорт вверх по слоям.

## 4. Фронтенд: пагинация

**`shared/lib/pagination.ts`** (новый):

- `parsePageParam(value: string | undefined): number` — `1` при мусоре и при
  значении `< 1`.
- `getPageRange(page: number, pageCount: number): (number | 'ellipsis')[]` —
  окно вида `1 … 4 5 6 … 14`.

**`shared/ui/pagination.tsx`** — поставить через `npx shadcn@latest add
pagination` из `apps/web` (конвенция CLAUDE.md: новые примитивы идут через CLI;
алиасы в `components.json` пишут сразу в `@/shared/ui`). Если CLI недоступен —
собрать примитивы руками в стиле соседних `shared/ui/table.tsx` и
`shared/ui/select.tsx`.

**`widgets/pagination/ui/pagination-bar.tsx`** (новый + `index.ts`) —
**серверный** компонент (только ссылки, интерактива нет):

```ts
interface PaginationBarProps {
  page: number;
  total: number;
  limit: number;
  basePath: string;
  searchParams?: Record<string, string>; // сохраняем остальные параметры в href
}
```

Считает `pageCount = Math.ceil(total / limit)`, при `pageCount <= 1` возвращает
`null`. Href собирает как `basePath?page=N` с приведением к `Route` — в проекте
`typedRoutes: true`, приём уже применяется в `widgets/sidebar/ui/nav-link.tsx`.
Рядом со ссылками — «Всего: N».

## 5. Фронтенд: профиль

**`widgets/user-profile/ui/user-profile.tsx`** (новый + `index.ts`) — props
`{ name: string; email: string }`, `Card` из `shared/ui/card`: кружок с
инициалами (локальный `getInitials`), «Здравствуйте, {name}» и email ниже.
Сайдбар и его строку с именем не трогаем.

## 6. Фронтенд: сборка главного экрана

**`app/(dashboard)/page.tsx`** — перестаёт быть чистым ре-экспортом: читает
`searchParams` (в Next это `Promise`) и передаёт номер страницы пропом — ровно
тот же приём, что уже используется в `app/(dashboard)/expenses/[id]/edit/page.tsx`
для `params`:

```tsx
import { DashboardPage } from '@/views/dashboard';
import { parsePageParam } from '@/shared/lib/pagination';

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;

  return <DashboardPage page={parsePageParam(page)} />;
}
```

**`views/dashboard/ui/dashboard-page.tsx`** — становится `async`:

- Один `Promise.all`: `getCurrentUser()`,
  `listExpenses({ ...getMonthRange(), limit: summaryFetchLimit })` для агрегатов,
  `listExpenses({ page, limit: recentExpensesLimit })` для списка.
- Числа выносим в `shared/config/site.ts`:
  `dashboardConfig = { recentExpensesLimit: 10, summaryFetchLimit: 100 }`
  (100 — потолок, который пропускает `@Max(100)` в `PaginationQueryDto`).
- Композиция: `<Header title="Дашборд" />` → `<UserProfile />` →
  `<DashboardSummary {...summarizeExpenses(month.items)} />` →
  `<CategoryBreakdown items={groupByCategory(month.items)} />` → карточка
  «Последние транзакции» со ссылкой «Все расходы →» на `/expenses`,
  `<ExpenseTable expenses={recent.items} />` (пустое состояние у таблицы уже
  есть) и `<PaginationBar page={...} total={recent.total} limit={recent.limit}
  basePath="/" />`.
- Меню «переход к транзакциям и категориям» уже закрыто сайдбаром
  (`widgets/sidebar` + `navItems` в `shared/config/site.ts`, пункты «Расходы» и
  «Категории») — дублирующее меню не добавляем, ограничиваемся ссылкой
  «Все расходы →» в шапке списка.

Известное ограничение (отметить комментарием в коде): агрегаты считаются по
первым 100 расходам месяца; при большем объёме понадобится
`GET /api/expenses/summary` с `groupBy` на бэкенде.

## Файлы

Изменяются:

- `apps/api/src/modules/expenses/expenses.controller.ts`
- `apps/api/src/modules/expenses/queries/list-expenses.query.ts`
- `apps/api/src/modules/expenses/queries/list-expenses.handler.ts`
- `apps/web/src/entities/expense/{api/expense.api.ts,model/types.ts,index.ts}`
- `apps/web/src/widgets/category-breakdown/ui/category-breakdown.tsx`
- `apps/web/src/views/dashboard/ui/dashboard-page.tsx`
- `apps/web/src/app/(dashboard)/page.tsx`
- `apps/web/src/shared/config/site.ts`

Создаются:

- `apps/api/src/common/dto/paginated-result.ts`
- `apps/web/src/shared/api/types.ts`
- `apps/web/src/shared/lib/date.ts`, `apps/web/src/shared/lib/pagination.ts`
- `apps/web/src/shared/ui/pagination.tsx`
- `apps/web/src/entities/expense/lib/summary.ts`
- `apps/web/src/widgets/pagination/{index.ts,ui/pagination-bar.tsx}`
- `apps/web/src/widgets/user-profile/{index.ts,ui/user-profile.tsx}`

## Проверка

1. `npm run db:up && npm run db:migrate`, затем `npm run dev`.
2. Зарегистрироваться на `/register`. Форма расхода — всё ещё заглушка без
   Server Action, поэтому тестовые данные заводим напрямую: ~25 расходов за
   текущий месяц через `curl -X POST localhost:3001/api/expenses -H
   "Authorization: Bearer <token>"` (токен — из ответа `/auth/login`) либо через
   `npm run db:studio`.
3. Контракт: `curl "localhost:3001/api/expenses?page=2&limit=10" -H
   "Authorization: Bearer <token>"` → `{ "items": [...], "total": 25,
   "page": 2, "limit": 10 }`.
4. На `/`: карточка профиля с именем и email; суммы, счётчик и средний чек не
   нули; разбивка по категориям с полосками; ровно 10 строк в таблице;
   пагинация ведёт на `/?page=2` и `/?page=3`, последняя страница показывает 5
   записей, стрелки на краях неактивны; `/?page=999` — пустая таблица без
   падения.
5. Переходы «Расходы» и «Категории» в сайдбаре и ссылка «Все расходы →»
   работают, активный пункт подсвечен.
6. `npm run lint && npm run typecheck` из корня;
   `npm run test -w @expence-tracker/api` и
   `npm run test:e2e -w @expence-tracker/api` (требует поднятой БД).

## Коммиты

Отдельными логическими изменениями, по Conventional Commits:

1. `feat(api): return paginated envelope from expenses list`
2. `feat(web): add pagination and user profile widgets`
3. `feat(web): fill dashboard with profile, summary and recent expenses`
