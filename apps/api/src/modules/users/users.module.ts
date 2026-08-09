import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersController } from './users.controller';
import { UsersCommandHandlers } from './commands';
import { UsersQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [...UsersCommandHandlers, ...UsersQueryHandlers],
})
export class UsersModule {}
