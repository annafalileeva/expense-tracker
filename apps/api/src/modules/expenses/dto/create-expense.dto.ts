import { Type } from 'class-transformer';
import {
  IsDate,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Тело запроса `POST /expenses`. `userId` в DTO нет — он берётся из JWT
 * через `@CurrentUser()`, а не из тела запроса.
 */
export class CreateExpenseDto {
  // maxDecimalPlaces соответствует Decimal(12, 2) в схеме Prisma
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Сумма расхода должна быть больше нуля' })
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsISO4217CurrencyCode({ message: 'currency должен быть кодом валюты, например RUB' })
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsDate()
  @Type(() => Date)
  spentAt!: Date;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
