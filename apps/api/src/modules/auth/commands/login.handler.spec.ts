import { UnauthorizedException } from '@nestjs/common';
import type { QueryBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import type { UserWithCredentials } from '../../users/queries';
import { GetUserByEmailQuery } from '../../users/queries';
import type { TokenService } from '../token.service';
import { LoginCommand } from './login.command';
import { LoginHandler } from './login.handler';

// cost=4 — bcrypt быстрее в тестах, security-параметры не проверяются здесь
const BCRYPT_TEST_COST = 4;

function buildUser(passwordHash: string): UserWithCredentials {
  return {
    id: 'user-1',
    email: 'anna@example.com',
    name: 'Аня',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    passwordHash,
  };
}

describe('LoginHandler', () => {
  let queryBus: { execute: jest.Mock };
  let tokenService: { sign: jest.Mock };
  let handler: LoginHandler;

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    tokenService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    handler = new LoginHandler(queryBus as unknown as QueryBus, tokenService as unknown as TokenService);
  });

  it('обращается к users через GetUserByEmailQuery', async () => {
    queryBus.execute.mockResolvedValue(null);

    await handler.execute(new LoginCommand('nobody@example.com', 'irrelevant')).catch(() => undefined);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    const query = queryBus.execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetUserByEmailQuery);
    expect(query.email).toBe('nobody@example.com');
  });

  it('бросает 401, если пользователь с таким email не найден', async () => {
    queryBus.execute.mockResolvedValue(null);

    await expect(handler.execute(new LoginCommand('nobody@example.com', 'whatever123'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('бросает 401 при неверном пароле', async () => {
    const passwordHash = await bcrypt.hash('correct-password', BCRYPT_TEST_COST);
    queryBus.execute.mockResolvedValue(buildUser(passwordHash));

    await expect(handler.execute(new LoginCommand('anna@example.com', 'wrong-password'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('при верном пароле подписывает токен и не отдаёт passwordHash', async () => {
    const passwordHash = await bcrypt.hash('correct-password', BCRYPT_TEST_COST);
    queryBus.execute.mockResolvedValue(buildUser(passwordHash));

    const result = await handler.execute(new LoginCommand('anna@example.com', 'correct-password'));

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'anna@example.com',
      name: 'Аня',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(tokenService.sign).toHaveBeenCalledWith(result.user);
  });
});
