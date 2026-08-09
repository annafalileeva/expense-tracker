import 'server-only';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/shared/config/auth';

// Совпадает с JWT_EXPIRES_IN (7d) — cookie не должна пережить валидность токена.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
}
