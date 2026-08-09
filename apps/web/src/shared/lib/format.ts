import { siteConfig } from '@/shared/config/site';

/**
 * Суммы приходят с бэкенда строкой: Prisma сериализует Decimal как string,
 * чтобы не терять точность. Приводим к числу только на этапе отображения.
 */
export function formatMoney(
  amount: string | number,
  currency: string = siteConfig.defaultCurrency,
): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;

  return new Intl.NumberFormat(siteConfig.defaultLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(siteConfig.defaultLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export function formatMonth(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(siteConfig.defaultLocale, {
    month: 'long',
    year: 'numeric',
  }).format(value);
}
