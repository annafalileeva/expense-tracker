export function parsePageParam(value: string | undefined): number {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export type PageRangeItem = number | 'ellipsis';

/** Окно вида `1 … 4 5 6 … 14`: первая, последняя и соседи текущей страницы. */
export function getPageRange(page: number, pageCount: number): PageRangeItem[] {
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const result: PageRangeItem[] = [];

  for (const [index, value] of sorted.entries()) {
    if (index > 0 && value - sorted[index - 1]! > 1) {
      result.push('ellipsis');
    }

    result.push(value);
  }

  return result;
}
