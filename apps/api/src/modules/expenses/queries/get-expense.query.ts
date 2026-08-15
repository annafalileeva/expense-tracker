import { Query } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

/**
 * CQRS-запрос на получение одного расхода. Диспатчится контроллером через
 * `QueryBus`, обрабатывается `GetExpenseHandler`.
 */
export class GetExpenseQuery extends Query<Expense> {
  /**
   * @param userId - id пользователя-владельца; запрос скоупится по нему.
   * @param expenseId - id запрашиваемого расхода.
   */
  constructor(
    readonly userId: string,
    readonly expenseId: string,
  ) {
    super();
  }
}
