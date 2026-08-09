# @expence-tracker/database

Схема БД, миграции и Prisma Client. Единственный пакет, который знает о PostgreSQL.

## Команды

Запускать из корня монорепозитория:

```bash
npm run db:up        # поднять PostgreSQL в Docker
npm run db:migrate   # создать и применить миграцию (prisma migrate dev)
npm run db:generate  # перегенерировать клиент после правки схемы
npm run db:studio    # Prisma Studio
```

## Особенности Prisma 7

- Генератор — `prisma-client` (не устаревший `prisma-client-js`), поле `output`
  обязательно. Клиент попадает в `src/generated/prisma/` и не коммитится.
- `.env` не читается автоматически: путь к корневому `.env` задан явно
  в `prisma.config.ts`. Ключ `prisma` в `package.json` больше не поддерживается.

## Использование

```ts
import { PrismaClient, type Expense } from '@expence-tracker/database';
```

Фронтенд импортирует отсюда **только типы** — доступ к данным идёт через Nest API.
