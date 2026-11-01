import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('api/v1/campaigns')
@UseGuards(AuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  async listCampaigns(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.campaignsService.listCampaigns(user.id, user.role, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      status,
      category,
    });
  }

  @Get('pending-approvals')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async listPendingApprovals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignsService.listPendingApprovals(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  async getCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.getCampaign(id, user.id, user.role);
  }

  @Post(':id/pause')
  async pauseCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.pauseCampaign(id, user.id, user.role);
  }

  @Post(':id/resume')
  async resumeCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.resumeCampaign(id, user.id, user.role);
  }
}
