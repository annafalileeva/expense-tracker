import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { GetUserByEmailQuery } from '../../users/queries';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { TokenService } from '../token.service';
import { LoginCommand } from './login.command';

const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

// Валидный bcrypt-хэш несуществующего пароля: без него ветка "email не найден"
// была бы заметно быстрее ветки "пароль не совпал" и позволяла бы перебором
// узнавать, какие email зарегистрированы.
const DUMMY_HASH = '$2b$12$9zSTngi.HPBcjex50f/gxud8gHFABezvJ/I4V0nBKq2avYs8RjkLa';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResponseDto> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResponseDto> {
    const user = await this.queryBus.execute(new GetUserByEmailQuery(command.email));

    const passwordMatches = await bcrypt.compare(command.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    // user — UserWithCredentials (несёт passwordHash для сверки выше);
    // наружу через HTTP уходит только публичное представление.
    const { passwordHash: _passwordHash, ...view } = user;

    return { accessToken: this.tokenService.sign(view), user: view };
  }
}
