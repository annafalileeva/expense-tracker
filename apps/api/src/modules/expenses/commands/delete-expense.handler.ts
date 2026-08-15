import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteExpenseCommand } from './delete-expense.command';

/**
 * Обрабатывает {@link DeleteExpenseCommand}: удаляет расход, скоупленный по
 * userId, так что нельзя удалить чужую запись, зная только её id.
 */
@CommandHandler(DeleteExpenseCommand)
export class DeleteExpenseHandler implements ICommandHandler<DeleteExpenseCommand, void> {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param command - команда удаления с userId и expenseId.
   * @returns Ничего.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если расход не
   *   найден или принадлежит другому пользователю — глобальный
   *   `PrismaExceptionFilter` превращает его в 404.
   */
  async execute(command: DeleteExpenseCommand): Promise<void> {
    await this.prisma.expense.delete({
      where: { id: command.expenseId, userId: command.userId },
    });
  }
}
