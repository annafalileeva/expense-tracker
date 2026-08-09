// Prisma 7 не читает .env автоматически и не поддерживает ключ `prisma`
// в package.json — конфигурация CLI живёт здесь.
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// .env лежит в корне монорепозитория, а CLI запускается из packages/database,
// поэтому путь задаём явно относительно этого файла.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
