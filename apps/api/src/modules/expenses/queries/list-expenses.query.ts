import { Query } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import type { PaginatedResult } from '../../../common/dto/paginated-result';

export interface ListExpensesFilters {
  categoryId?: string;
  from?: Date;
  to?: Date;
}

/**
 * CQRS-запрос на постраничный список расходов пользователя. Диспатчится
 * контроллером через `QueryBus`, обрабатывается `ListExpensesHandler`.
 */
export class ListExpensesQuery extends Query<PaginatedResult<Expense>> {
  /**
   * @param userId - id пользователя, чьи расходы запрашиваются.
   * @param filters - опциональные фильтры по категории и периоду (`spentAt`).
   * @param page - номер страницы, начиная с 1.
   * @param limit - размер страницы.
   */
  constructor(
    readonly userId: string,
    readonly filters: ListExpensesFilters,
    readonly page: number,
    readonly limit: number,
  ) {
    super();
  }
}
