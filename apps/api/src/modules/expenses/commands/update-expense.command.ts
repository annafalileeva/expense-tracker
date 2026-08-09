import { Command } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export interface UpdateExpensePayload {
  amount?: number;
  currency?: string;
  note?: string;
  spentAt?: Date;
  categoryId?: string;
}

export class UpdateExpenseCommand extends Command<Expense> {
  constructor(
    readonly userId: string,
    readonly expenseId: string,
    readonly payload: UpdateExpensePayload,
  ) {
    super();
  }
}
