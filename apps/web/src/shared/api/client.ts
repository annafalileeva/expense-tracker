const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  // Кеширование Next: списки обычно перезапрашиваем, справочники можно кешировать
  next?: NextFetchRequestConfig;
  /** JWT для заголовка Authorization; на публичные роуты (login/register) не передаётся. */
  token?: string;
};

/**
 * Тонкая обёртка над fetch. Все обращения к Nest API идут через неё,
 * чтобы разбор ошибок и базовый URL жили в одном месте.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, token, ...rest } = options;

  const response = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
      error?: string;
    } | null;

    const message = Array.isArray(payload?.message)
      ? payload.message.join('; ')
      : (payload?.message ?? `Запрос завершился со статусом ${response.status}`);

    throw new ApiError(message, response.status, payload?.error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
