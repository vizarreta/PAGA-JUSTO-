import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChainPendingGuard } from './chain-pending.guard';
import { createHash } from 'node:crypto';
import { StrKey } from '@stellar/stellar-sdk';
import { canonicalJson, termsSchema } from '@pagajusto/shared';

// Monetary values are integer stroops in PostgreSQL and strings in JSON.
function d(val: bigint | null | undefined): string {
  return val?.toString() ?? '0';
}

@Injectable()
export class AgreementsService {
  private readonly logger = new Logger(AgreementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDraft(input: unknown, creatorAddress: string) {
    const result = termsSchema.safeParse(input);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    const terms = result.data;
    if (terms.clientAddress !== creatorAddress || !StrKey.isValidEd25519PublicKey(terms.clientAddress) ||
      !StrKey.isValidEd25519PublicKey(terms.freelancerAddress))
      throw new BadRequestException('El cliente debe ser la wallet autenticada y las direcciones deben ser válidas.');
    if (terms.version !== 1) throw new BadRequestException('Un nuevo acuerdo empieza en la versión 1.');
    const termsHash = createHash('sha256').update(canonicalJson(terms), 'utf8').digest('hex');
    const resultRow = await this.createAgreement({
      clientAddress: terms.clientAddress, freelancerAddress: terms.freelancerAddress,
      token: 'XLM', totalAmount: terms.totalBudgetStroops, termsHash, termsJson: terms,
      milestones: terms.milestones.map(m => ({ ...m, amount: m.amountStroops })),
    });
    return this.toView(resultRow);
  }

  private toView(row: any) {
    const terms = row.termsJson ?? {};
    // This is an index, never a confirmed balance until RPC reconciliation is implemented.
    const deposited = d(row.deposited);
    const paid = d(row.paid);
    const refunded = d(row.refunded);
    return { ...row, title: terms.title ?? 'Acuerdo', network: 'testnet', chainVerified: false,
      totalAmount: d(row.totalAmount), deposited, paid, refunded,
      pending: (BigInt(deposited) - BigInt(paid) - BigInt(refunded)).toString(),
      settlements: row.settlements?.map((p: any) => ({ ...p, referenceBalance: d(p.referenceBalance), clientAmount: d(p.clientAmount), freelancerAmount: d(p.freelancerAmount) })),
      canonicalTerms: termsSchema.safeParse(terms).success ? canonicalJson(terms) : null,
      milestones: row.milestones?.map((m: any) => ({ ...m, amount: d(m.amount) })),
      transactions: row.transactions?.map((t: any) => ({ ...t, amount: d(t.amount), verified: false })),
    };
  }

  async getPrivateAgreement(id: string, address: string) {
    const row = await this.getAgreement(id);
    if (!row || (row.clientAddress !== address && row.freelancerAddress !== address))
      throw new NotFoundException('Acuerdo no encontrado');
    return this.toView(row);
  }

  // ────────────────────────────────────────────
  // CREATE
  // ────────────────────────────────────────────

  private async createAgreement(data: {
    clientAddress: string;
    freelancerAddress: string;
    token: string;
    totalAmount: string;        // integer stroops string
    termsHash: string;
    termsJson?: any;
    milestones: Array<{
      index: number;
      title?: string;
      description?: string;
      acceptanceCriteria?: string[];
      amount: string;           // integer stroops string
      dueDate?: string;
    }>;
  }) {
    if (data.clientAddress === data.freelancerAddress) {
      throw new BadRequestException('Client and freelancer must be different wallets');
    }

    // Aseguramos que los usuarios existan (upsert)
    await this.prisma.user.upsert({
      where: { address: data.clientAddress },
      update: {},
      create: { address: data.clientAddress, publicKey: data.clientAddress },
    });
    await this.prisma.user.upsert({
      where: { address: data.freelancerAddress },
      update: {},
      create: { address: data.freelancerAddress, publicKey: data.freelancerAddress },
    });

    const agreement = await this.prisma.agreement.create({
      data: {
        clientAddress: data.clientAddress,
        freelancerAddress: data.freelancerAddress,
        token: data.token,
        totalAmount: BigInt(data.totalAmount),
        status: 'Created',
        milestoneCount: data.milestones.length,
        currentMilestone: 0,
        termsHash: data.termsHash,
        termsJson: data.termsJson ?? {},
        milestones: {
          create: data.milestones.map((m) => ({
            index: m.index,
            title: m.title ?? `Hito ${m.index + 1}`,
            description: m.description,
            acceptanceCriteria: m.acceptanceCriteria ?? [],
            amount: BigInt(m.amount),
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
          })),
        },
      },
      include: { milestones: { orderBy: { index: 'asc' } } },
    });

    this.logger.log(`Agreement created: ${agreement.id}`);
    return agreement;
  }

  // ────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────

  async getAgreement(id: string) {
    return this.prisma.agreement.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { index: 'asc' } },
        evidences: { orderBy: { submittedAt: 'desc' } },
        transactions: { orderBy: { submittedAt: 'desc' } },
        settlements: { orderBy: { proposedAt: 'desc' } },
        agentActivities: { orderBy: { executedAt: 'desc' }, take: 20 },
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  async getUserAgreements(address: string) {
    const rows = await this.prisma.agreement.findMany({
      where: {
        OR: [{ clientAddress: address }, { freelancerAddress: address }],
      },
      include: {
        milestones: { orderBy: { index: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(row => this.toView(row));
  }

  // Financial actions stay unavailable until the API verifies signatures and RPC effects.
  async acceptTerms(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async fundAgreement(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async submitMilestone(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async requestChanges(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async approveMilestone(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async openResolution(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async proposeSettlement(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
  async acceptSettlement(..._args: unknown[]): Promise<never> { return new ChainPendingGuard().canActivate(); }
}
