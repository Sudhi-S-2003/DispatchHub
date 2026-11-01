import { Module } from '@nestjs/common';
import { DomainsService } from './domains.service.js';
import { DomainsController } from './domains.controller.js';
import { DnsVerificationService } from './dns-verification.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [DomainsController],
  providers: [DomainsService, DnsVerificationService],
  exports: [DomainsService, DnsVerificationService],
})
export class DomainsModule {}
