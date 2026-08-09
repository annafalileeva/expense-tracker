import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@expence-tracker/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Generator "prisma-client" (Prisma 7) требует явный driver adapter — в
  // отличие от прежнего prisma-client-js со встроенным query-движком.
  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.get<string>('databaseUrl') }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Подключение к PostgreSQL установлено');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
