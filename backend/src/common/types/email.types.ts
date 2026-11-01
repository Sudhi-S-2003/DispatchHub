import { EmailCategory, BrandingMode, ApprovalStatus, MessageStatus } from '@prisma/client';

export interface SendSingleMessageDto {
  accountId: string;
  domainId: string;
  templateId?: string;
  category: EmailCategory;
  brandingMode: BrandingMode;
  recipient: string;
  sender: string;
  subject?: string;
  htmlContent?: string;
  plainContent?: string;
  parameters?: Record<string, any>;
}

export interface CampaignRecipientItem {
  email: string;
  parameters?: Record<string, any>;
}

export interface CreateCampaignBatchDto {
  accountId: string;
  domainId: string;
  templateId?: string;
  name: string;
  category: EmailCategory;
  brandingMode: BrandingMode;
  sender: string;
  subject: string;
  htmlContent: string;
  plainContent?: string;
  recipients: CampaignRecipientItem[];
  scheduledAt?: string;
}

export interface ContentGuardAnalysis {
  approvalStatus: ApprovalStatus;
  canAutoApprove: boolean;
  flags: string[];
  reasons: string[];
}
