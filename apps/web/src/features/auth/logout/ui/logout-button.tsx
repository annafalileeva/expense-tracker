'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/shared/ui/button';
import { logoutAction } from '../api/logout.action';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      disabled={pending}
    >
      {pending ? 'Выход…' : 'Выйти'}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}
