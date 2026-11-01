import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      apiKey?: string;
    },
  ) {
    return this.authService.login(body.email, body.apiKey);
  }

  @Get('me')
  async getMe(
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    if (!authResult) {
      throw new UnauthorizedException('Missing or invalid authentication credentials (JWT or X-API-Key)');
    }
    return authResult.account;
  }
}
