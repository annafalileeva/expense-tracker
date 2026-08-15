import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetExpenseQuery } from './get-expense.query';

/**
 * Обрабатывает {@link GetExpenseQuery}: ищет расход, скоупленный по userId,
 * вместе с его категорией.
 */
@QueryHandler(GetExpenseQuery)
export class GetExpenseHandler implements IQueryHandler<GetExpenseQuery, Expense> {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param query - запрос с userId и expenseId.
   * @returns Найденный расход вместе с включённой категорией.
   * @throws {NotFoundException} Если расход не найден или принадлежит другому пользователю.
   */
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
