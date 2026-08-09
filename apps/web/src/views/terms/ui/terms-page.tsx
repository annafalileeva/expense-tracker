import Link from 'next/link';

// TODO: заменить заглушку на реальный текст пользовательского соглашения.
export function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Пользовательское соглашение</h1>
      <p className="text-sm text-muted-foreground">Здесь будет текст соглашения.</p>
      <Link href="/register" className="text-primary underline">
        Вернуться к регистрации
      </Link>
    </main>
  );
}
