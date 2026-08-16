'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CategoryDto } from '@/entities/category';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

interface ExpenseFiltersProps {
  categories: CategoryDto[];
}

/**
 * Значения читаются/пишутся напрямую в searchParams — страница списка
 * (Server Component) перечитывает данные при каждом изменении URL.
 * Смена любого фильтра сбрасывает page, чтобы не остаться на несуществующей
 * странице пагинации.
 */
export function ExpenseFilters({ categories }: ExpenseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');

    const query = params.toString();
    router.push((query ? `${pathname}?${query}` : pathname) as Route);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        name="categoryId"
        className="w-48"
        defaultValue={searchParams.get('categoryId') ?? ''}
        onChange={(event) => setFilter('categoryId', event.target.value)}
      >
        <option value="">Все категории</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Input
        name="from"
        type="date"
        className="w-44"
        aria-label="Дата с"
        defaultValue={searchParams.get('from') ?? ''}
        onChange={(event) => setFilter('from', event.target.value)}
      />
      <Input
        name="to"
        type="date"
        className="w-44"
        aria-label="Дата по"
        defaultValue={searchParams.get('to') ?? ''}
        onChange={(event) => setFilter('to', event.target.value)}
      />
    </div>
  );
}
