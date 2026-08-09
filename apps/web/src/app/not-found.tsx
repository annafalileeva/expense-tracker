import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <Link href="/" className="text-primary underline">
        Вернуться на дашборд
      </Link>
    </main>
  );
}
