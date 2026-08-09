import { Command } from '@nestjs/cqrs';
import type { AuthResponseDto } from '../dto/auth-response.dto';

export class RegisterCommand extends Command<AuthResponseDto> {
  constructor(
    readonly name: string,
    readonly email: string,
    readonly password: string,
  ) {
    super();
  }
}
