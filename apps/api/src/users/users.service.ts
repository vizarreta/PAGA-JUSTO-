import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUser(address: string, publicKey: string) {
    this.logger.log(`Creating user with address ${address}`);

    return this.prisma.user.create({
      data: {
        address,
        publicKey,
        createdAt: new Date(),
      },
    });
  }

  async getUser(address: string) {
    return this.prisma.user.findUnique({
      where: { address },
    });
  }

  async updateProfile(address: string, data: {
    username?: string;
    avatar?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.user.update({
      where: { address },
      data,
    });
  }
}