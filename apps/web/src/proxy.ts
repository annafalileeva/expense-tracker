import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/shared/config/auth';
// Импорт напрямую из lib/, а не через баррель @/entities/session: баррель тянет
// lib/cookie.ts с директивой 'server-only', которая не предназначена для
// edge-рантайма proxy (бывший middleware).
import { isJwtExpired } from '@/entities/session/lib/decode-jwt';

const AUTH_PATHS = new Set(['/login', '/register']);
// Ссылки из формы регистрации (соглашение/политика) — доступны без сессии
// и не участвуют в редиректах для авторизованных/неавторизованных.
const PUBLIC_PATHS = new Set(['/terms', '/privacy']);

/**
 * Быстрый UX-редирект по наличию и сроку годности cookie — подпись JWT здесь
 * не проверяется (это делает API на каждом запросе). Отозванный, но ещё не
 * просроченный токен ловит serverApiFetch по 401 и уводит на /login отдельно.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasValidSession = Boolean(token) && !isJwtExpired(token as string);

  if (hasValidSession && AUTH_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!hasValidSession && !AUTH_PATHS.has(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);

    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
