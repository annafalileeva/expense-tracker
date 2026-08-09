import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Expense } from '@expence-tracker/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import type { UserView } from '../users/queries';
import { CreateExpenseCommand, DeleteExpenseCommand, UpdateExpenseCommand } from './commands';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { GetExpenseQuery, ListExpensesQuery } from './queries';

@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: UserView,
    @Query() query: QueryExpensesDto,
  ): Promise<PaginatedResult<Expense>> {
    return this.queryBus.execute(
      new ListExpensesQuery(
        user.id,
        { categoryId: query.categoryId, from: query.from, to: query.to },
        query.page ?? 1,
        query.limit ?? 20,
      ),
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: UserView, @Param('id', ParseUUIDPipe) id: string): Promise<Expense> {
    return this.queryBus.execute(new GetExpenseQuery(user.id, id));
  }

  @Post()
  create(@CurrentUser() user: UserView, @Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.commandBus.execute(new CreateExpenseCommand(user.id, dto));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserView,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.commandBus.execute(new UpdateExpenseCommand(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: UserView, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteExpenseCommand(user.id, id));
  }
}
