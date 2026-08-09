# Трекер расходов

Монорепозиторий: Next.js на фронтенде, Nest.js на бэкенде, PostgreSQL через Prisma.

> **Статус:** создана только структура проекта. Зависимости не установлены —
> начните с `npm install`.

## Стек

| Слой | Технология |
| --- | --- |
| Монорепо | npm workspaces |
| Фронтенд | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Бэкенд | Nest.js 11 (Express) |
| БД | PostgreSQL 17 в Docker |
| ORM | Prisma 7 |
| Язык | TypeScript 5.9.3 |
| Линтинг | ESLint 10 (flat config) + Prettier |

TypeScript зафиксирован на 5.9.3, хотя актуален уже 7.x: `@nestjs/cli@11` тянет
именно 5.9.3, а Nest завязан на `emitDecoratorMetadata`. Обновимся, когда Nest
начнёт поддерживать TS 7.

## Структура

```
apps/
  web/        Next.js — интерфейс
  api/        Nest.js — REST API
packages/
  database/   Prisma: схема, миграции, клиент
  eslint-config/  общий flat config
```

Фронтенд не ходит в БД напрямую: из `@expence-tracker/database` он берёт только
типы, данные получает через API.

## Запуск

```bash
npm install
cp .env.example .env
npm run db:up        # PostgreSQL в Docker
npm run db:migrate   # применить миграции и сгенерировать клиент
npm run dev          # api :3001 и web :3000 параллельно
```

Проверка: `http://localhost:3001/api/health` → `{"status":"ok","db":"up"}`,
интерфейс — `http://localhost:3000`.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | api и web в watch-режиме |
| `npm run build` | сборка всех пакетов в правильном порядке |
| `npm run lint` | ESLint по всем воркспейсам |
| `npm run typecheck` | проверка типов без сборки |
| `npm run format` | Prettier |
| `npm run db:up` / `db:down` | поднять / остановить PostgreSQL |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | перегенерировать Prisma Client |
| `npm run db:studio` | Prisma Studio |

## API

Базовый префикс — `/api`.

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/health` | статус сервиса и БД |
| `GET` `POST` | `/api/expenses` | список расходов с фильтрами, создание |
| `GET` `PATCH` `DELETE` | `/api/expenses/:id` | одна запись |
| `GET` `POST` | `/api/categories` | категории |
| `GET` `PATCH` `DELETE` | `/api/categories/:id` | одна категория |
| `GET` `POST` | `/api/users` | пользователи |
| `GET` `PATCH` `DELETE` | `/api/users/:id` | один пользователь |

Кроме `/api/health`, эндпоинты — рабочие скелеты: маршруты, DTO и валидация на
месте, бизнес-логики (права доступа, агрегаты) пока нет.

## Что дальше

1. Авторизация — сейчас `userId` передаётся в теле запроса, это временно.
2. Агрегаты для дашборда: суммы за период и разбивка по категориям.
3. Наполнение страниц реальными данными вместо заглушек.
