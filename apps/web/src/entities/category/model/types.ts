import type { Category } from '@expence-tracker/database';

export type { Category };

export type CategoryDto = Omit<Category, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};
