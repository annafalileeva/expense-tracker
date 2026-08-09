'use server';

import { redirect } from 'next/navigation';
import { clearSessionCookie } from '@/entities/session';

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
