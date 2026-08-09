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
import type { Category } from '@expence-tracker/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { UserView } from '../users/queries';
import { CreateCategoryCommand, DeleteCategoryCommand, UpdateCategoryCommand } from './commands';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GetCategoryQuery, ListCategoriesQuery } from './queries';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: UserView,
    @Query() query: PaginationQueryDto,
  ): Promise<Category[]> {
    return this.queryBus.execute(new ListCategoriesQuery(user.id, query.skip, query.take));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserView,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Category> {
    return this.queryBus.execute(new GetCategoryQuery(user.id, id));
  }

  @Post()
  create(@CurrentUser() user: UserView, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.commandBus.execute(new CreateCategoryCommand(user.id, dto));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserView,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.commandBus.execute(new UpdateCategoryCommand(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: UserView, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.commandBus.execute(new DeleteCategoryCommand(user.id, id));
  }
}
