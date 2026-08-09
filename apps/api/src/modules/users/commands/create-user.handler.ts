import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { toUserView, UserView } from '../user.mapper';
import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserView> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateUserCommand): Promise<UserView> {
    const user = await this.prisma.user.create({
      data: {
        name: command.name,
        email: command.email,
        passwordHash: command.passwordHash,
      },
    });

    return toUserView(user);
  }
}
