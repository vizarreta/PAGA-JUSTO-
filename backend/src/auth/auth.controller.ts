import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}