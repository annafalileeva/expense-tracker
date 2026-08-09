import { Query } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export class GetExpenseQuery extends Query<Expense> {
  constructor(
    readonly userId: string,
    readonly expenseId: string,
  ) {
    super();
  }
}
