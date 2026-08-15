import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeleteUserCommand, UpdateUserCommand } from './commands';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUserByIdQuery, UserView } from './queries';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  findMe(@CurrentUser() user: UserView): Promise<UserView> {
    return this.queryBus.execute(new GetUserByIdQuery(user.id));
  }

  @Patch('me')
  updateMe(@CurrentUser() user: UserView, @Body() dto: UpdateUserDto): Promise<UserView> {
    return this.commandBus.execute(new UpdateUserCommand(user.id, dto));
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMe(@CurrentUser() user: UserView): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(user.id));
  }
}
