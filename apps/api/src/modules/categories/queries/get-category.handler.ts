import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetCategoryQuery } from './get-category.query';

@QueryHandler(GetCategoryQuery)
export class GetCategoryHandler implements IQueryHandler<GetCategoryQuery, Category> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCategoryQuery): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id: query.categoryId, userId: query.userId },
    });

    if (!category) {
      throw new NotFoundException(`Категория ${query.categoryId} не найдена`);
    }

    return category;
  }
}
