import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma, type Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListExpensesQuery } from './list-expenses.query';

@QueryHandler(ListExpensesQuery)
export class ListExpensesHandler implements IQueryHandler<ListExpensesQuery, Expense[]> {
  constructor(private readonly prisma: PrismaService) {}

  execute(query: ListExpensesQuery): Promise<Expense[]> {
    const { categoryId, from, to } = query.filters;

    const where: Prisma.ExpenseWhereInput = {
      userId: query.userId,
      categoryId,
      spentAt: from || to ? { gte: from, lte: to } : undefined,
    };

    return this.prisma.expense.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { spentAt: 'desc' },
      include: { category: true },
    });
  }
}
