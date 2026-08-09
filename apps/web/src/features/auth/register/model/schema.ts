import { z } from 'zod';

// Зеркалит RegisterDto бэкенда (apps/api/src/modules/auth/dto/register.dto.ts):
// name 1..100, email — формат, password 8..72 (72 — предел bcrypt).
// confirmPassword существует только на клиенте и никогда не уходит в API —
// ValidationPipe с forbidNonWhitelisted отверг бы лишнее поле.
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите имя').max(100, 'Имя слишком длинное'),
    email: z.string().trim().toLowerCase().pipe(z.email('Некорректный email')),
    password: z
      .string()
      .min(8, 'Пароль должен быть не короче 8 символов')
      .max(72, 'Пароль должен быть не длиннее 72 символов'),
    confirmPassword: z.string(),
    // Чекбокс-инпут шлёт 'on' при отметке и отсутствует в FormData иначе —
    // z.literal ловит оба случая одним правилом.
    agreedToTerms: z.literal('on', {
      message: 'Нужно согласиться с пользовательским соглашением и политикой обработки данных',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type RegisterFieldErrors = Partial<
  Record<'name' | 'email' | 'password' | 'confirmPassword' | 'agreedToTerms', string>
>;
