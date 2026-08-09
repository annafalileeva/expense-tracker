import { Query } from '@nestjs/cqrs';
import type { UserWithCredentials } from '../user.mapper';

/**
 * Внутренний запрос — используется auth'ом для сверки пароля при login.
 * Возвращает passwordHash, поэтому наружу через HTTP результат не отдаётся.
 * Возвращает null, если пользователь не найден (а не 404) — auth сам решает,
 * какую ошибку показать.
 */
export class GetUserByEmailQuery extends Query<UserWithCredentials | null> {
  constructor(readonly email: string) {
    super();
  }
}
