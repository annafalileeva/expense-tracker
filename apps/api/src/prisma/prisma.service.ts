import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@expence-tracker/database';

/**
 * Глобальный Prisma-клиент как Nest-провайдер. Подключается к БД при старте
 * модуля и отключается при его уничтожении; инжектится напрямую в
 * CQRS-хендлеры фич (контроллеры Prisma не видят, см. `apps/api/CLAUDE.md`).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * @param config - `ConfigService`, источник `databaseUrl` для pg-адаптера.
   */
  // Generator "prisma-client" (Prisma 7) требует явный driver adapter — в
  // отличие от прежнего prisma-client-js со встроенным query-движком.
  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.get<string>('databaseUrl') }) });
  }

  /**
   * Хук жизненного цикла Nest: открывает соединение с PostgreSQL при старте модуля.
   *
   * @returns Промис, разрешающийся после установки соединения.
   * @throws {Error} Если подключиться к БД не удалось (невалидная строка соединения, БД недоступна).
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Подключение к PostgreSQL установлено');
  }

  /**
   * Хук жизненного цикла Nest: закрывает соединение с PostgreSQL при остановке модуля.
   *
   * @returns Промис, разрешающийся после закрытия соединения.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
