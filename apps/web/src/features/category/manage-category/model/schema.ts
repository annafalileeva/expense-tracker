import { z } from 'zod';

// Зеркалит CreateCategoryDto бэкенда (apps/api/src/modules/categories/dto/create-category.dto.ts):
// name — 1..60 символов, color — hex-строка (форма отдаёт её через <input type="color">,
// так что она всегда 6-значная и в нижнем регистре).
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(60, 'Слишком длинное название'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Некорректный цвет'),
});

export type CategoryFieldErrors = Partial<Record<'name' | 'color', string>>;

export interface CategoryFormState {
  success?: boolean;
  message?: string;
  fieldErrors?: CategoryFieldErrors;
}
