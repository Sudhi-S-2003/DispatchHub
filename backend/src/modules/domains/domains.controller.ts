import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DomainsService } from './domains.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/v1/domains')
@UseGuards(AuthGuard)
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Post()
  async createDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { domainName?: string; name?: string },
  ) {
    const domainName = (body.domainName || body.name || '').trim();
    const result = await this.domainsService.createDomain(user.id, domainName);
    return { success: true, data: result.domain, dnsInstructions: result.dnsInstructions };
  }

  @Post(':id/verify')
  async verifyDomain(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.domainsService.verifyDomain(id, user.id, user.role);
    return { success: true, data: result.domain, verificationCheck: result.verificationCheck };
  }

  @Get()
  async listDomains(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
  ) {
    const targetAccountId = user.role === 'ADMIN' ? accountId : user.id;
    const domains = await this.domainsService.listDomains(targetAccountId, user.role);
    return { success: true, data: domains };
  }

  @Get(':id')
  async getDomain(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const domain = await this.domainsService.getDomain(id, user.id, user.role);
    return { success: true, data: domain };
  }

  @Delete(':id')
  async deleteDomain(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.domainsService.deleteDomain(id, user.id, user.role);
  }
}
