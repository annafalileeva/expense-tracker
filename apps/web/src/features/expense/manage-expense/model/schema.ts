import { z } from 'zod';

// Зеркалит CreateExpenseDto бэкенда (apps/api/src/modules/expenses/dto/create-expense.dto.ts):
// amount — положительное число, не более 2 знаков после запятой (Decimal(12,2) в схеме),
// spentAt — дата, categoryId — uuid или пусто (без категории), note — до 500 символов.
export const expenseSchema = z.object({
  amount: z.coerce
    .number({ message: 'Введите сумму' })
    .positive('Сумма расхода должна быть больше нуля')
    .refine((value) => Math.round(value * 100) === value * 100, 'Не более двух знаков после запятой'),
  spentAt: z.string().trim().min(1, 'Введите дату'),
  categoryId: z
    .union([z.uuid('Некорректная категория'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
  note: z
    .string()
    .trim()
    .max(500, 'Слишком длинный комментарий')
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type ExpenseFieldErrors = Partial<
  Record<'amount' | 'spentAt' | 'categoryId' | 'note', string>
>;

export interface ExpenseFormState {
  message?: string;
  fieldErrors?: ExpenseFieldErrors;
}
