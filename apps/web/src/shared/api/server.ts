import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_TOKEN_COOKIE } from '@/shared/config/auth';
import { apiFetch, ApiError, type RequestOptions } from './client';

/**
 * Обёртка над apiFetch для Server Components/Actions: сама читает access-токен
 * из httpOnly-cookie и подставляет его в Authorization. Токен читается напрямую
 * через cookies() (а не из entities/session), чтобы shared не зависел от entities.
 *
 * Протухший или отозванный токен (401 от API) уводит на /login — иначе страница
 * молча падает в error boundary без объяснения причины.
 */
export async function serverApiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  try {
    return await apiFetch<T>(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }
}
