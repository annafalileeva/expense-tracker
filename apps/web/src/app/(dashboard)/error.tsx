'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="secondary" onClick={reset}>
        Попробовать снова
      </Button>
    </div>
  );
}
