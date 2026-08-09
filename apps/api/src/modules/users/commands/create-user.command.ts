import { Command } from '@nestjs/cqrs';
import type { UserView } from '../user.mapper';

export class CreateUserCommand extends Command<UserView> {
  constructor(
    readonly name: string,
    readonly email: string,
    readonly passwordHash: string,
  ) {
    super();
  }
}
