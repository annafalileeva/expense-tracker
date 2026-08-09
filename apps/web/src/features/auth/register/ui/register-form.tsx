'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { registerAction, type RegisterFormState } from '../api/register.action';

const initialState: RegisterFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Регистрация…' : 'Зарегистрироваться'}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="name">Имя</Label>
        <Input id="name" name="name" type="text" autoComplete="name" maxLength={100} required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Повтор пароля</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-sm text-destructive">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="agreedToTerms"
          name="agreedToTerms"
          required
          aria-invalid={Boolean(state.fieldErrors?.agreedToTerms)}
          className="mt-0.5"
        />
        <div className="space-y-1.5">
          {/* Обычный <label>, а не shadcn Label: у Label display: flex, из-за
              чего текст и ссылки переносятся отдельными колонками, а не как
              единый абзац. leading-none — как у shadcn Label: без него
              text-sm добавляет отступ над буквами, и items-start выравнивает
              чекбокс по этому отступу, а не по верху текста. */}
          <label htmlFor="agreedToTerms" className="text-sm leading-none text-muted-foreground">
            Согласен с{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              пользовательским соглашением
            </Link>{' '}
            и{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              политикой обработки данных
            </Link>
          </label>
          {state.fieldErrors?.agreedToTerms ? (
            <p className="text-sm text-destructive">{state.fieldErrors.agreedToTerms}</p>
          ) : null}
        </div>
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-primary underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
