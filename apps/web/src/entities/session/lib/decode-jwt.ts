export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Декодирует payload JWT без проверки подписи — подпись уже проверена бэкендом
 * на каждом запросе. Нужен только exp, чтобы middleware мог отсеять явно
 * просроченный токен без похода в API. atob доступен в Edge Runtime.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  return payload === null || payload.exp * 1000 <= Date.now();
}
