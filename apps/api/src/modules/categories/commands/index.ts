// Другие модули импортируют отсюда только классы команд, не handler'ы.
export * from './create-category.command';
export * from './update-category.command';
export * from './delete-category.command';

import { CreateCategoryHandler } from './create-category.handler';
import { UpdateCategoryHandler } from './update-category.handler';
import { DeleteCategoryHandler } from './delete-category.handler';

export const CategoriesCommandHandlers = [
  CreateCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
];
