import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteCategoryCommand } from './delete-category.command';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, void> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.prisma.category.delete({
      where: { id: command.categoryId, userId: command.userId },
    });
  }
}
