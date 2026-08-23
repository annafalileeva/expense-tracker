import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Header } from '@/widgets/header';
import { ExpenseFilters } from '@/features/expense/filter-expenses';
import { listExpenses, ExpenseTable } from '@/entities/expense';
import { listCategories } from '@/entities/category';
import { PaginationBar } from '@/widgets/pagination';
import { Button } from '@/shared/ui/button';
import { parsePageParam } from '@/shared/lib/pagination';

interface ExpensesPageProps {
  searchParams: {
    categoryId?: string;
    from?: string;
    to?: string;
    page?: string;
  };
}

export async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { categoryId, from, to } = searchParams;
  const page = parsePageParam(searchParams.page);

  const [categories, expenses] = await Promise.all([
    listCategories(),
    listExpenses({
      categoryId,
      from,
      // Дата "по" без времени должна включать весь день, иначе расходы,
      // записанные позже полуночи, выпадают из выборки (см. gte/lte в
      // ListExpensesHandler на бэкенде).
      to: to ? `${to}T23:59:59.999` : undefined,
      page,
    }),
  ]);

  const filterParams: Record<string, string> = {
    ...(categoryId ? { categoryId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  return (
    <>
      <Header
        title="Расходы"
        description="Полный список ваших трат с фильтрами по категории и дате."
        action={
          <Link href="/expenses/new">
            <Button size="lg">
              <Plus className="size-4" />
              Добавить расход
            </Button>
          </Link>
        }
      />
      <main className="space-y-4 p-8 pt-6">
        <Suspense fallback={null}>
          <ExpenseFilters categories={categories} />
        </Suspense>
        <ExpenseTable expenses={expenses.items} editable />
        <PaginationBar
          page={expenses.page}
          total={expenses.total}
          limit={expenses.limit}
          basePath="/expenses"
          searchParams={filterParams}
        />
      </main>
    </>
  );
}
