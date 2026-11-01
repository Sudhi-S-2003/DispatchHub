import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('timeRangeHours') timeRangeHours?: string,
  ) {
    const hours = Number(timeRangeHours) || 24;
    return this.analyticsService.getDashboardMetrics(user.id, user.role, hours);
  }
}
