import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteUserCommand } from './delete-user.command';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, void> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    await this.prisma.user.delete({ where: { id: command.userId } });
  }
}
