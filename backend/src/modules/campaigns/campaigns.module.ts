import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignsService } from './campaigns.service.js';
import { ContentGuardService } from './content-guard.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, ContentGuardService],
  exports: [CampaignsService, ContentGuardService],
})
export class CampaignsModule {}
