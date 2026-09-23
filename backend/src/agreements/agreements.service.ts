import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgreementsService {
  private readonly logger = new Logger(AgreementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAgreement(data: {
    clientAddress: string;
    freelancerAddress: string;
    token: string;
    totalAmount: number;
    milestones: number[];
    termsHash: string;
  }) {
    const termsHashBytes = Buffer.from(data.termsHash, 'utf-8');

    const agreement = await this.prisma.agreement.create({
      data: {
        clientAddress: data.clientAddress,
        freelancerAddress: data.freelancerAddress,
        token: data.token,
        totalAmount: data.totalAmount,
        deposited: 0,
        paid: 0,
        refunded: 0,
        status: 'Created',
        milestoneCount: BigInt(data.milestones.length),
        currentMilestone: BigInt(0),
        termsHash: termsHashBytes as any,
      },
    });

    return agreement;
  }

  async getAgreement(id: string) {
    return this.prisma.agreement.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { index: 'asc' } },
        evidences: { orderBy: { submittedAt: 'desc' } },
        transactions: { orderBy: { submittedAt: 'desc' } },
        settlements: { orderBy: { proposedAt: 'desc' } },
        agentActivities: { orderBy: { executedAt: 'desc' }, take: 20 },
      },
    });
  }

  async getUserAgreements(address: string) {
    return this.prisma.agreement.findMany({
      where: {
        OR: [
          { clientAddress: address },
          { freelancerAddress: address },
        ],
      },
      include: {
        milestones: { orderBy: { index: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fundAgreement(agreementId: string, clientAddress: string) {
    this.logger.log(`Funding agreement ${agreementId}`);

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.clientAddress !== clientAddress) {
      throw new BadRequestException('Only client can fund the agreement');
    }

    if (agreement.status !== 'Created') {
      throw new BadRequestException('Agreement is not in Created status');
    }

    return this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: 'Funded',
        deposited: agreement.totalAmount,
        fundedAt: new Date(),
      },
    });
  }

  async submitMilestone(
    agreementId: string,
    milestoneIndex: number,
    freelancerAddress: string,
    evidenceHash: string,
    evidenceUrl: string,
    description: string,
  ) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.freelancerAddress !== freelancerAddress) {
      throw new BadRequestException('Only freelancer can submit milestones');
    }

    if (agreement.status !== 'Funded' && agreement.status !== 'Active') {
      throw new BadRequestException('Agreement must be funded or active');
    }

    const milestone = agreement.milestones.find((m: any) => m.index === BigInt(milestoneIndex));
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'pending' && milestone.status !== 'changes_requested') {
      throw new BadRequestException('Milestone not in submittable state');
    }

    const nextVersion = (milestone as any).evidences 
      ? (milestone as any).evidences.length + 1 
      : 1;

    await this.prisma.$transaction([
      this.prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          status: 'delivered',
          evidenceHash,
          evidenceUrl,
          deliveredAt: new Date(),
        },
      }),
      this.prisma.evidence.create({
        data: {
          agreementId,
          milestoneIndex: BigInt(milestoneIndex),
          submittedByRole: 'freelancer',
          hash: evidenceHash,
          url: evidenceUrl,
          description,
          version: nextVersion,
        },
      }),
      this.prisma.agentActivity.create({
        data: {
          agreementId,
          tool: 'submit_milestone',
          input: { milestoneIndex, evidenceHash, evidenceUrl },
          output: { status: 'delivered' },
          reason: `Freelancer submitted milestone ${milestoneIndex + 1}`,
        },
      }),
    ]);

    return this.getAgreement(agreementId);
  }

  async requestChanges(
    agreementId: string,
    milestoneIndex: number,
    clientAddress: string,
  ) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.clientAddress !== clientAddress) {
      throw new BadRequestException('Only client can request changes');
    }

    if (agreement.status !== 'Active' && agreement.status !== 'Funded') {
      throw new BadRequestException('Agreement must be active');
    }

    const milestone = agreement.milestones.find((m: any) => m.index === BigInt(milestoneIndex));
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'delivered') {
      throw new BadRequestException('Milestone must be delivered to request changes');
    }

    await this.prisma.$transaction([
      this.prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'changes_requested' },
      }),
      this.prisma.agentActivity.create({
        data: {
          agreementId,
          tool: 'request_changes',
          input: { milestoneIndex },
          output: { status: 'changes_requested' },
          reason: `Client requested changes on milestone ${milestoneIndex + 1}`,
        },
      }),
    ]);

    return this.getAgreement(agreementId);
  }

  async approveMilestone(
    agreementId: string,
    milestoneIndex: number,
    clientAddress: string,
    txHash: string,
  ) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.clientAddress !== clientAddress) {
      throw new BadRequestException('Only client can approve milestones');
    }

    if (agreement.status !== 'Active' && agreement.status !== 'Funded') {
      throw new BadRequestException('Agreement must be active');
    }

    const milestone = agreement.milestones.find((m: any) => m.index === BigInt(milestoneIndex));
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'delivered') {
      throw new BadRequestException('Milestone must be delivered before approval');
    }

    const newPaid = agreement.paid + milestone.amount;
    const nextMilestoneIndex = Number(agreement.currentMilestone) + 1;
    const isComplete = nextMilestoneIndex >= Number(agreement.milestoneCount);

    await this.prisma.$transaction([
      this.prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      }),
      this.prisma.transaction.create({
        data: {
          agreementId,
          type: 'milestone_payment',
          status: 'confirmed',
          hash: txHash,
          amount: milestone.amount,
          fromAddress: agreement.clientAddress,
          toAddress: agreement.freelancerAddress,
          network: 'testnet',
          milestoneIndex: BigInt(milestoneIndex),
          confirmedAt: new Date(),
        },
      }),
      this.prisma.agentActivity.create({
        data: {
          agreementId,
          tool: 'approve_milestone',
          input: { milestoneIndex, txHash },
          output: { status: 'paid', amount: milestone.amount },
          reason: `Client approved milestone ${milestoneIndex + 1}`,
        },
      }),
      this.prisma.agreement.update({
        where: { id: agreementId },
        data: {
          paid: newPaid,
          currentMilestone: BigInt(nextMilestoneIndex),
          status: isComplete ? 'Completed' : 'Active',
          completedAt: isComplete ? new Date() : undefined,
        },
      }),
    ]);

    return this.getAgreement(agreementId);
  }

  async openResolution(agreementId: string, address: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const isParticipant = agreement.clientAddress === address || agreement.freelancerAddress === address;
    if (!isParticipant) {
      throw new BadRequestException('Only participants can open resolution');
    }

    if (agreement.status === 'Completed' || agreement.status === 'ClosedBySettlement') {
      throw new BadRequestException('Cannot open resolution on completed agreement');
    }

    return this.prisma.agreement.update({
      where: { id: agreementId },
      data: { status: 'InResolution' },
    });
  }

  async proposeSettlement(
    agreementId: string,
    proposedByRole: string,
    clientAmount: number,
    freelancerAmount: number,
    description: string,
  ) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.status !== 'InResolution') {
      throw new BadRequestException('Agreement must be in resolution');
    }

    const existingProposal = await this.prisma.settlementProposal.findFirst({
      where: { agreementId, status: { in: ['proposed', 'accepted'] } },
    });

    if (existingProposal) {
      throw new BadRequestException('Active settlement proposal already exists');
    }

    const remaining = agreement.deposited - agreement.paid - agreement.refunded;
    const totalProposed = clientAmount + freelancerAmount;

    if (Math.abs(totalProposed - remaining) > 0.000001) {
      throw new BadRequestException(`Proposed amounts must sum to remaining balance: ${remaining}`);
    }

    return this.prisma.settlementProposal.create({
      data: {
        agreementId,
        proposedByRole,
        referenceBalance: remaining,
        clientAmount,
        freelancerAmount,
        description,
        status: 'proposed',
      },
    });
  }

  async acceptSettlement(agreementId: string, proposalId: string, address: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const proposal = await this.prisma.settlementProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.agreementId !== agreementId) {
      throw new NotFoundException('Proposal not found');
    }

    const isProposer = proposal.proposedByRole === 'client' 
      ? agreement.clientAddress === address 
      : agreement.freelancerAddress === address;

    if (isProposer) {
      throw new BadRequestException('Proposer cannot accept their own proposal');
    }

    if (proposal.status !== 'proposed') {
      throw new BadRequestException('Proposal not in proposed state');
    }

    const isClient = agreement.clientAddress === address;
    const isFreelancer = agreement.freelancerAddress === address;

    if (!isClient && !isFreelancer) {
      throw new BadRequestException('Only participants can accept settlement');
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.settlementProposal.update({
        where: { id: proposalId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      if (proposal.clientAmount > 0) {
        await tx.transaction.create({
          data: {
            agreementId,
            type: 'refund',
            status: 'confirmed',
            amount: proposal.clientAmount,
            fromAddress: agreement.clientAddress,
            toAddress: agreement.clientAddress,
            network: 'testnet',
            confirmedAt: new Date(),
          },
        });
        await tx.agreement.update({
          where: { id: agreementId },
          data: { refunded: { increment: proposal.clientAmount } },
        });
      }

      if (proposal.freelancerAmount > 0) {
        await tx.transaction.create({
          data: {
            agreementId,
            type: 'settlement',
            status: 'confirmed',
            amount: proposal.freelancerAmount,
            fromAddress: agreement.freelancerAddress,
            toAddress: agreement.freelancerAddress,
            network: 'testnet',
            confirmedAt: new Date(),
          },
        });
        await tx.agreement.update({
          where: { id: agreementId },
          data: { paid: { increment: proposal.freelancerAmount } },
        });
      }

      await tx.settlementProposal.update({
        where: { id: proposalId },
        data: { status: 'executed', executedAt: new Date() },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          status: 'ClosedBySettlement',
          completedAt: new Date(),
        },
      });

      await tx.agentActivity.create({
        data: {
          agreementId,
          tool: 'accept_settlement',
          input: { proposalId },
          output: { clientAmount: proposal.clientAmount, freelancerAmount: proposal.freelancerAmount },
          reason: 'Settlement accepted and executed',
        },
      });

      return this.getAgreement(agreementId);
    });
  }

  async updateMilestone(agreementId: string, milestoneIndex: number, amount: number) {
    return this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        currentMilestone: BigInt(milestoneIndex),
        paid: amount,
      },
    });
  }
}