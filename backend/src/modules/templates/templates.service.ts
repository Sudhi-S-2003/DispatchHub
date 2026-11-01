import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTemplateDto } from './templates.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async createTemplate(dto: CreateTemplateDto) {
    // Auto-detect variables if not provided
    let vars = dto.variables;
    if (!vars || vars.length === 0) {
      const regex = /\{\{\s*([\w.-]+)\s*\}\}/g;
      const found = new Set<string>();
      let match;
      const combined = `${dto.subject} ${dto.htmlContent} ${dto.plainContent || ''}`;
      while ((match = regex.exec(combined)) !== null) {
        found.add(match[1]);
      }
      vars = Array.from(found);
    }

    return this.prisma.template.create({
      data: {
        accountId: dto.accountId,
        name: dto.name,
        category: dto.category,
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        plainContent: dto.plainContent,
        variables: vars,
      },
    });
  }

  async listTemplates(accountId: string) {
    return this.prisma.template.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(templateId: string, accountId?: string, userRole?: Role) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    if (userRole && userRole !== Role.ADMIN && template.accountId !== accountId) {
      throw new ForbiddenException('You do not have permission to view this template');
    }

    return template;
  }

  async deleteTemplate(templateId: string, accountId?: string, userRole?: Role) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    if (userRole && userRole !== Role.ADMIN && template.accountId !== accountId) {
      throw new ForbiddenException('You do not have permission to delete this template');
    }

    return this.prisma.template.delete({
      where: { id: templateId },
    });
  }
}
