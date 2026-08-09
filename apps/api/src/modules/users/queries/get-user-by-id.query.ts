import { Query } from '@nestjs/cqrs';
import type { UserView } from '../user.mapper';

export class GetUserByIdQuery extends Query<UserView> {
  constructor(readonly id: string) {
    super();
  }
}
