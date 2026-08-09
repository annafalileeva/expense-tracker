import { z } from 'zod';

// Зеркалит LoginDto бэкенда (apps/api/src/modules/auth/dto/login.dto.ts):
// email — формат, password — просто непустая строка (нижнюю границу проверяет API).
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Некорректный email')),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;
