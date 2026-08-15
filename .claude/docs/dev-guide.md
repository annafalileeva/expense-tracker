# Гайд разработчика

## Первый запуск

```bash
npm install
cp .env.example .env
npm run db:up            # поднять PostgreSQL в Docker
npm run db:migrate       # prisma migrate dev + generate client
npm run dev              # api (:3001) и web (:3000) параллельно
```

Полезные команды:

| Команда | Действие |
| --- | --- |
| `npm run dev` | api + web в watch-режиме (`concurrently`) |
| `npm run build` | сборка `database` → `api` → `web`, именно в этом порядке — api/web зависят от сгенерированного Prisma-клиента |
| `npm run lint` | ESLint по всем workspace'ам |
| `npm run typecheck` | `tsc --noEmit` по всем workspace'ам |
| `npm run format` / `format:check` | Prettier |
| `npm run db:up` / `db:down` | старт/стоп контейнера Postgres |
| `npm run db:migrate` | `prisma migrate dev` (`packages/database`) |
| `npm run db:generate` | перегенерировать Prisma Client после правки схемы |
| `npm run db:studio` | Prisma Studio |

Команды для одного workspace: `npm run <script> -w @expence-tracker/api`
(или `web`, `database`). E2e-тесты Nest: `npm run test:e2e -w @expence-tracker/api`
(требуют поднятой БД — бьют в реальный Postgres через Prisma). Юнит-тесты:
`npm run test -w @expence-tracker/api`; один файл:
`npm run test -w @expence-tracker/api -- login.handler.spec.ts`.

## Как добавить фичу-модуль в `apps/api`

Каждый модуль — это `commands/` + `queries/` + `dto/` + контроллер, без
сервисного слоя. Разберём на примере гипотетического модуля `budgets`.

1. **Каркас модуля** — `src/modules/budgets/`:

   ```
   modules/budgets/
     commands/
     queries/
     dto/
     budgets.controller.ts
     budgets.module.ts
   ```

2. **Команда** (`commands/create-budget.command.ts`) — только данные:

   ```ts
   export class CreateBudgetCommand {
     constructor(
       public readonly userId: string,
       public readonly payload: { name: string; limit: number },
     ) {}
   }
   ```

3. **Хендлер** (`commands/create-budget.handler.ts`) — вся логика и
   единственное место, где инжектится `PrismaService`:

   ```ts
   @CommandHandler(CreateBudgetCommand)
   export class CreateBudgetHandler implements ICommandHandler<CreateBudgetCommand, Budget> {
     constructor(private readonly prisma: PrismaService) {}

     execute(command: CreateBudgetCommand): Promise<Budget> {
       return this.prisma.budget.create({
         data: { ...command.payload, userId: command.userId },
       });
     }
   }
   ```

   Если ресурс скоуплен по пользователю (как `categories`/`expenses`), у
   чтения/обновления/удаления `where` всегда включает `userId`, а не
   только `id` — иначе открывается доступ к чужим данным.
   `PrismaExceptionFilter` уже переводит `P2025` (нет строки под `where`)
   в 404 — ловить это исключение самому не нужно.

4. **`commands/index.ts`** — публичный барабан фичи: экспортирует
   **только классы** команд (не хендлеры) плюс массив хендлеров для
   модуля:

   ```ts
   // Другие модули импортируют отсюда только классы команд, не handler'ы.
   export * from './create-budget.command';

   import { CreateBudgetHandler } from './create-budget.handler';

   export const BudgetsCommandHandlers = [CreateBudgetHandler];
   ```

   Так же — `queries/index.ts` с `BudgetsQueryHandlers`.

5. **DTO** (`dto/create-budget.dto.ts`) — `class-validator`, без `userId`
   (он всегда берётся из `@CurrentUser()`, не из тела запроса):

   ```ts
   export class CreateBudgetDto {
     @IsString() @MinLength(1) @MaxLength(60)
     name!: string;

     @IsNumber() @IsPositive()
     limit!: number;
   }
   ```

   Update-DTO обычно — `PartialType(CreateBudgetDto)` из
   `@nestjs/mapped-types`, если нет полей, которые различаются между
   create/update (если различаются — сначала `OmitType`, потом
   `PartialType`).

6. **Контроллер** — инжектит только `CommandBus`/`QueryBus`:

   ```ts
   @ApiBearerAuth()
   @Controller('budgets')
   export class BudgetsController {
     constructor(
       private readonly commandBus: CommandBus,
       private readonly queryBus: QueryBus,
     ) {}

     @Post()
     create(@CurrentUser() user: UserView, @Body() dto: CreateBudgetDto): Promise<Budget> {
       return this.commandBus.execute(new CreateBudgetCommand(user.id, dto));
     }
   }
   ```

   Роут по умолчанию требует JWT — `@Public()` добавляется только если
   роут должен быть открытым.

7. **Модуль** — импортирует `CqrsModule` явно (в `@nestjs/cqrs` v11 он не
   глобальный):

   ```ts
   @Module({
     imports: [CqrsModule],
     controllers: [BudgetsController],
     providers: [...BudgetsCommandHandlers, ...BudgetsQueryHandlers],
   })
   export class BudgetsModule {}
   ```

8. Зарегистрировать `BudgetsModule` в `imports` `AppModule`
   (`src/app.module.ts`).

9. **Граница между модулями.** Если `budgets` должен что-то узнать у
   `users`/`categories`, импортировать нужно только классы
   команд/запросов и их result-типы из чужого `commands/index.ts` /
   `queries/index.ts`, и обращаться к ним через `CommandBus`/`QueryBus` —
   не импортировать чужой хендлер, `<Feature>CommandHandlers` или
   `PrismaService` из другого модуля, и не добавлять чужой модуль в
   `imports`.

10. **Swagger и JSDoc.** После добавления/изменения метода контроллера —
    обновить JSDoc (`@param`/`@returns`/`@throws`), добавить
    `@ApiOperation`/`@ApiResponse` на методы и `@ApiProperty` на поля DTO
    (см. `expenses.controller.ts` и `CreateExpenseDto`/`RegisterDto` как
    образцы).

## Как добавить миграцию БД

1. Изменить `packages/database/prisma/schema.prisma`.
2. Из корня репозитория:

   ```bash
   npm run db:migrate
   ```

   Это `prisma migrate dev` в `packages/database` — генерирует новый файл
   `prisma/migrations/<timestamp>_<name>/migration.sql`, применяет его к
   локальной БД и перегенерирует Prisma Client в
   `packages/database/src/generated/prisma/` (в `.gitignore`).
3. Не редактировать уже применённые файлы миграций задним числом — под
   новое изменение схемы создаётся новая миграция.
4. Если менялась только генерация клиента без изменения схемы (например,
   после `git pull` с чужими миграциями) — `npm run db:generate`.
5. Публичный API пакета — только `packages/database/src/index.ts`;
   новые модели, если их нужно использовать за пределами пакета,
   реэкспортировать оттуда.
6. Прогнать `npm run typecheck -w @expence-tracker/api` — типы Prisma
   меняются вместе со схемой, использующий их код может перестать
   собираться.

## Тестирование хендлера (юнит-тест)

Хендлеры тестируются изолированно — зависимости (`CommandBus`/`QueryBus`,
`TokenService` и т.п.) мокаются вручную, без Nest testing module. Образец
— `apps/api/src/modules/auth/commands/login.handler.spec.ts`:

```ts
describe('LoginHandler', () => {
  let queryBus: { execute: jest.Mock };
  let handler: LoginHandler;

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    handler = new LoginHandler(queryBus as unknown as QueryBus, tokenService as unknown as TokenService);
  });

  it('бросает 401 при неверном пароле', async () => {
    queryBus.execute.mockResolvedValue(buildUser(passwordHash));
    await expect(handler.execute(new LoginCommand(email, 'wrong'))).rejects.toThrow(UnauthorizedException);
  });
});
```

Файл теста лежит рядом с хендлером: `<x>.handler.spec.ts`.

## E2e-тест эндпоинта

E2e-тесты (`apps/api/test/*.e2e-spec.ts`) поднимают весь `AppModule` и
реальную БД через `supertest`. Требуют `npm run db:up && npm run db:migrate`
перед запуском. Конвенции из `test/auth.e2e-spec.ts`:

- Использовать `randomUUID()` в тестовых email/данных, чтобы тесты не
  конфликтовали между прогонами.
- В `afterAll` подчищать созданные записи — достаточно удалить `User`,
  каскад (`onDelete: Cascade`) сам уберёт связанные `Category`/`Expense`.
- Заголовок `Authorization: Bearer <token>` — получать через реальный
  `POST /api/auth/register`/`login` в самом тесте, не мокать JWT.

## Как добавить фичу во фронтенде (`apps/web`, FSD)

На примере добавления мутации (по аналогии с `features/category/manage-category`):

1. **API-вызов** — в `entities/<entity>/api/<entity>.api.ts`, через
   `serverApiFetch` (для чтений/большинства мутаций) или
   `shared/api/client.ts` напрямую (только для публичных `/auth/*`
   запросов без токена):

   ```ts
   export function createCategory(input: CategoryInput): Promise<CategoryDto> {
     return serverApiFetch<CategoryDto>('/categories', { method: 'POST', body: input });
   }
   ```

   Реэкспортировать через `entities/<entity>/index.ts` — не импортировать
   из `api/` напрямую в других слоях.

2. **Zod-схема** формы — `features/<domain>/<action>/model/schema.ts`,
   зеркалит правила валидации соответствующего backend DTO (та же длина
   строк, тот же формат).

3. **Server Action** — `features/<domain>/<action>/api/<action>.action.ts`,
   директива `'use server'`, парсит `FormData` через zod-схему,
   обрабатывает `ApiError` из `shared/api/client.ts`, зовёт
   `revalidatePath()` на затронутый маршрут после успеха:

   ```ts
   'use server';
   export async function createCategoryAction(_prevState, formData) {
     const parsed = categorySchema.safeParse({ ... });
     if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };
     try {
       await createCategory(parsed.data);
     } catch (error) {
       if (error instanceof ApiError) return { message: error.message };
       throw error;
     }
     revalidatePath('/categories');
     return { success: true };
   }
   ```

   `redirect()`, если используется, — всегда вне `try/catch`.

4. **Форма** — `'use client'`-компонент в `ui/`, на React 19
   `useActionState`/`useFormStatus` (без react-hook-form/shadcn `form`).

5. **Публичный API среза** — `index.ts` фичи реэкспортирует то, что нужно
   снаружи (обычно UI-компонент и/или action).

6. **Использование в странице** — `views/<name>/ui/<name>-page.tsx`
   компонует фичу; `app/**/page.tsx` остаётся тонким реэкспортом
   `views/<name>`.

Куда класть новый код — по тому, что он делает:
- новая бизнес-сущность (данные + типы + чтения) → `entities/<name>`;
- новый пользовательский сценарий (мутация, интерактивная форма) →
  `features/<domain>/<action>`;
- новый самодостаточный UI-блок, переиспользуемый на нескольких страницах
  → `widgets/<name>`;
- новая страница → `views/<name>` + `app/**/page.tsx`;
- новый примитив без бизнес-логики → `shared/ui` (через
  `npx shadcn@latest add <name>` из `apps/web`, если это shadcn-компонент).

Каждый слой импортирует только из слоёв ниже себя (никогда вбок между
срезами одного слоя, никогда вверх), и только через `index.ts` среза —
не через `ui/`/`api/`/`model/` напрямую.

## Деньги на фронтенде

`Expense.amount` — `Decimal(12,2)` в БД, по HTTP приходит **строкой**
(`ExpenseDto.amount: string`, отличается от сырого Prisma-типа `Expense`).
Любое чтение/форматирование денежного значения — через `formatMoney()`
(`apps/web/src/shared/lib/format.ts`), не `Number()` и не шаблонные строки
напрямую — иначе легко потерять точность или разойтись с форматированием
в остальном приложении.

## Коммиты и ветки

См. `CLAUDE.md` в корне репозитория — Conventional Commits + GitHub Flow
(`<type>/<kebab-case-description>` ветки от `main`, PR обязателен, прямые
коммиты в `main` не делаются).
