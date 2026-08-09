import { Command } from '@nestjs/cqrs';

export class DeleteCategoryCommand extends Command<void> {
  constructor(
    readonly userId: string,
    readonly categoryId: string,
  ) {
    super();
  }
}
