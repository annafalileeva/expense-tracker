import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExpenseCommand } from './create-expense.command';

@CommandHandler(CreateExpenseCommand)
export class CreateExpenseHandler implements ICommandHandler<CreateExpenseCommand, Expense> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateExpenseCommand): Promise<Expense> {
    const { categoryId } = command.payload;

    if (categoryId) {
      // Категория существует (FK), но может принадлежать другому пользователю —
      // это FK-ошибку не даёт, поэтому проверяем владельца явно.
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId: command.userId },
      });

      if (!category) {
        throw new NotFoundException(`Категория ${categoryId} не найдена`);
      }
    }

    return this.prisma.expense.create({
      data: { ...command.payload, userId: command.userId },
    });
  }
}
