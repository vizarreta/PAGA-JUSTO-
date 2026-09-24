import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StrKey } from '@stellar/stellar-sdk';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { verifyWalletMessage } from './wallet-signature';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async getChallenge(publicKey: string) {
    if (typeof publicKey !== 'string' || !StrKey.isValidEd25519PublicKey(publicKey))
      throw new BadRequestException('Dirección Stellar inválida');
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const message = `PagaJusto — iniciar sesión\nOrigen: ${origin}\nRed: Stellar Testnet\nWallet: ${publicKey}\nNonce: ${nonce}\nExpira: ${expiresAt.toISOString()}\nEsta firma no autoriza pagos ni acepta acuerdos.`;
    await this.prisma.authChallenge.create({ data: { nonce, address: publicKey, message, expiresAt } });
    return { nonce, message, expiresAt: expiresAt.toISOString() };
  }

  async verifySignature(publicKey: string, signature: string, nonce: string) {
    if (typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce) || typeof publicKey !== 'string')
      throw new UnauthorizedException('Desafío inválido');
    const challenge = await this.prisma.authChallenge.findUnique({ where: { nonce } });
    if (!challenge || challenge.address !== publicKey || challenge.usedAt || challenge.expiresAt <= new Date())
      throw new UnauthorizedException('Desafío expirado, utilizado o inválido');
    if (!verifyWalletMessage(publicKey, challenge.message, signature))
      throw new UnauthorizedException('Firma inválida');
    // A conditional UPDATE prevents replay across concurrent requests and API instances.
    const used = await this.prisma.authChallenge.updateMany({
      where: { nonce, address: publicKey, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) throw new UnauthorizedException('Desafío ya utilizado o expirado');
    const user = await this.prisma.user.upsert({
      where: { address: publicKey }, update: {}, create: { address: publicKey, publicKey },
    });
    return { valid: true, token: this.jwtService.sign({ sub: user.id, address: user.address }),
      user: { id: user.id, address: user.address } };
  }

  getUserById(id: string) { return this.prisma.user.findUnique({ where: { id } }); }
  getUserByAddress(address: string) { return this.prisma.user.findUnique({ where: { address } }); }
}
