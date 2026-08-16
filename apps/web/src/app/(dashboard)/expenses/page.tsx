import { ExpensesPage } from '@/views/expenses';

interface PageProps {
  searchParams: Promise<{
    categoryId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  return <ExpensesPage searchParams={params} />;
}
