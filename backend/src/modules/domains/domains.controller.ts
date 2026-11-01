import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { DomainsService } from './domains.service.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('api/v1/domains')
export class DomainsController {
  constructor(
    private domainsService: DomainsService,
    private authService: AuthService,
  ) {}

  @Post()
  async createDomain(
    @Body() body: { accountId?: string; domainName?: string; name?: string },
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const targetAccountId = body.accountId || authResult?.account?.id;
    if (!targetAccountId) {
      throw new UnauthorizedException('Authentication credentials (JWT or X-API-Key) required');
    }

    const domainName = (body.domainName || body.name || '').trim();
    const result = await this.domainsService.createDomain(targetAccountId, domainName);
    return { success: true, data: result.domain, dnsInstructions: result.dnsInstructions };
  }

  @Post(':id/verify')
  async verifyDomain(@Param('id') id: string) {
    const result = await this.domainsService.verifyDomain(id);
    return { success: true, data: result.domain, verificationCheck: result.verificationCheck };
  }

  @Get()
  async listDomains(
    @Query('accountId') accountId?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const effectiveAccountId =
      accountId || (authResult?.account?.role === 'ADMIN' ? undefined : authResult?.account?.id);

    if (!effectiveAccountId && !accountId) {
      // If admin, return all
      const allDomains = await this.domainsService.listDomains(authResult?.account?.id || '');
      return { success: true, data: allDomains };
    }

    const domains = await this.domainsService.listDomains(effectiveAccountId || accountId || '');
    return { success: true, data: domains };
  }

  @Get(':id')
  async getDomain(@Param('id') id: string) {
    const domain = await this.domainsService.getDomain(id);
    return { success: true, data: domain };
  }
}
