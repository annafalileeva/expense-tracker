import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { toUserView, UserView } from '../user.mapper';
import { GetUserByIdQuery } from './get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, UserView> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByIdQuery): Promise<UserView> {
    const user = await this.prisma.user.findUnique({ where: { id: query.id } });

    if (!user) {
      throw new NotFoundException(`Пользователь ${query.id} не найден`);
    }

    return toUserView(user);
  }
}
