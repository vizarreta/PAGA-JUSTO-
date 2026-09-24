import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgreementsModule } from '../agreements/agreements.module';

@Module({
  imports: [AgreementsModule],
  controllers: [AgentController],
})
export class AgentModule {}
