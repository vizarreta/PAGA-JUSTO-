import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from './stellar.service';

@Module({
  providers: [PrismaService, StellarService],
  exports: [StellarService],
})
export class StellarModule {}