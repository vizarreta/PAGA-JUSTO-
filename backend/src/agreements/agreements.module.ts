import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';

@Module({
  controllers: [AgreementsController],
  providers: [PrismaService, AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}