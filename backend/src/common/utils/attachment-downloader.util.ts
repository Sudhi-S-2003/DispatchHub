import axios from 'axios';
import * as url from 'url';
import { SECURITY_CONSTANTS } from '../constants/index.js';

export interface RemoteAttachment {
  filename: string;
  url: string;
  contentType?: string;
}

export interface PostalAttachmentPayload {
  name: string;
  content_type: string;
  data: string; // Base64 encoded file content
}

export class AttachmentSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentSecurityError';
  }
}

// In-memory cache for campaign attachments: Avoids downloading the same PDF 10,000 times!
const campaignAttachmentCache = new Map<string, PostalAttachmentPayload>();

export async function fetchRemoteAttachment(
  attachment: RemoteAttachment,
  campaignId?: string,
): Promise<PostalAttachmentPayload> {
  const cacheKey = campaignId ? `${campaignId}_${attachment.url}` : null;

  if (cacheKey && campaignAttachmentCache.has(cacheKey)) {
    return campaignAttachmentCache.get(cacheKey)!;
  }

  // 1. SSRF Validation using centralized constants
  const parsedUrl = url.parse(attachment.url);
  const allowedProtocols = SECURITY_CONSTANTS.ATTACHMENTS.ALLOWED_PROTOCOLS as readonly string[];
  if (!parsedUrl.protocol || !allowedProtocols.includes(parsedUrl.protocol)) {
    throw new AttachmentSecurityError(`Invalid URL protocol: ${parsedUrl.protocol}`);
  }

  const hostname = parsedUrl.hostname?.toLowerCase();
  if (!hostname) {
    throw new AttachmentSecurityError('Invalid URL hostname');
  }

  // Block private/internal ranges & cloud metadata
  const blockedHosts = SECURITY_CONSTANTS.ATTACHMENTS.BLOCKED_HOSTNAMES as readonly string[];
  if (
    blockedHosts.includes(hostname) ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new AttachmentSecurityError(`Access to private or local host '${hostname}' is prohibited.`);
  }

  // 2. Stream with strict ceiling
  const MAX_BYTES = SECURITY_CONSTANTS.ATTACHMENTS.MAX_FILE_SIZE_BYTES;

  const response = await axios.get(attachment.url, {
    responseType: 'arraybuffer',
    timeout: SECURITY_CONSTANTS.ATTACHMENTS.DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
  });

  const buffer = Buffer.from(response.data);
  const base64Data = buffer.toString('base64');
  const contentType =
    attachment.contentType ||
    (response.headers['content-type'] ? String(response.headers['content-type']) : 'application/octet-stream');

  const result: PostalAttachmentPayload = {
    name: attachment.filename || 'attachment',
    content_type: contentType,
    data: base64Data,
  };

  // Cache if part of a bulk campaign
  if (cacheKey) {
    campaignAttachmentCache.set(cacheKey, result);
    setTimeout(
      () => campaignAttachmentCache.delete(cacheKey),
      SECURITY_CONSTANTS.ATTACHMENTS.CAMPAIGN_CACHE_TTL_MS,
    );
  }

  return result;
}
