import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteExpenseCommand } from './delete-expense.command';

@CommandHandler(DeleteExpenseCommand)
export class DeleteExpenseHandler implements ICommandHandler<DeleteExpenseCommand, void> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteExpenseCommand): Promise<void> {
    await this.prisma.expense.delete({
      where: { id: command.expenseId, userId: command.userId },
    });
  }
}
