import { Injectable, Logger } from '@nestjs/common';
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
    const termsHashBytes = Buffer.from(termsHash, 'utf-8');

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
    });
  }

  async fundAgreement(agreementId: string, clientAddress: string) {
    this.logger.log(`Funding agreement ${agreementId}`);

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.status !== 'Created') {
      throw new Error('Agreement is not in Created status');
    }

    return this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: 'Funded',
        deposited: agreement.totalAmount,
      },
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