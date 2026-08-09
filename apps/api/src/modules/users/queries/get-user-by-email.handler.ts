import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { toUserWithCredentials, UserWithCredentials } from '../user.mapper';
import { GetUserByEmailQuery } from './get-user-by-email.query';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler
  implements IQueryHandler<GetUserByEmailQuery, UserWithCredentials | null>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByEmailQuery): Promise<UserWithCredentials | null> {
    const user = await this.prisma.user.findUnique({ where: { email: query.email } });
    return user ? toUserWithCredentials(user) : null;
  }
}
