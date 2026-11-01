import { EmailCategory, BrandingMode, BrandType } from '@prisma/client';

export class RemoteAttachmentDto {
  filename: string;
  url: string;
  contentType?: string;
}

export class SendSingleMessageDto {
  accountId?: string;
  domainId?: string;
  templateId?: string;
  category?: EmailCategory;
  brandingMode?: BrandingMode;
  brandType?: BrandType;
  footerHtml?: string;
  recipient: string;
  sender?: string;
  subject?: string;
  htmlContent?: string;
  plainContent?: string;
  replyTo?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  parameters?: Record<string, any>;
  attachments?: RemoteAttachmentDto[];
}

export class CampaignRecipientItemDto {
  email: string;
  parameters?: Record<string, any>;
}

export class CreateCampaignBatchDto {
  accountId?: string;
  domainId?: string;
  templateId?: string;
  name: string;
  category: EmailCategory;
  brandingMode: BrandingMode;
  brandType?: BrandType;
  footerHtml?: string;
  sender: string;
  subject: string;
  htmlContent: string;
  plainContent?: string;
  replyTo?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  attachments?: RemoteAttachmentDto[];
  recipients: CampaignRecipientItemDto[];
  scheduledAt?: string;
}
