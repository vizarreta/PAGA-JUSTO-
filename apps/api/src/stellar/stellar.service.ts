import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Asset, Keypair, Networks, rpc as SorobanRpc } from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly rpcServer: SorobanRpc.Server;

  constructor(private readonly prisma: PrismaService) {
    this.rpcServer = new SorobanRpc.Server(
      process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    );
  }

  async getPublicKey(secretKey: string): Promise<string> {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      return keypair.publicKey();
    } catch (error) {
      this.logger.error(`Failed to derive public key: ${error}`);
      throw new Error('Invalid secret key');
    }
  }

  async fundAccount(publicKey: string): Promise<string> {
    // Devuelve la URL de Friendbot para que el frontend la use
    return `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  }

  async getAccountBalance(publicKey: string): Promise<string | null> {
    try {
      const network = await this.rpcServer.getNetwork();
      if (network.passphrase !== Networks.TESTNET) throw new Error('RPC no corresponde a Testnet');
      const result = await this.rpcServer.getAssetBalance(publicKey, Asset.native(), Networks.TESTNET);
      return result.balanceEntry?.amount ?? null;
    } catch {
      return null;
    }
  }

  async checkTransactionStatus(txHash: string): Promise<{
    status: 'success' | 'failed' | 'unknown';
    result?: any;
  }> {
    try {
      const response = await this.rpcServer.getTransaction(txHash);
      const status = (response as any).status as string;
      if (status === 'SUCCESS') return { status: 'success', result: response };
      if (status === 'FAILED') return { status: 'failed', result: response };
      return { status: 'unknown' };
    } catch {
      return { status: 'unknown' };
    }
  }

  getNetwork() {
    return {
      name: 'testnet',
      passphrase: Networks.TESTNET,
      horizonUrl: process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
      rpcUrl: process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    };
  }
}
