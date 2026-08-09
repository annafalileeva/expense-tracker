import { Command } from '@nestjs/cqrs';
import type { Category } from '@expence-tracker/database';

export interface CreateCategoryPayload {
  name: string;
  color?: string;
  icon?: string;
}

export class CreateCategoryCommand extends Command<Category> {
  constructor(
    readonly userId: string,
    readonly payload: CreateCategoryPayload,
  ) {
    super();
  }
}
