import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateExpenseCommand } from './update-expense.command';

/**
 * Обрабатывает {@link UpdateExpenseCommand}: проверяет, что указанная
 * категория (если меняется) принадлежит пользователю, и обновляет расход,
 * скоупленный по userId.
 */
@CommandHandler(UpdateExpenseCommand)
export class UpdateExpenseHandler implements ICommandHandler<UpdateExpenseCommand, Expense> {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param command - команда обновления с userId, expenseId и payload.
   * @returns Обновлённый расход.
   * @throws {NotFoundException} Если `payload.categoryId` указан, но категория
   *   с таким id не существует или принадлежит другому пользователю.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если расход не
   *   найден или принадлежит другому пользователю — глобальный
   *   `PrismaExceptionFilter` превращает его в 404.
   */
  async execute(command: UpdateExpenseCommand): Promise<Expense> {
    const { categoryId } = command.payload;

    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId: command.userId },
      });

      if (!category) {
        throw new NotFoundException(`Категория ${categoryId} не найдена`);
      }
    }

    // userId в where — чужой expenseId даёт P2025 (404 через PrismaExceptionFilter).
    return this.prisma.expense.update({
      where: { id: command.expenseId, userId: command.userId },
      data: command.payload,
    });
  }
}
