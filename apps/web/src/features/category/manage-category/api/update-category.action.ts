'use server';

import { revalidatePath } from 'next/cache';
import { ApiError } from '@/shared/api/client';
import { flattenZodErrors } from '@/shared/lib/zod-errors';
import { updateCategory } from '@/entities/category';
import { categorySchema, type CategoryFormState } from '../model/schema';

// id приходит через .bind(null, id) на клиенте, поэтому сюда его подставляет
// не форма, а сам вызов действия — см. category-form-dialog.tsx.
export async function updateCategoryAction(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors<'name' | 'color'>(parsed.error) };
  }

  try {
    await updateCategory(id, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message };
    }
    throw error;
  }

  revalidatePath('/categories');
  return { success: true };
}
