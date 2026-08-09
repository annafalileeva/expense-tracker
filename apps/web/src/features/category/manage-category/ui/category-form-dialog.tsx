'use client';

import { type ReactNode, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { CategoryDto } from '@/entities/category';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { createCategoryAction } from '../api/create-category.action';
import { updateCategoryAction } from '../api/update-category.action';
import type { CategoryFormState } from '../model/schema';

const initialState: CategoryFormState = {};
const DEFAULT_COLOR = '#7c3aed';

interface CategoryFormDialogProps {
  /** Если передана — диалог редактирует эту категорию, иначе создаёт новую. */
  category?: CategoryDto;
  trigger: ReactNode;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
    </Button>
  );
}

export function CategoryFormDialog({ category, trigger }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const action = category ? updateCategoryAction.bind(null, category.id) : createCategoryAction;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{category ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle>
            <DialogDescription>
              {category
                ? 'Измените название или цвет категории.'
                : 'Укажите название и цвет новой категории.'}
            </DialogDescription>
          </DialogHeader>

          {state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name}
              maxLength={60}
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
            {state.fieldErrors?.name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="color">Цвет</Label>
            <Input
              id="color"
              name="color"
              type="color"
              defaultValue={category?.color ?? DEFAULT_COLOR}
              className="h-9 w-16 p-1"
              aria-invalid={Boolean(state.fieldErrors?.color)}
            />
            {state.fieldErrors?.color ? (
              <p className="text-sm text-destructive">{state.fieldErrors.color}</p>
            ) : null}
          </div>

          <DialogFooter>
            <SubmitButton isEdit={Boolean(category)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
