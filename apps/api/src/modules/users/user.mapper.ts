import type { User } from '@expence-tracker/database';

/**
 * Публичное представление пользователя — без passwordHash.
 * Единственная форма, в которой User покидает модуль users.
 */
export interface UserView {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Только для auth: нужен passwordHash, чтобы сверить его при login.
 * Не покидает границу users/auth — наружу через HTTP никогда не отдаётся.
 */
export interface UserWithCredentials extends UserView {
  passwordHash: string;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toUserWithCredentials(user: User): UserWithCredentials {
  return { ...toUserView(user), passwordHash: user.passwordHash };
}
