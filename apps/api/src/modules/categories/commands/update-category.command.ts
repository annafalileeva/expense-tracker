import { Command } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';

export interface UpdateCategoryPayload {
  name?: string;
  color?: string;
  icon?: string;
}

export class UpdateCategoryCommand extends Command<Category> {
  constructor(
    readonly userId: string,
    readonly categoryId: string,
    readonly payload: UpdateCategoryPayload,
  ) {
    super();
  }
}
