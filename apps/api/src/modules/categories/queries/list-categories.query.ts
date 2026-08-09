import { Query } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';

export class ListCategoriesQuery extends Query<Category[]> {
  constructor(
    readonly userId: string,
    readonly skip: number,
    readonly take: number,
  ) {
    super();
  }
}
