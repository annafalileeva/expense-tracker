# Авторизация в API: Users + Auth (JWT) на CQRS

## Чек-лист реализации

- [x] 1. Зависимости и конфиг (package.json, .env, configuration.ts, env.validation.ts)
- [x] 2. Схема БД: passwordHash в User + миграция
- [x] 3. Общие декораторы и guard (Public, CurrentUser, express.d.ts)
- [x] 4. Модуль users на CQRS
- [x] 5. Модуль auth (register/login/JWT)
- [x] 6. Модуль categories на CQRS + владелец из токена
- [x] 7. Модуль expenses на CQRS + владелец из токена
- [x] 8. AppModule: CqrsModule + глобальный JwtAuthGuard + @Public на health
- [x] 9. Фронтенд: убрать userId из типов и API-обёрток
- [x] 10. CLAUDE.md: правило границ CQRS-модулей
- [x] 11. Тесты: unit auth handlers + e2e auth
- [x] 12. Проверка: install, migrate, typecheck, lint, ручной прогон

---

## Context

Сейчас в API нет никакой авторизации. `userId` приходит **в теле запроса** (`CreateExpenseDto.userId`, `CreateCategoryDto.userId` — оба помечены `TODO`), а сервисы вообще не фильтруют по владельцу: `CategoriesService.findAll` возвращает категории всех пользователей, `ExpensesService.findAll` фильтрует только если клиент сам передал `userId`. В модели `User` нет пароля. То есть любой клиент может читать и писать чужие данные, просто подставив чужой UUID.

Задача: добавить хранение учётных данных (имя, email, хэш пароля), модуль `auth` с `register`/`login` на JWT, и перевести API на CQRS так, чтобы `auth` получал данные пользователя **только через `CommandBus`/`QueryBus`**, без импорта `UsersService`/`UsersModule`.

Решения, подтверждённые пользователем:
- CQRS — на весь API (`users`, `categories`, `expenses`, `auth`), сервисов как слоя не остаётся.
- Хэширование — `bcrypt`.
- Проверка токена — `@nestjs/passport` + `passport-jwt` (`JwtStrategy` + `AuthGuard('jwt')`).
- Только access-токен, без refresh.

---

## 1. Зависимости и конфиг

**`apps/api/package.json`** — добавить в `dependencies`:
`@nestjs/cqrs@^11`, `@nestjs/jwt@^11`, `@nestjs/passport@^11`, `passport`, `passport-jwt`, `bcrypt`;
в `devDependencies`: `@types/passport-jwt`, `@types/bcrypt`.
Ставить из корня: `npm install -w @expence-tracker/api ...` (workspaces). TypeScript не трогаем — пин 5.9.3.

**`.env.example`** (+ локальный `.env`, он gitignored) — новая секция:
```
# Авторизация
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=7d
```

**`apps/api/src/config/configuration.ts`** — расширить `AppConfig`:
```ts
jwt: { secret: string; expiresIn: string };
```
и заполнять из `process.env.JWT_SECRET` / `JWT_EXPIRES_IN ?? '7d'`.

**`apps/api/src/config/env.validation.ts`** — добавить `'JWT_SECRET'` в массив `required` (там уже готовый механизм с русским сообщением об ошибке).

---

## 2. Схема БД

**`packages/database/prisma/schema.prisma`**, модель `User`:
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String            // было String? — теперь обязательное
  passwordHash String            // bcrypt-хэш, наружу не отдаётся никогда
  ...
}
```
Миграций в `packages/database/prisma/migrations` ещё нет вообще — это будет первая миграция, создающая всю схему, поэтому проблемы бэкфилла `passwordHash` для существующих строк не возникает.

`packages/database/src/index.ts` менять не нужно — новых моделей нет, `User` уже реэкспортируется.

После правки схемы: `npm run db:migrate` (он же вызовет `prisma generate`).

---

## 3. Соглашение по CQRS

Структура повторяется в каждом фиче-модуле, плоско, в духе существующего кода:

```
modules/<feature>/
  commands/
    create-<x>.command.ts      // класс-контракт: только поля + конструктор
    create-<x>.handler.ts      // @CommandHandler, вся логика, PrismaService напрямую
    index.ts                   // export * + export const <Feature>CommandHandlers = [...]
  queries/
    get-<x>.query.ts
    get-<x>.handler.ts
    index.ts
  dto/                         // как сейчас, class-validator
  <feature>.controller.ts      // только commandBus/queryBus.execute(...)
  <feature>.module.ts
```

**Правило границы модулей (записать в `CLAUDE.md`):** другой модуль имеет право импортировать из `<feature>/commands/index.ts` и `<feature>/queries/index.ts` **только классы команд и запросов**. Импорт handler'ов, `PrismaService` чужой фичи или самого модуля — запрещён. Это и есть «взаимодействие без прямых импортов»: `AuthModule` не значится в `imports` и не инжектит ничего из `users`.

`CqrsModule` подключается в `AppModule` (в v11 он глобальный; при необходимости — `CqrsModule.forRoot()`), плюс явный `imports: [CqrsModule]` в каждом фиче-модуле для читаемости.

**Сервисы удаляются:** `users.service.ts`, `categories.service.ts`, `expenses.service.ts` — их тела переезжают в соответствующие handler'ы. `PrismaModule` глобальный, поэтому `PrismaService` инжектится в handler напрямую.

---

## 4. Модуль `users`

Команды: `CreateUserCommand(name, email, passwordHash)`, `UpdateUserCommand(userId, dto)`, `DeleteUserCommand(userId)`.
Запросы: `GetUserByIdQuery(id)`, `GetUserByEmailQuery(email)`.

Ключевой момент — утечка хэша. Заводим два представления в `modules/users/queries/`:
- `UserView` — `{ id, email, name, createdAt, updatedAt }`, возвращается наружу. Мапперу место в `modules/users/user.mapper.ts` (`toUserView(user: User): UserView`), его используют все handler'ы, отдающие пользователя в контроллер.
- `GetUserByEmailQuery` — **внутренний** запрос для `auth`, возвращает `UserWithCredentials` (`UserView` + `passwordHash`) или `null` (а не `NotFoundException` — login сам решает, какую ошибку вернуть).

`CreateUserCommand` принимает уже готовый `passwordHash` — хэширование живёт в `auth`, `users` про пароли ничего не знает, кроме того, что хранит строку.

**Контроллер `users.controller.ts` переписывается** — публичный CRUD чужих пользователей после ввода авторизации становится дырой (`GET /api/users` сейчас отдаёт всех). Оставляем:
- `GET /api/users/me` → `GetUserByIdQuery(user.id)`
- `PATCH /api/users/me` → `UpdateUserCommand`
- `DELETE /api/users/me` → `DeleteUserCommand`

`GET /api/users` (список всех) и `POST /api/users` убираются: создание пользователя теперь только через `POST /api/auth/register`. `CreateUserDto` больше не нужен как HTTP-DTO (роль переходит к `RegisterDto`), `UpdateUserDto` остаётся (`name`, `email`).

---

## 5. Модуль `auth`

```
modules/auth/
  commands/
    register.command.ts / register.handler.ts
    login.command.ts    / login.handler.ts
    index.ts
  dto/
    register.dto.ts        // name, email, password (@MinLength(8))
    login.dto.ts           // email, password
    auth-response.dto.ts   // { accessToken: string; user: UserView }
  strategies/jwt.strategy.ts
  guards/jwt-auth.guard.ts
  auth.controller.ts
  auth.module.ts
```

**`RegisterHandler`:**
1. `queryBus.execute(new GetUserByEmailQuery(email))` → если не `null`, `ConflictException('Пользователь с таким email уже зарегистрирован')`.
2. `bcrypt.hash(password, 12)`.
3. `commandBus.execute(new CreateUserCommand(name, email, passwordHash))` → `UserView`.
4. Подписать токен, вернуть `AuthResponseDto`.

Гонку (два параллельных register на один email) закрывает `@unique` на `email` + существующий `PrismaExceptionFilter` (`P2002 → 409`) — ловить ошибку в handler'е не нужно.

**`LoginHandler`:**
1. `queryBus.execute(new GetUserByEmailQuery(email))`.
2. Если `null` — сделать «холостой» `bcrypt.compare` по фиктивному хэшу, чтобы время ответа не выдавало существование пользователя, затем `UnauthorizedException`.
3. `bcrypt.compare(password, user.passwordHash)` — при несовпадении та же ошибка с тем же текстом (`'Неверный email или пароль'`), чтобы не давать перебирать email'ы.
4. Подписать токен.

Подпись токена — общий приватный метод/провайдер внутри `auth`: payload `{ sub: user.id, email: user.email }`, `JwtModule.registerAsync` с `secret`/`expiresIn` из `ConfigService` (ключи camelCase — `config.get('jwt.secret')`, как это уже сделано для `webOrigin`/`port`).

**`JwtStrategy`** (`ExtractJwt.fromAuthHeaderAsBearerToken()`): в `validate(payload)` дополнительно дёргает `queryBus.execute(new GetUserByIdQuery(payload.sub))` — удалённый пользователь с живым токеном получит 401, и это ещё раз демонстрирует межмодульное взаимодействие через шину. Возвращает `UserView`, который Nest кладёт в `request.user`.

**`auth.controller.ts`:** `POST /api/auth/register`, `POST /api/auth/login` (оба `@Public()`, `@HttpCode(200)` для login), `GET /api/auth/me` → `@CurrentUser()`.

---

## 6. Глобальный guard и доступ к текущему пользователю

- `apps/api/src/common/decorators/public.decorator.ts` — `SetMetadata('isPublic', true)` (каталог `common/decorators/` сейчас пуст, только `.gitkeep`).
- `apps/api/src/common/decorators/current-user.decorator.ts` — `createParamDecorator` → `request.user` типа `UserView`.
- `modules/auth/guards/jwt-auth.guard.ts` — `extends AuthGuard('jwt')`, в `canActivate` через `Reflector.getAllAndOverride` пропускает `@Public()`.
- В `AuthModule`: `{ provide: APP_GUARD, useClass: JwtAuthGuard }` — закрыто по умолчанию, открывается точечно.
- `@Public()` вешается на `health.controller.ts` и на `register`/`login`.

Типизацию `request.user` объявить в `apps/api/src/types/express.d.ts` (`declare global { namespace Express { interface User extends UserView {} } }`), иначе `@CurrentUser()` будет `any`.

---

## 7. `categories` и `expenses`: владелец из токена

Перевод на CQRS + закрытие утечек — это одна и та же правка, поэтому делается вместе.

**DTO:**
- `CreateCategoryDto` / `CreateExpenseDto` — удалить поле `userId` (те самые `TODO`). Важно: глобальный `ValidationPipe` стоит с `forbidNonWhitelisted: true`, так что старые клиенты, продолжающие слать `userId`, получат 400, а не молчаливое игнорирование.
- `UpdateCategoryDto`/`UpdateExpenseDto` через `PartialType(OmitType(...))` — после удаления `userId` из Create-DTO `OmitType` больше не нужен, упрощается до `PartialType`.
- `QueryExpensesDto` — удалить `userId?`: как публичный фильтр он и есть источник утечки.

**Handler'ы получают `userId` из токена** (контроллер прокидывает `@CurrentUser()` в конструктор команды/запроса):
- списки: `where: { userId, ... }`;
- чтение одного: `findFirst({ where: { id, userId } })` → `NotFoundException` (а не `findUnique` по `id`);
- update/delete: `prisma.<model>.update({ where: { id, userId }, ... })` — при чужом id Prisma бросит `P2025`, который существующий `PrismaExceptionFilter` уже превращает в 404. Если версия Prisma откажется принимать неуникальный `userId` в `where`, откатиться на «`findFirst` + затем мутация».
- `CreateExpenseCommand` дополнительно проверяет, что переданный `categoryId` принадлежит тому же пользователю, иначе можно привязать свой расход к чужой категории.

---

## 8. Фронтенд (минимально, чтобы контракт не разъехался)

- `apps/web/src/lib/api/categories.ts` — убрать `userId` из `CategoryInput`.
- `apps/web/src/lib/api/expenses.ts` — убрать `userId` из `ExpenseInput`.

Полноценный логин на фронте (страница входа, хранение токена, проброс `Authorization` в единственную обёртку `apiFetch` в `apps/web/src/lib/api/client.ts`) — **вне объёма этой задачи**; страницы сейчас всё равно рендерят заглушки без запросов. Стоит отметить: после включения глобального guard'а фронтенд без токена будет получать 401 на все ручки, кроме `/api/health`.

---

## 9. Документация

`CLAUDE.md` — обновить разделы: снять формулировку про «`userId` передаётся в body как заглушка вместо auth», добавить правило границы CQRS-модулей из п. 3 и описание `@Public()`/`@CurrentUser()`.

---

## Проверка

```bash
npm install
# добавить JWT_SECRET в .env
npm run db:up
npm run db:migrate          # первая миграция: создаст схему с passwordHash
npm run typecheck && npm run lint
npm run dev
```

**Ручной прогон** (порядок важен — второй шаг проверяет главное: изоляцию данных):
```bash
# 1. регистрация → 201 + accessToken, в ответе нет passwordHash
curl -s -X POST localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Аня","email":"a@example.com","password":"secret123"}'

# 2. повторная регистрация того же email → 409
# 3. login с неверным паролем → 401 «Неверный email или пароль»
# 4. GET /api/expenses без заголовка → 401
# 5. GET /api/expenses с Bearer-токеном → 200, только свои записи
# 6. POST /api/expenses с лишним полем userId в теле → 400 (forbidNonWhitelisted)
# 7. зарегистрировать второго пользователя, попробовать GET /api/expenses/<id первого> → 404
```

**Тесты:**
- Unit `modules/auth/commands/login.handler.spec.ts` — мок `QueryBus`/`JwtService`: несуществующий email → 401, неверный пароль → 401, верный → токен подписан с `{ sub, email }`.
- Unit `modules/auth/commands/register.handler.spec.ts` — email занят → `ConflictException`; успех → `bcrypt.hash` вызван, `CommandBus` получил `CreateUserCommand` с хэшем, а не с сырым паролем.
- E2E `apps/api/test/auth.e2e-spec.ts` в стиле существующего `app.e2e-spec.ts` (реальная БД, без моков), но **с явным `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`** — текущий e2e его не подключает, а без него валидация DTO в тестах не проверяется. Сценарий: register → login → `GET /api/auth/me` с токеном → 200; без токена → 401; расход чужого пользователя → 404. Чистить созданных пользователей в `afterAll`.

Запуск: `npm run test -w @expence-tracker/api` и `npm run test:e2e -w @expence-tracker/api` (второй требует поднятой БД).
