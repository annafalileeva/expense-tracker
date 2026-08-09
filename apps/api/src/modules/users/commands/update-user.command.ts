import { Command } from '@nestjs/cqrs';
import type { UserView } from '../user.mapper';

export interface UpdateUserChanges {
  name?: string;
  email?: string;
}

export class UpdateUserCommand extends Command<UserView> {
  constructor(
    readonly userId: string,
    readonly changes: UpdateUserChanges,
  ) {
    super();
  }
}
