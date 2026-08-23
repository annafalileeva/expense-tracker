import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Table({ children }: { children: ReactNode }) {
  // Обёртка со скроллом: на узких экранах таблица не должна ломать вёрстку
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_16px_32px_-20px_rgb(0_0_0_/_0.16)]">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-border px-5 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-5 py-3.5', className)} {...props} />;
}
