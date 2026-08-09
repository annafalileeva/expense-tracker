import { Query } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import type { PaginatedResult } from '../../../common/dto/paginated-result';

export interface ListExpensesFilters {
  categoryId?: string;
  from?: Date;
  to?: Date;
}

export class ListExpensesQuery extends Query<PaginatedResult<Expense>> {
  constructor(
    readonly userId: string,
    readonly filters: ListExpensesFilters,
    readonly page: number,
    readonly limit: number,
  ) {
    super();
  }
}
