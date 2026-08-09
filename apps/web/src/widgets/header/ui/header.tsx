import Link from 'next/link';
import { Button } from '@/shared/ui/button';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Link href="/expenses/new">
        <Button>Добавить расход</Button>
      </Link>
    </header>
  );
}
