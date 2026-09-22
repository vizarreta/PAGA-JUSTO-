import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@stellar/stellar-sdk';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private challenges = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getChallenge(publicKey: string) {
    const nonce = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    this.challenges.set(publicKey, { nonce, expiresAt });
    this.logger.log(`Challenge generated for ${publicKey}`);

    return { nonce };
  }

  async verifySignature(publicKey: string, signature: string, nonce: string) {
    const challenge = this.challenges.get(publicKey);

    if (!challenge) {
      throw new Error('No challenge found for this public key');
    }

    if (challenge.nonce !== nonce) {
      throw new Error('Invalid nonce');
    }

    if (Date.now() > challenge.expiresAt) {
      throw new Error('Challenge expired');
    }

    // Verify signature using Stellar SDK
    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const isValid = keypair.verify(
        Buffer.from(nonce, 'utf-8'),
        Buffer.from(signature, 'base64'),
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      this.challenges.delete(publicKey);
      this.logger.log(`Signature verified for ${publicKey}`);

      return { valid: true };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Signature verification failed: ${err.message}`);
      throw new Error('Signature verification failed');
    }
  }
}