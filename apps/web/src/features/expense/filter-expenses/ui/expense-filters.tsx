'use client';

import type { CategoryDto } from '@/entities/category';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

interface ExpenseFiltersProps {
  categories: CategoryDto[];
}

/**
 * Заглушка фильтров: значения будут прокидываться в searchParams,
 * страница списка перечитает данные на сервере.
 */
export function ExpenseFilters({ categories }: ExpenseFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Select name="categoryId" className="w-48" defaultValue="">
        <option value="">Все категории</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Input name="from" type="date" className="w-44" aria-label="Дата с" />
      <Input name="to" type="date" className="w-44" aria-label="Дата по" />
    </div>
  );
}
