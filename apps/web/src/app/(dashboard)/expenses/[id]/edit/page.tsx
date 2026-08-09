import { ExpenseEditPage } from '@/views/expense-edit';

// В Next 16 params — Promise, его нужно дожидаться.
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ExpenseEditPage id={id} />;
}
