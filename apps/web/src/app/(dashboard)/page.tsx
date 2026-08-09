import { DashboardPage } from '@/views/dashboard';
import { parsePageParam } from '@/shared/lib/pagination';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { page } = await searchParams;

  return <DashboardPage page={parsePageParam(page)} />;
}
