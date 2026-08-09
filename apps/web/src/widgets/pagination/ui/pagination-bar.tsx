import type { Route } from 'next';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';
import { getPageRange } from '@/shared/lib/pagination';

interface PaginationBarProps {
  page: number;
  total: number;
  limit: number;
  basePath: string;
  /** Прочие query-параметры (фильтры), которые нужно сохранить при переходе по страницам. */
  searchParams?: Record<string, string>;
}

export function PaginationBar({ page, total, limit, basePath, searchParams }: PaginationBarProps) {
  const pageCount = Math.ceil(total / limit);

  if (pageCount <= 1) {
    return null;
  }

  const hrefFor = (targetPage: number): Route => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(targetPage));

    return `${basePath}?${params.toString()}` as Route;
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">Всего: {total}</p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefFor(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
          {getPageRange(page, pageCount).map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink href={hrefFor(item)} isActive={item === page}>
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href={hrefFor(Math.min(pageCount, page + 1))}
              aria-disabled={page >= pageCount}
              className={page >= pageCount ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
