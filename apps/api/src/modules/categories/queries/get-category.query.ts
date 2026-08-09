import { Query } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';

export class GetCategoryQuery extends Query<Category> {
  constructor(
    readonly userId: string,
    readonly categoryId: string,
  ) {
    super();
  }
}
