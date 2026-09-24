import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('challenge')
  async getChallenge(@Body('publicKey') publicKey: string) {
    return this.authService.getChallenge(publicKey);
  }

  @Post('verify')
  async verifySignature(
    @Body('publicKey') publicKey: string,
    @Body('signature') signature: string,
    @Body('nonce') nonce: string,
  ) {
    return this.authService.verifySignature(publicKey, signature, nonce);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return req.user;
  }
}