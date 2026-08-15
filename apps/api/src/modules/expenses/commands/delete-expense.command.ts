import { Command } from '@nestjs/cqrs';

/**
 * CQRS-команда на удаление расхода. Диспатчится контроллером через
 * `CommandBus`, обрабатывается `DeleteExpenseHandler`.
 */
export class DeleteExpenseCommand extends Command<void> {
  /**
   * @param userId - id владельца расхода; удаление возможно только своих записей.
   * @param expenseId - id удаляемого расхода.
   */
  constructor(
    readonly userId: string,
    readonly expenseId: string,
  ) {
    super();
  }
}
