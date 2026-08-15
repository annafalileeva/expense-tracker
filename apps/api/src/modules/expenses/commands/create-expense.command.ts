import { Command } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export interface CreateExpensePayload {
  amount: number;
  currency?: string;
  note?: string;
  spentAt: Date;
  categoryId?: string;
}

/**
 * CQRS-команда на создание расхода. Диспатчится контроллером через
 * `CommandBus`, обрабатывается `CreateExpenseHandler`.
 */
export class CreateExpenseCommand extends Command<Expense> {
  /**
   * @param userId - id пользователя, которому будет принадлежать расход.
   * @param payload - данные создаваемого расхода.
   */
  constructor(
    readonly userId: string,
    readonly payload: CreateExpensePayload,
  ) {
    super();
  }
}
