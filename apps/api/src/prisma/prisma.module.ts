import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global: PrismaService нужен почти каждому модулю фичи,
// импортировать PrismaModule в каждый из них было бы шумом.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
