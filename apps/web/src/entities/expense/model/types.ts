import type { Expense } from '@expence-tracker/database';
import type { CategoryDto } from '@/entities/category';

export type { Expense };

/**
 * То, что реально приходит по HTTP: Decimal сериализуется в строку,
 * даты — в ISO-строки. Не путать с типами Prisma.
 */
export type ExpenseDto = Omit<Expense, 'amount' | 'spentAt' | 'createdAt' | 'updatedAt'> & {
  amount: string;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  category?: CategoryDto | null;
};

export interface ExpenseFilters {
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CategoryTotal {
  id: string;
  name: string;
  color?: string | null;
  total: number;
}
