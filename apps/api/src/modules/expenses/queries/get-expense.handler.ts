import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetExpenseQuery } from './get-expense.query';

@QueryHandler(GetExpenseQuery)
export class GetExpenseHandler implements IQueryHandler<GetExpenseQuery, Expense> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetExpenseQuery): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: query.expenseId, userId: query.userId },
      include: { category: true },
    });

    if (!expense) {
      throw new NotFoundException(`Расход ${query.expenseId} не найден`);
    }

    return expense;
  }
}
