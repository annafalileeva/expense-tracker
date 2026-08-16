'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/shared/api/client';
import { flattenZodErrors } from '@/shared/lib/zod-errors';
import { updateExpense } from '@/entities/expense';
import { expenseSchema, type ExpenseFormState } from '../model/schema';

// id приходит через .bind(null, id) на клиенте — см. expense-form.tsx.
export async function updateExpenseAction(
  id: string,
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
    await updateExpense(id, parsed.data);
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
