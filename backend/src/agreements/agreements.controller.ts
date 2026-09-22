import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AgreementsService } from './agreements.service';

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  async createAgreement(@Body() data: {
    client: string;
    freelancer: string;
    token: string;
    totalAmount: string;
    milestones: string[];
    termsHash: string;
  }) {
    return this.agreementsService.createAgreement(data);
  }

  @Get(':id')
  async getAgreement(@Param('id') id: string) {
    return this.agreementsService.getAgreement(id);
  }

  @Post(':id/fund')
  async fundAgreement(
    @Param('id') id: string,
    @Body('client') client: string,
  ) {
    return this.agreementsService.fundAgreement(id, client);
  }

  @Post(':id/milestone')
  async updateMilestone(
    @Param('id') id: string,
    @Body('milestoneIndex') milestoneIndex: number,
    @Body('amount') amount: string,
  ) {
    return this.agreementsService.updateMilestone(id, milestoneIndex, amount);
  }
}