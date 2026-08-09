import { ConflictException } from '@nestjs/common';
import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { CreateUserCommand } from '../../users/commands';
import { GetUserByEmailQuery } from '../../users/queries';
import type { UserView, UserWithCredentials } from '../../users/queries';
import type { TokenService } from '../token.service';
import { RegisterCommand } from './register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let tokenService: { sign: jest.Mock };
  let handler: RegisterHandler;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    tokenService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    handler = new RegisterHandler(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      tokenService as unknown as TokenService,
    );
  });

  it('бросает 409, если email уже занят', async () => {
    const existing: UserWithCredentials = {
      id: 'existing',
      email: 'anna@example.com',
      name: 'Аня',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hash',
    };
    queryBus.execute.mockResolvedValue(existing);

    await expect(
      handler.execute(new RegisterCommand('Аня', 'anna@example.com', 'secret123')),
    ).rejects.toThrow(ConflictException);

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('проверяет занятость email через GetUserByEmailQuery', async () => {
    queryBus.execute.mockResolvedValue(null);
    commandBus.execute.mockResolvedValue({
      id: 'new-user',
      email: 'anna@example.com',
      name: 'Аня',
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserView);

    await handler.execute(new RegisterCommand('Аня', 'anna@example.com', 'secret123'));

    const query = queryBus.execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetUserByEmailQuery);
    expect(query.email).toBe('anna@example.com');
  });

  it('хэширует пароль перед CreateUserCommand — сырой пароль в команду не попадает', async () => {
    queryBus.execute.mockResolvedValue(null);
    const createdUser: UserView = {
      id: 'new-user',
      email: 'anna@example.com',
      name: 'Аня',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    commandBus.execute.mockResolvedValue(createdUser);

    const result = await handler.execute(new RegisterCommand('Аня', 'anna@example.com', 'secret123'));

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const command = commandBus.execute.mock.calls[0][0];
    expect(command).toBeInstanceOf(CreateUserCommand);
    expect(command.name).toBe('Аня');
    expect(command.email).toBe('anna@example.com');
    expect(command.passwordHash).not.toBe('secret123');
    await expect(bcrypt.compare('secret123', command.passwordHash)).resolves.toBe(true);

    expect(tokenService.sign).toHaveBeenCalledWith(createdUser);
    expect(result).toEqual({ accessToken: 'signed-jwt', user: createdUser });
  });
});
