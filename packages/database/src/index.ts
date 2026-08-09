// Единая точка входа для доступа к БД.
// Клиент генерируется в ./generated/prisma командой `npm run generate`
// (или `npm run db:generate` из корня) — каталог в .gitignore.
export { PrismaClient, Prisma } from './generated/prisma/client';

export type { User, Category, Expense } from './generated/prisma/client';
