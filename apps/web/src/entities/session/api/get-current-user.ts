import type { UserDto } from '@/entities/user';
import { serverApiFetch } from '@/shared/api/server';

/** Текущий пользователь по cookie-токену. На 401 serverApiFetch сам уводит на /login. */
export function getCurrentUser(): Promise<UserDto> {
  return serverApiFetch<UserDto>('/auth/me', { cache: 'no-store' });
}
