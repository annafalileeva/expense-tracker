import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Базовый класс для query-DTO со списками.
 * Наследуется фильтрами конкретных фич (например, QueryExpensesDto).
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * Смещение для Prisma `skip`, вычисленное из `page`/`limit` (со значениями
   * по умолчанию 1 и 20, если поля не заданы).
   *
   * @returns Количество записей, которые нужно пропустить.
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }

  /**
   * Размер страницы для Prisma `take`.
   *
   * @returns Количество записей на странице (по умолчанию 20).
   */
  get take(): number {
    return this.limit ?? 20;
  }
}
