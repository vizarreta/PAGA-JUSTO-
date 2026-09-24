import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChainPendingGuard } from './chain-pending.guard';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  // POST /api/agreements
  @Post()
  async createAgreement(
    @CurrentUser() user: { userId: string; address: string },
    @Body() body: unknown,
  ) {
    return this.agreementsService.createDraft(body, user.address);
  }

  // GET /api/agreements
  @Get()
  async getUserAgreements(@CurrentUser() user: { userId: string; address: string }) {
    return this.agreementsService.getUserAgreements(user.address);
  }

  // GET /api/agreements/:id
  @Get(':id')
  async getAgreement(@Param('id') id: string, @CurrentUser() user: { address: string }) {
    return this.agreementsService.getPrivateAgreement(id, user.address);
  }

  // POST /api/agreements/:id/accept
  @Post(':id/accept')
  @UseGuards(ChainPendingGuard)
  async acceptTerms(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; address: string },
    @Body('signature') signature: string,
  ) {
    return this.agreementsService.acceptTerms(id, user.address, signature, user.userId);
  }

  // POST /api/agreements/:id/fund
  @Post(':id/fund')
  @UseGuards(ChainPendingGuard)
  async fundAgreement(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; address: string },
    @Body('txHash') txHash?: string,
  ) {
    return this.agreementsService.fundAgreement(id, user.address, txHash);
  }

  // POST /api/agreements/:id/milestones/:index/submit
  @Post(':id/milestones/:index/submit')
  @UseGuards(ChainPendingGuard)
  async submitMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: { userId: string; address: string },
    @Body() body: { evidenceHash: string; evidenceUrl: string; description: string },
  ) {
    return this.agreementsService.submitMilestone(
      id,
      parseInt(index, 10),
      user.address,
      body.evidenceHash,
      body.evidenceUrl,
      body.description,
    );
  }

  // POST /api/agreements/:id/milestones/:index/changes
  @Post(':id/milestones/:index/changes')
  @UseGuards(ChainPendingGuard)
  async requestChanges(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: { userId: string; address: string },
  ) {
    return this.agreementsService.requestChanges(id, parseInt(index, 10), user.address);
  }

  // POST /api/agreements/:id/milestones/:index/approve
  @Post(':id/milestones/:index/approve')
  @UseGuards(ChainPendingGuard)
  async approveMilestone(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() user: { userId: string; address: string },
    @Body('txHash') txHash: string,
  ) {
    return this.agreementsService.approveMilestone(
      id,
      parseInt(index, 10),
      user.address,
      txHash,
    );
  }

  // POST /api/agreements/:id/resolution
  @Post(':id/resolution')
  @UseGuards(ChainPendingGuard)
  async openResolution(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; address: string },
  ) {
    return this.agreementsService.openResolution(id, user.address);
  }

  // POST /api/agreements/:id/settlement
  @Post(':id/settlement')
  @UseGuards(ChainPendingGuard)
  async proposeSettlement(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; address: string },
    @Body() body: {
      clientAmount: string;
      freelancerAmount: string;
      description: string;
    },
  ) {
    return this.agreementsService.proposeSettlement(
      id,
      user.address,
      body.clientAmount,
      body.freelancerAmount,
      body.description,
    );
  }

  // POST /api/agreements/:id/settlement/:proposalId/accept
  @Post(':id/settlement/:proposalId/accept')
  @UseGuards(ChainPendingGuard)
  async acceptSettlement(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: { userId: string; address: string },
  ) {
    return this.agreementsService.acceptSettlement(id, proposalId, user.address);
  }
}
