'use server';

import { revalidatePath } from 'next/cache';
import { ApiError } from '@/shared/api/client';
import { deleteCategory } from '@/entities/category';

export interface DeleteCategoryState {
  success?: boolean;
  message?: string;
}

// id приходит через .bind(null, id) на клиенте — см. delete-category-dialog.tsx.
export async function deleteCategoryAction(
  id: string,
  _prevState: DeleteCategoryState,
  _formData: FormData,
): Promise<DeleteCategoryState> {
  try {
    await deleteCategory(id);
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message };
    }
    throw error;
  }

  revalidatePath('/categories');
  return { success: true };
}
