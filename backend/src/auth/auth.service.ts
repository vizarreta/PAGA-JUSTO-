import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@stellar/stellar-sdk';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private challenges = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
      throw new UnauthorizedException('No challenge found for this public key');
    }

    if (challenge.nonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (Date.now() > challenge.expiresAt) {
      throw new UnauthorizedException('Challenge expired');
    }

    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const isValid = keypair.verify(
        Buffer.from(nonce, 'utf-8'),
        Buffer.from(signature, 'base64'),
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      this.challenges.delete(publicKey);
      this.logger.log(`Signature verified for ${publicKey}`);

      // Get or create user
      let user = await this.prisma.user.findUnique({
        where: { address: publicKey },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            address: publicKey,
            publicKey,
          },
        });
      }

      // Generate JWT
      const payload = { sub: user.id, address: user.address };
      const token = this.jwtService.sign(payload);

      return { valid: true, token, user: { id: user.id, address: user.address } };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Signature verification failed: ${err.message}`);
      throw new UnauthorizedException('Signature verification failed');
    }
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async getUserByAddress(address: string) {
    return this.prisma.user.findUnique({ where: { address } });
  }
}