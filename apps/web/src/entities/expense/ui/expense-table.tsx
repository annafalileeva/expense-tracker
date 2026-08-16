import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { ExpenseDto } from '../model/types';
import { Button } from '@/shared/ui/button';
import { Table, Td, Th } from '@/shared/ui/table';
import { formatDate, formatMoney } from '@/shared/lib/format';

interface ExpenseTableProps {
  expenses: ExpenseDto[];
  /** Показывать колонку действий (редактирование). В дашборде — только просмотр. */
  editable?: boolean;
}

export function ExpenseTable({ expenses, editable = false }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        Расходов пока нет
      </div>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Дата</Th>
          <Th>Категория</Th>
          <Th>Комментарий</Th>
          <Th className="text-right">Сумма</Th>
          {editable ? (
            <Th className="w-0">
              <span className="sr-only">Действия</span>
            </Th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <Td>{formatDate(expense.spentAt)}</Td>
            <Td>{expense.category?.name ?? '—'}</Td>
            <Td className="text-muted-foreground">{expense.note ?? '—'}</Td>
            <Td className="text-right font-medium tabular-nums text-expense">
              {formatMoney(expense.amount, expense.currency)}
            </Td>
            {editable ? (
              <Td>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Редактировать расход"
                    asChild
                  >
                    <Link href={`/expenses/${expense.id}/edit`}>
                      <Pencil />
                    </Link>
                  </Button>
                </div>
              </Td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
