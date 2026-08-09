'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/shared/api/client';
import { flattenZodErrors } from '@/shared/lib/zod-errors';
import { registerRequest, setSessionCookie } from '@/entities/session';
import { registerSchema, type RegisterFieldErrors } from '../model/schema';

export interface RegisterFormState {
  message?: string;
  fieldErrors?: RegisterFieldErrors;
}

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    agreedToTerms: formData.get('agreedToTerms'),
  });

  if (!parsed.success) {
    return {
      fieldErrors: flattenZodErrors<
        'name' | 'email' | 'password' | 'confirmPassword' | 'agreedToTerms'
      >(parsed.error),
    };
  }

  // confirmPassword и agreedToTerms — только для клиентской проверки, в DTO
  // бэкенда их нет (ValidationPipe с forbidNonWhitelisted отверг бы лишнее поле).
  const { name, email, password } = parsed.data;

  try {
    const { accessToken } = await registerRequest({ name, email, password });
    await setSessionCookie(accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message };
    }
    throw error;
  }

  redirect('/');
}
