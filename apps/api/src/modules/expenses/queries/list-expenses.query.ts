import { Query } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';

export interface ListExpensesFilters {
  categoryId?: string;
  from?: Date;
  to?: Date;
}

export class ListExpensesQuery extends Query<Expense[]> {
  constructor(
    readonly userId: string,
    readonly filters: ListExpensesFilters,
    readonly skip: number,
    readonly take: number,
  ) {
    super();
  }
}
