import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller';
import { CategoriesCommandHandlers } from './commands';
import { CategoriesQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [...CategoriesCommandHandlers, ...CategoriesQueryHandlers],
})
export class CategoriesModule {}
