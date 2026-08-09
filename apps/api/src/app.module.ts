import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env лежит в корне монорепозитория, а процесс запускается из apps/api
      envFilePath: join(__dirname, '..', '..', '..', '.env'),
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    // AuthModule регистрирует глобальный JwtAuthGuard (APP_GUARD) и не импортирует
    // UsersModule — обращается к users только через CommandBus/QueryBus.
    AuthModule,
    CategoriesModule,
    ExpensesModule,
  ],
})
export class AppModule {}
