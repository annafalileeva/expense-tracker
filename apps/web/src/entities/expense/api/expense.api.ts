import type { ExpenseDto, ExpenseFilters } from '../model/types';
import { serverApiFetch } from '@/shared/api/server';

export interface ExpenseInput {
  amount: number;
  currency?: string;
  note?: string;
  spentAt: string;
  categoryId?: string;
}

export function listExpenses(filters: ExpenseFilters = {}): Promise<ExpenseDto[]> {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );

  const query = params.size > 0 ? `?${params.toString()}` : '';

  return serverApiFetch<ExpenseDto[]>(`/expenses${query}`, { cache: 'no-store' });
}

export function getExpense(id: string): Promise<ExpenseDto> {
  return serverApiFetch<ExpenseDto>(`/expenses/${id}`, { cache: 'no-store' });
}

export function createExpense(input: ExpenseInput): Promise<ExpenseDto> {
  return serverApiFetch<ExpenseDto>('/expenses', { method: 'POST', body: input });
}

export function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<ExpenseDto> {
  return serverApiFetch<ExpenseDto>(`/expenses/${id}`, { method: 'PATCH', body: input });
}

export function deleteExpense(id: string): Promise<void> {
  return serverApiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });
}
