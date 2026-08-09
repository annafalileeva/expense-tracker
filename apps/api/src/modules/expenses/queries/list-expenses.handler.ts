import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, type Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import type { PaginatedResult } from '../../../common/dto/paginated-result';
import { ListExpensesQuery } from './list-expenses.query';

@QueryHandler(ListExpensesQuery)
export class ListExpensesHandler implements IQueryHandler<
  ListExpensesQuery,
  PaginatedResult<Expense>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListExpensesQuery): Promise<PaginatedResult<Expense>> {
    const { categoryId, from, to } = query.filters;

    const where: Prisma.ExpenseWhereInput = {
      userId: query.userId,
      categoryId,
      spentAt: from || to ? { gte: from, lte: to } : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { spentAt: 'desc' },
        include: { category: true },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }
}
