import { EmailCategory } from '@prisma/client';

export class CreateTemplateDto {
  accountId: string;
  name: string;
  category: EmailCategory;
  subject: string;
  htmlContent: string;
  plainContent?: string;
  variables?: string[];
}
