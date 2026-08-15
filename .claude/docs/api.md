# API

Базовый URL: `http://localhost:3001/api` (порт из `API_PORT`, префикс `api`
задан в `main.ts`). Интерактивная Swagger-документация поднимается вместе с
API на `/api/docs`.

## Аутентификация

Все роуты требуют заголовок `Authorization: Bearer <JWT>`, кроме помеченных
`@Public()`: `GET /health`, `POST /auth/register`, `POST /auth/login`.
Токен выдаётся `POST /auth/register`/`POST /auth/login` и живёт
`JWT_EXPIRES_IN` (по умолчанию `7d`). Payload токена — `{ sub: userId,
email }`; при каждом запросе `JwtStrategy` подгружает актуального
пользователя из БД, а не доверяет данным из самого токена.

Без валидного токена (или после `@Public()`-исключений) — `401
Unauthorized`.

## Общие правила

- **Валидация тела запроса.** Глобальный `ValidationPipe`
  (`whitelist: true, forbidNonWhitelisted: true, transform: true`) — лишние
  поля в теле запроса дают `400`, а не отбрасываются молча.
- **Изоляция по пользователю.** `userId` никогда не передаётся в теле
  запроса — берётся из JWT. Любой ресурс (`Category`, `Expense`),
  принадлежащий другому пользователю, при чтении/обновлении/удалении по
  `id` даёт `404`, а не `403` (чужой ресурс просто "не найден").
- **Ошибки Prisma → HTTP.** `P2002` (нарушение уникальности) → `409`,
  `P2025` (запись не найдена) → `404`, `P2003` (нарушение внешнего ключа)
  → `400`. Тело ответа: `{ statusCode, message, error }`, где `error` —
  код Prisma.
- **UUID в пути.** Параметры `:id` проверяются `ParseUUIDPipe` — невалидный
  UUID даёт `400` раньше, чем запрос дойдёт до БД.
- **Формат ошибок валидации DTO** (`class-validator`):
  `{ statusCode: 400, message: string[], error: "Bad Request" }`.

## `GET /health`

Публичный healthcheck. Пингует БД через `SELECT 1`.

```
200 OK
{ "status": "ok", "db": "up" | "down" }
```

## Auth — `/auth`

### `POST /auth/register`

Публичный. Создаёт пользователя и сразу выдаёт токен.

Тело (`RegisterDto`):

| Поле | Тип | Правила |
| --- | --- | --- |
| `name` | string | 1–100 символов |
| `email` | string | валидный email |
| `password` | string | 8–72 символа |

```
201 Created
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "email": "...", "name": "...", "createdAt": "...", "updatedAt": "..." }
}
```

Ошибки: `400` (невалидное тело), `409` (email уже занят).

### `POST /auth/login`

Публичный.

Тело (`LoginDto`): `email` (валидный email), `password` (непустая строка).

```
200 OK
{ "accessToken": "<jwt>", "user": { ...UserView } }
```

Ошибки: `400` (невалидное тело), `401` (неверный email или пароль — оба
случая дают одно и то же сообщение `"Неверный email или пароль"`, без
уточнения, что именно не совпало).

### `GET /auth/me`

Требует токен. Возвращает `UserView` пользователя из самого токена
(без похода в БД — сравни с `GET /users/me`, который перечитывает БД).

```
200 OK
{ "id": "uuid", "email": "...", "name": "...", "createdAt": "...", "updatedAt": "..." }
```

## Users — `/users`

Единственный ресурс — свой профиль (`/me`). Нет `GET /users` или
`POST /users` (регистрация — только через `POST /auth/register`).

### `GET /users/me`

```
200 OK → UserView (перечитан из БД через GetUserByIdQuery)
```

### `PATCH /users/me`

Тело (`UpdateUserDto`, все поля опциональны): `email` (валидный email),
`name` (строка, ≤100 символов).

```
200 OK → обновлённый UserView
```

Ошибки: `409`, если новый `email` уже занят другим пользователем.

### `DELETE /users/me`

Удаляет пользователя. Каскадно удаляет все его `Category` и `Expense`
(`onDelete: Cascade` в схеме).

```
204 No Content
```

## Categories — `/categories`

Все роуты скоуплены по текущему пользователю.

### `GET /categories`

Query (`PaginationQueryDto`): `page` (int ≥1, по умолчанию 1), `limit`
(int 1–100, по умолчанию 20).

```
200 OK → Category[]
```

Категории отсортированы по `name` (`asc`). ⚠️ В отличие от `GET /expenses`,
здесь `page`/`limit` применяются к запросу (`skip`/`take`), но ответ — это
**просто массив**, не `PaginatedResult` (нет `total`).

### `GET /categories/:id`

```
200 OK → Category
404 → категория не найдена или принадлежит другому пользователю
```

### `POST /categories`

Тело (`CreateCategoryDto`):

| Поле | Тип | Правила |
| --- | --- | --- |
| `name` | string | 1–60 символов |
| `color` | string? | hex-цвет, напр. `#7C3AED` |
| `icon` | string? | ≤40 символов |

```
201 Created → Category
```

Ошибки: `409`, если у пользователя уже есть категория с таким `name`
(`@@unique([userId, name])`).

### `PATCH /categories/:id`

Тело (`UpdateCategoryDto` = `PartialType(CreateCategoryDto)`) — все поля
опциональны.

```
200 OK → обновлённая Category
404 → не найдена / чужая
409 → конфликт уникальности name в пределах пользователя
```

### `DELETE /categories/:id`

Удаляет категорию. У расходов, которые на неё ссылались, `categoryId`
становится `null` (`onDelete: SetNull`) — сами расходы не удаляются.

```
204 No Content
404 → не найдена / чужая
```

## Expenses — `/expenses`

Все роуты скоуплены по текущему пользователю.

### `GET /expenses`

Query (`QueryExpensesDto`, расширяет `PaginationQueryDto`):

| Поле | Тип | Правила |
| --- | --- | --- |
| `page` | int? | ≥1, по умолчанию 1 |
| `limit` | int? | 1–100, по умолчанию 20 |
| `categoryId` | UUID? | фильтр по категории |
| `from` | ISO date? | нижняя граница `spentAt` (включительно) |
| `to` | ISO date? | верхняя граница `spentAt` (включительно) |

```
200 OK
{
  "items": [ { ...Expense, "category": Category | null } ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Отсортировано по `spentAt` (`desc`). Выборка и подсчёт `total` идут одной
Prisma `$transaction`, чтобы `total` не разъезжался с `items` при
конкурентных записях. Используется индекс `@@index([userId, spentAt])`.

### `GET /expenses/:id`

```
200 OK → Expense (с включённой category)
400 → :id не валидный UUID
404 → не найден / чужой
```

### `POST /expenses`

Тело (`CreateExpenseDto`):

| Поле | Тип | Правила |
| --- | --- | --- |
| `amount` | number | > 0, максимум 2 знака после запятой (соответствует `Decimal(12,2)`) |
| `currency` | string? | код ISO 4217, напр. `RUB`; по умолчанию `RUB` на уровне схемы БД |
| `note` | string? | ≤500 символов |
| `spentAt` | ISO date | обязательно |
| `categoryId` | UUID? | категория должна принадлежать текущему пользователю |

```
201 Created → Expense
```

Ошибки: `400` (невалидное тело), `404` (`categoryId` указан, но не
существует или принадлежит другому пользователю — проверяется явно, FK
сам по себе такую ошибку не даёт, так как категория *существует*, просто
не у этого пользователя).

⚠️ В ответе `amount` — Prisma `Decimal`, на уровне API он не
преобразуется в строку вручную (это делает JSON-сериализация Nest);
фронтенд типизирует его как `string` (`ExpenseDto.amount`) и форматирует
через `formatMoney()`, а не `Number()`/шаблонные строки.

### `PATCH /expenses/:id`

Тело (`UpdateExpenseDto` = `PartialType(CreateExpenseDto)`) — все поля
опциональны.

```
200 OK → обновлённый Expense
400 → :id не UUID или тело не прошло валидацию
404 → расход не найден/чужой, или новая categoryId не найдена у пользователя
```

### `DELETE /expenses/:id`

```
204 No Content
400 → :id не валидный UUID
404 → не найден / чужой
```

## Сводная таблица

| Метод | Путь | Публичный | Тело/Query | Ответ |
| --- | --- | --- | --- | --- |
| GET | `/health` | да | — | `{ status, db }` |
| POST | `/auth/register` | да | `RegisterDto` | `AuthResponseDto` (201) |
| POST | `/auth/login` | да | `LoginDto` | `AuthResponseDto` (200) |
| GET | `/auth/me` | нет | — | `UserView` |
| GET | `/users/me` | нет | — | `UserView` |
| PATCH | `/users/me` | нет | `UpdateUserDto` | `UserView` |
| DELETE | `/users/me` | нет | — | 204 |
| GET | `/categories` | нет | `PaginationQueryDto` | `Category[]` |
| GET | `/categories/:id` | нет | — | `Category` |
| POST | `/categories` | нет | `CreateCategoryDto` | `Category` (201) |
| PATCH | `/categories/:id` | нет | `UpdateCategoryDto` | `Category` |
| DELETE | `/categories/:id` | нет | — | 204 |
| GET | `/expenses` | нет | `QueryExpensesDto` | `PaginatedResult<Expense>` |
| GET | `/expenses/:id` | нет | — | `Expense` |
| POST | `/expenses` | нет | `CreateExpenseDto` | `Expense` (201) |
| PATCH | `/expenses/:id` | нет | `UpdateExpenseDto` | `Expense` |
| DELETE | `/expenses/:id` | нет | — | 204 |
