'use client';

import type { CategoryDto } from '@/entities/category';
import type { ExpenseDto } from '@/entities/expense';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select } from '@/shared/ui/select';

interface ExpenseFormProps {
  categories: CategoryDto[];
  expense?: ExpenseDto;
}

/**
 * Заглушка формы: разметка есть, отправка появится вместе с Server Action
 * в задаче на CRUD расходов.
 */
export function ExpenseForm({ categories, expense }: ExpenseFormProps) {
  return (
    <form className="max-w-md space-y-4">
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
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="spentAt">Дата</Label>
        <Input
          id="spentAt"
          name="spentAt"
          type="date"
          defaultValue={expense?.spentAt.slice(0, 10)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="categoryId">Категория</Label>
        <Select id="categoryId" name="categoryId" defaultValue={expense?.categoryId ?? ''}>
          <option value="">Без категории</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="note">Комментарий</Label>
        <Input id="note" name="note" defaultValue={expense?.note ?? ''} />
      </div>

      <Button type="submit" disabled>
        Сохранить
      </Button>
    </form>
  );
}
