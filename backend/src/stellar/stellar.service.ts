import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly horizonServer =
    new (require('@stellar/stellar-sdk').SorobanRpc.Server)(
      'https://soroban-testnet.stellar.org',
    );

  constructor(private readonly prisma: PrismaService) {}

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
    // Return the Friendbot URL for the frontend to use
    const friendbotUrl = `https://friendbot.stellar.org?addr=${publicKey}`;
    return friendbotUrl;
  }

  async createChallengeTransaction(
    publicKey: string,
    nonce: string,
  ): Promise<string> {
    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const account = await this.horizonServer.getAccount(publicKey);

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.manageData({
          name: 'paga-justo-challenge',
          value: nonce,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const xdr = transaction.toXDR();
      this.logger.log(`Challenge transaction created for ${publicKey}`);
      return xdr;
    } catch (error) {
      this.logger.error(`Failed to create challenge tx: ${error}`);
      throw new Error('Failed to create challenge transaction');
    }
  }

  async simulateTransaction(xdr: string) {
    try {
      const simResult = await this.horizonServer.simulateTransaction(xdr);
      return simResult;
    } catch (error) {
      this.logger.error(`Simulation failed: ${error}`);
      throw new Error('Transaction simulation failed');
    }
  }
}