'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/shared/api/client';
import { flattenZodErrors } from '@/shared/lib/zod-errors';
import { createExpense } from '@/entities/expense';
import { expenseSchema, type ExpenseFormState } from '../model/schema';

export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = expenseSchema.safeParse({
    amount: formData.get('amount'),
    spentAt: formData.get('spentAt'),
    categoryId: formData.get('categoryId'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    return {
      fieldErrors: flattenZodErrors<'amount' | 'spentAt' | 'categoryId' | 'note'>(parsed.error),
    };
  }

  try {
    await createExpense(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message };
    }
    throw error;
  }

  revalidatePath('/expenses');
  revalidatePath('/');
  redirect('/expenses');
}
