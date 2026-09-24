import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() data: { address: string; publicKey: string }) {
    return this.usersService.createUser(data.address, data.publicKey);
  }

  @Get(':address')
  async getUser(@Param('address') address: string) {
    return this.usersService.getUser(address);
  }

  @Post(':address/profile')
  async updateProfile(
    @Param('address') address: string,
    @Body() data: {
      username?: string;
      avatar?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.usersService.updateProfile(address, data);
  }
}