import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

/**
 * Тело запроса `PATCH /expenses/:id`. Все поля `CreateExpenseDto` становятся
 * опциональными; полей, отличающих update от create, пока нет, поэтому
 * дополнительный `OmitType` не нужен.
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
