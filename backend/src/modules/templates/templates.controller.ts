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
import { TemplatesService } from './templates.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { interpolateTemplate, injectFooter } from '../../common/utils/template-parser.util.js';
import { BrandingMode, Role } from '@prisma/client';

@Controller('api/v1/templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  async createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const targetAccountId =
      user.role === Role.ADMIN && body.accountId ? body.accountId : user.id;

    const result = await this.templatesService.createTemplate({
      ...body,
      accountId: targetAccountId,
    });
    return { success: true, data: result };
  }

  @Post('preview')
  async previewTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    let rawHtml = body.htmlContent || '';
    if (body.templateId) {
      const tmpl = await this.templatesService.getTemplate(
        body.templateId,
        user.id,
        user.role,
      );
      if (tmpl) rawHtml = tmpl.htmlContent;
    }

    const variables = body.variables || {};
    const brandingMode = body.isCoBranded ? BrandingMode.CO_BRANDED : BrandingMode.WHITE_LABEL;
    const interpolated = interpolateTemplate(rawHtml, variables);
    const renderedHtml = injectFooter(interpolated, brandingMode, body.customFooterHtml);

    return { success: true, data: { renderedHtml } };
  }

  @Get()
  async listTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
  ) {
    const targetAccountId =
      user.role === Role.ADMIN && accountId ? accountId : user.id;

    const templates = await this.templatesService.listTemplates(targetAccountId);
    return { success: true, data: templates };
  }

  @Get(':id')
  async getTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tmpl = await this.templatesService.getTemplate(id, user.id, user.role);
    return { success: true, data: tmpl };
  }

  @Delete(':id')
  async deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.templatesService.deleteTemplate(id, user.id, user.role);
    return { success: true, data: result };
  }
}
