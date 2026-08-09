import type { User } from '@expence-tracker/database';

/**
 * То, что реально приходит по HTTP: без passwordHash (User из Prisma его
 * содержит, наружу через API он не отдаётся никогда) и с датами-строками.
 */
export type UserDto = Omit<User, 'passwordHash' | 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};
