'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/shared/api/client';
import { flattenZodErrors } from '@/shared/lib/zod-errors';
import { loginRequest, setSessionCookie } from '@/entities/session';
import { loginSchema, type LoginFieldErrors } from '../model/schema';

export interface LoginFormState {
  message?: string;
  fieldErrors?: LoginFieldErrors;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors<'email' | 'password'>(parsed.error) };
  }

  try {
    const { accessToken } = await loginRequest(parsed.data);
    await setSessionCookie(accessToken);
  } catch (error) {
    // 401: бэкенд намеренно не различает "нет такого email" и "неверный пароль".
    if (error instanceof ApiError) {
      return { message: error.message };
    }
    throw error;
  }

  // redirect() бросает служебное исключение — обязательно вне try/catch.
  redirect('/');
}
