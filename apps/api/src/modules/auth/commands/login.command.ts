import { Command } from '@nestjs/cqrs';
import type { AuthResponseDto } from '../dto/auth-response.dto';

export class LoginCommand extends Command<AuthResponseDto> {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {
    super();
  }
}
