import type { ZodError } from 'zod';

/**
 * Первая ошибка на каждое поле верхнего уровня — достаточно для подсветки
 * под инпутом. Бэкенд свои 400-ошибки с полями не связывает (см.
 * ValidationPipe), так что привязка к полям — целиком клиентская функция.
 */
export function flattenZodErrors<T extends string>(error: ZodError): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0] as T | undefined;
    if (key && !result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}
