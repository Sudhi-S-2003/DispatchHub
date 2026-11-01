import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service.js';
import { AuthService } from '../auth/auth.service.js';
import { interpolateTemplate, injectFooter } from '../../common/utils/template-parser.util.js';
import { BrandingMode } from '@prisma/client';

@Controller('api/v1/templates')
export class TemplatesController {
  constructor(
    private templatesService: TemplatesService,
    private authService: AuthService,
  ) {}

  @Post()
  async createTemplate(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const accountId = body.accountId || authResult?.account?.id;
    if (!accountId) throw new UnauthorizedException('Authentication required');

    const result = await this.templatesService.createTemplate({
      ...body,
      accountId,
    });
    return { success: true, data: result };
  }

  @Post('preview')
  async previewTemplate(@Body() body: any) {
    let rawHtml = body.htmlContent || '';
    if (body.templateId) {
      const tmpl = await this.templatesService.getTemplate(body.templateId);
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
    @Query('accountId') accountId?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const targetAccountId = accountId || authResult?.account?.id || '';

    const templates = await this.templatesService.listTemplates(targetAccountId);
    return { success: true, data: templates };
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    const tmpl = await this.templatesService.getTemplate(id);
    return { success: true, data: tmpl };
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    const result = await this.templatesService.deleteTemplate(id);
    return { success: true, data: result };
  }
}
