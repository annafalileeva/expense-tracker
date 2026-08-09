import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListCategoriesQuery } from './list-categories.query';

@QueryHandler(ListCategoriesQuery)
export class ListCategoriesHandler implements IQueryHandler<ListCategoriesQuery, Category[]> {
  constructor(private readonly prisma: PrismaService) {}

  execute(query: ListCategoriesQuery): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId: query.userId },
      skip: query.skip,
      take: query.take,
      orderBy: { name: 'asc' },
    });
  }
}
