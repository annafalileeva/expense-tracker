import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Фильтры списка расходов. Основной сценарий — траты пользователя за период,
 * под него в схеме есть индекс [userId, spentAt]. userId в фильтр не входит —
 * он берётся из токена, а не от клиента.
 */
export class QueryExpensesDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;
}
