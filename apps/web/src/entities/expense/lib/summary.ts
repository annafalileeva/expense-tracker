import type { CategoryTotal, ExpenseDto } from '../model/types';

const UNCATEGORIZED_ID = 'uncategorized';

function toCents(amount: string): number {
  return Math.round(Number.parseFloat(amount) * 100);
}

export interface ExpenseSummary {
  total: number;
  count: number;
  average: number;
}

/**
 * Валюты не конвертируются — суммы просто складываются как есть.
 * При смешанных валютах в выборке итог формально некорректен.
 */
export function summarizeExpenses(expenses: ExpenseDto[]): ExpenseSummary {
  const totalCents = expenses.reduce((sum, expense) => sum + toCents(expense.amount), 0);
  const count = expenses.length;
  const averageCents = count > 0 ? Math.round(totalCents / count) : 0;

  return { total: totalCents / 100, count, average: averageCents / 100 };
}

export function groupByCategory(expenses: ExpenseDto[]): CategoryTotal[] {
  const totalsCents = new Map<string, CategoryTotal & { totalCents: number }>();

  for (const expense of expenses) {
    const key = expense.category?.id ?? UNCATEGORIZED_ID;
    const existing = totalsCents.get(key);

    if (existing) {
      existing.totalCents += toCents(expense.amount);
      continue;
    }

    totalsCents.set(key, {
      id: key,
      name: expense.category?.name ?? 'Без категории',
      color: expense.category?.color,
      total: 0,
      totalCents: toCents(expense.amount),
    });
  }

  return Array.from(totalsCents.values())
    .map(({ totalCents, ...rest }) => ({ ...rest, total: totalCents / 100 }))
    .sort((a, b) => b.total - a.total);
}
