import { ConflictException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { CreateUserCommand } from '../../users/commands';
import { GetUserByEmailQuery } from '../../users/queries';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { TokenService } from '../token.service';
import { RegisterCommand } from './register.command';

const BCRYPT_COST = 12;

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, AuthResponseDto> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthResponseDto> {
    const existing = await this.queryBus.execute(new GetUserByEmailQuery(command.email));

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(command.password, BCRYPT_COST);
    const user = await this.commandBus.execute(
      new CreateUserCommand(command.name, command.email, passwordHash),
    );

    return { accessToken: this.tokenService.sign(user), user };
  }
}
