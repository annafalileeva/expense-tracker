import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { toUserView, UserView } from '../user.mapper';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, UserView> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateUserCommand): Promise<UserView> {
    const user = await this.prisma.user.update({
      where: { id: command.userId },
      data: command.changes,
    });

    return toUserView(user);
  }
}
