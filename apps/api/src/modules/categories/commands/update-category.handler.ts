import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateCategoryCommand } from './update-category.command';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand, Category> {
  constructor(private readonly prisma: PrismaService) {}

  execute(command: UpdateCategoryCommand): Promise<Category> {
    // userId в where — чужой categoryId даёт P2025 (404 через PrismaExceptionFilter),
    // а не 200 с чужой категорией.
    return this.prisma.category.update({
      where: { id: command.categoryId, userId: command.userId },
      data: command.payload,
    });
  }
}
