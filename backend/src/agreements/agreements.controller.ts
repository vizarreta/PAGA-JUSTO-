import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
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
    return this.agreementsService.createAgreement({
      clientAddress: data.client,
      freelancerAddress: data.freelancer,
      token: data.token,
      totalAmount: parseFloat(data.totalAmount),
      milestones: data.milestones.map(m => parseFloat(m)),
      termsHash: data.termsHash,
    });
  }

  @Get()
  async getUserAgreements(@Query('address') address: string) {
    if (!address) {
      return { error: 'Address query parameter required' };
    }
    return this.agreementsService.getUserAgreements(address);
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

  @Post(':id/milestones/:index/submit')
  async submitMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() data: {
      freelancer: string;
      evidenceHash: string;
      evidenceUrl: string;
      description: string;
    },
  ) {
    return this.agreementsService.submitMilestone(
      id,
      parseInt(index, 10),
      data.freelancer,
      data.evidenceHash,
      data.evidenceUrl,
      data.description,
    );
  }

  @Post(':id/milestones/:index/changes')
  async requestChanges(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body('client') client: string,
  ) {
    return this.agreementsService.requestChanges(
      id,
      parseInt(index, 10),
      client,
    );
  }

  @Post(':id/milestones/:index/approve')
  async approveMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() data: {
      client: string;
      txHash: string;
    },
  ) {
    return this.agreementsService.approveMilestone(
      id,
      parseInt(index, 10),
      data.client,
      data.txHash,
    );
  }

  @Post(':id/resolution')
  async openResolution(
    @Param('id') id: string,
    @Body('address') address: string,
  ) {
    return this.agreementsService.openResolution(id, address);
  }

  @Post(':id/settlement')
  async proposeSettlement(
    @Param('id') id: string,
    @Body() data: {
      proposedByRole: string;
      clientAmount: number;
      freelancerAmount: number;
      description: string;
    },
  ) {
    return this.agreementsService.proposeSettlement(
      id,
      data.proposedByRole,
      data.clientAmount,
      data.freelancerAmount,
      data.description,
    );
  }

  @Post(':id/settlement/:proposalId/accept')
  async acceptSettlement(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body('address') address: string,
  ) {
    return this.agreementsService.acceptSettlement(id, proposalId, address);
  }

  @Post(':id/milestone')
  async updateMilestone(
    @Param('id') id: string,
    @Body('milestoneIndex') milestoneIndex: number,
    @Body('amount') amount: string,
  ) {
    return this.agreementsService.updateMilestone(id, milestoneIndex, parseFloat(amount));
  }
}