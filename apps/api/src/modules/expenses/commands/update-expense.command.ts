import { Command } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export interface UpdateExpensePayload {
  amount?: number;
  currency?: string;
  note?: string;
  spentAt?: Date;
  categoryId?: string;
}

/**
 * CQRS-команда на частичное обновление расхода. Диспатчится контроллером
 * через `CommandBus`, обрабатывается `UpdateExpenseHandler`.
 */
export class UpdateExpenseCommand extends Command<Expense> {
  /**
   * @param userId - id владельца расхода; обновление возможно только своих записей.
   * @param expenseId - id обновляемого расхода.
   * @param payload - поля для обновления (все опциональны).
   */
  constructor(
    readonly userId: string,
    readonly expenseId: string,
    readonly payload: UpdateExpensePayload,
  ) {
    super();
  }
}
