import type { UserDto } from '@/entities/user';
import { apiFetch } from '@/shared/api/client';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

// Публичные роуты — токен не передаём, используем apiFetch напрямую (не serverApiFetch).
export function loginRequest(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

export function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input });
}
