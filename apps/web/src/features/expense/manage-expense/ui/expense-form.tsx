'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { CategoryDto } from '@/entities/category';
import type { ExpenseDto } from '@/entities/expense';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select } from '@/shared/ui/select';
import { createExpenseAction } from '../api/create-expense.action';
import { updateExpenseAction } from '../api/update-expense.action';
import type { ExpenseFormState } from '../model/schema';

const initialState: ExpenseFormState = {};

interface ExpenseFormProps {
  categories: CategoryDto[];
  expense?: ExpenseDto;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
    </Button>
  );
}

export function ExpenseForm({ categories, expense }: ExpenseFormProps) {
  const action = expense ? updateExpenseAction.bind(null, expense.id) : createExpenseAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <Card className="max-w-md">
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="amount">Сумма</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={expense?.amount}
              required
              aria-invalid={Boolean(state.fieldErrors?.amount)}
            />
            {state.fieldErrors?.amount ? (
              <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="spentAt">Дата</Label>
            <Input
              id="spentAt"
              name="spentAt"
              type="date"
              defaultValue={expense?.spentAt.slice(0, 10)}
              required
              aria-invalid={Boolean(state.fieldErrors?.spentAt)}
            />
            {state.fieldErrors?.spentAt ? (
              <p className="text-sm text-destructive">{state.fieldErrors.spentAt}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="categoryId">Категория</Label>
            <Select
              id="categoryId"
              name="categoryId"
              defaultValue={expense?.categoryId ?? ''}
              aria-invalid={Boolean(state.fieldErrors?.categoryId)}
            >
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {state.fieldErrors?.categoryId ? (
              <p className="text-sm text-destructive">{state.fieldErrors.categoryId}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Комментарий</Label>
            <Input
              id="note"
              name="note"
              defaultValue={expense?.note ?? ''}
              maxLength={500}
              aria-invalid={Boolean(state.fieldErrors?.note)}
            />
            {state.fieldErrors?.note ? (
              <p className="text-sm text-destructive">{state.fieldErrors.note}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <SubmitButton isEdit={Boolean(expense)} />
            <Button type="button" variant="outline" asChild>
              <Link href="/expenses">Отмена</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
