import { Command } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export interface CreateExpensePayload {
  amount: number;
  currency?: string;
  note?: string;
  spentAt: Date;
  categoryId?: string;
}

export class CreateExpenseCommand extends Command<Expense> {
  constructor(
    readonly userId: string,
    readonly payload: CreateExpensePayload,
  ) {
    super();
  }
}
