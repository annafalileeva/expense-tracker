import { Command } from '@nestjs/cqrs';

export class DeleteExpenseCommand extends Command<void> {
  constructor(
    readonly userId: string,
    readonly expenseId: string,
  ) {
    super();
  }
}
