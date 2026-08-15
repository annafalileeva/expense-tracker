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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Expense } from '@expence-tracker/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import type { UserView } from '../users/queries';
import { CreateExpenseCommand, DeleteExpenseCommand, UpdateExpenseCommand } from './commands';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { GetExpenseQuery, ListExpensesQuery } from './queries';

/**
 * REST-контроллер расходов текущего пользователя.
 * Инжектит только CommandBus/QueryBus (CQRS) — сам не обращается к Prisma,
 * бизнес-логика лежит в handler'ах commands/ и queries/.
 */
@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Возвращает постраничный список расходов текущего пользователя
   * с опциональными фильтрами по категории и периоду.
   *
   * @param user - текущий пользователь, извлекается декоратором `@CurrentUser()` из JWT.
   * @param query - параметры фильтрации (categoryId, from, to) и пагинации (page, limit).
   * @returns Постраничный список расходов пользователя.
   * @throws {UnauthorizedException} Если запрос пришёл без валидного JWT (глобальный `JwtAuthGuard`).
   * @throws {BadRequestException} Если параметры запроса не проходят валидацию `QueryExpensesDto`.
   */
  @ApiOperation({ summary: 'Постраничный список расходов текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Список расходов с пагинацией' })
  @ApiResponse({ status: 400, description: 'Невалидные параметры фильтрации/пагинации' })
  @ApiResponse({ status: 401, description: 'Отсутствует или невалиден JWT' })
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

  /**
   * Возвращает один расход по id, если он принадлежит текущему пользователю.
   *
   * @param user - текущий пользователь.
   * @param id - UUID расхода.
   * @returns Найденный расход (с включённой категорией).
   * @throws {BadRequestException} Если `id` не является валидным UUID (`ParseUUIDPipe`).
   * @throws {NotFoundException} Если расход не найден или принадлежит другому пользователю.
   */
  @ApiOperation({ summary: 'Получить один расход по id' })
  @ApiResponse({ status: 200, description: 'Расход найден' })
  @ApiResponse({ status: 400, description: '`id` не является валидным UUID' })
  @ApiResponse({ status: 401, description: 'Отсутствует или невалиден JWT' })
  @ApiResponse({ status: 404, description: 'Расход не найден или принадлежит другому пользователю' })
  @Get(':id')
  findOne(@CurrentUser() user: UserView, @Param('id', ParseUUIDPipe) id: string): Promise<Expense> {
    return this.queryBus.execute(new GetExpenseQuery(user.id, id));
  }

  /**
   * Создаёт новый расход для текущего пользователя.
   *
   * @param user - текущий пользователь, которому будет принадлежать расход.
   * @param dto - данные создаваемого расхода.
   * @returns Созданный расход.
   * @throws {BadRequestException} Если тело запроса не проходит валидацию `CreateExpenseDto`.
   * @throws {NotFoundException} Если указана `categoryId`, но такой категории у пользователя нет.
   */
  @ApiOperation({ summary: 'Создать расход для текущего пользователя' })
  @ApiResponse({ status: 201, description: 'Расход создан' })
  @ApiResponse({ status: 400, description: 'Тело запроса не прошло валидацию' })
  @ApiResponse({ status: 401, description: 'Отсутствует или невалиден JWT' })
  @ApiResponse({ status: 404, description: 'Указанная categoryId не найдена у пользователя' })
  @Post()
  create(@CurrentUser() user: UserView, @Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.commandBus.execute(new CreateExpenseCommand(user.id, dto));
  }

  /**
   * Частично обновляет расход, если он принадлежит текущему пользователю.
   *
   * @param user - текущий пользователь.
   * @param id - UUID обновляемого расхода.
   * @param dto - поля для обновления (все опциональны).
   * @returns Обновлённый расход.
   * @throws {BadRequestException} Если `id` не UUID или тело запроса не проходит валидацию.
   * @throws {NotFoundException} Если указана `categoryId`, не принадлежащая пользователю.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если расход не найден или
   *   принадлежит другому пользователю — глобальный `PrismaExceptionFilter` превращает его в 404.
   */
  @ApiOperation({ summary: 'Частично обновить расход текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Расход обновлён' })
  @ApiResponse({ status: 400, description: '`id` не UUID или тело запроса не прошло валидацию' })
  @ApiResponse({ status: 401, description: 'Отсутствует или невалиден JWT' })
  @ApiResponse({
    status: 404,
    description: 'Расход не найден, принадлежит другому пользователю, или categoryId не найдена',
  })
  @Patch(':id')
  update(
    @CurrentUser() user: UserView,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.commandBus.execute(new UpdateExpenseCommand(user.id, id, dto));
  }

  /**
   * Удаляет расход, если он принадлежит текущему пользователю.
   *
   * @param user - текущий пользователь.
   * @param id - UUID удаляемого расхода.
   * @returns Ничего (204 No Content при успехе).
   * @throws {BadRequestException} Если `id` не является валидным UUID.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если расход не найден или
   *   принадлежит другому пользователю — глобальный `PrismaExceptionFilter` превращает его в 404.
   */
  @ApiOperation({ summary: 'Удалить расход текущего пользователя' })
  @ApiResponse({ status: 204, description: 'Расход удалён' })
  @ApiResponse({ status: 400, description: '`id` не является валидным UUID' })
  @ApiResponse({ status: 401, description: 'Отсутствует или невалиден JWT' })
  @ApiResponse({ status: 404, description: 'Расход не найден или принадлежит другому пользователю' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: UserView, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteExpenseCommand(user.id, id));
  }
}
