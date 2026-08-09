export * from './list-categories.query';
export * from './get-category.query';

import { ListCategoriesHandler } from './list-categories.handler';
import { GetCategoryHandler } from './get-category.handler';

export const CategoriesQueryHandlers = [ListCategoriesHandler, GetCategoryHandler];
