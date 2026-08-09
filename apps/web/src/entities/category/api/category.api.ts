import type { CategoryDto } from '../model/types';
import { serverApiFetch } from '@/shared/api/server';

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

export function listCategories(): Promise<CategoryDto[]> {
  return serverApiFetch<CategoryDto[]>('/categories', { cache: 'no-store' });
}

export function getCategory(id: string): Promise<CategoryDto> {
  return serverApiFetch<CategoryDto>(`/categories/${id}`, { cache: 'no-store' });
}

export function createCategory(input: CategoryInput): Promise<CategoryDto> {
  return serverApiFetch<CategoryDto>('/categories', { method: 'POST', body: input });
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategoryDto> {
  return serverApiFetch<CategoryDto>(`/categories/${id}`, { method: 'PATCH', body: input });
}

export function deleteCategory(id: string): Promise<void> {
  return serverApiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
