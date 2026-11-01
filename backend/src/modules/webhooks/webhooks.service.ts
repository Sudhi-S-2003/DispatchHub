import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async processPostalWebhook(payload: any) {
    const event = payload?.event;
    const data = payload?.payload;

    this.logger.log(`Received Postal Webhook Event: "${event}"`);

    if (!data) {
      return { success: false, message: 'Missing event payload' };
    }

    // Postal message payload typically includes message.id, message.message_id, recipient, etc.
    const postalMessageId = data.message?.message_id || data.message_id || data.id?.toString();
    const recipient = data.message?.to || data.recipient;

    if (!postalMessageId && !data.original_message) {
      return { success: true, message: 'Unhandled webhook event type without message ID' };
    }

    // Match message by postalMessageId or recipient
    let message = await this.prisma.message.findFirst({
      where: postalMessageId ? { postalMessageId } : { recipient },
      orderBy: { createdAt: 'desc' },
    });

    if (!message) {
      this.logger.warn(`Postal webhook message not found in local DB: ${postalMessageId || recipient}`);
      return { success: true, message: 'Message not found locally' };
    }

    let newStatus = message.status;

    switch (event) {
      case 'MessageDelivered':
        newStatus = 'DELIVERED';
        break;
      case 'MessageBounced':
        newStatus = 'BOUNCED';
        break;
      case 'MessageFailed':
        newStatus = 'FAILED';
        break;
      case 'MessageHeld':
        newStatus = 'FAILED';
        break;
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Update message status
      await tx.message.update({
        where: { id: message.id },
        data: {
          status: newStatus,
          deliveredAt: newStatus === 'DELIVERED' ? new Date() : message.deliveredAt,
          errorMessage: data.details || data.output || message.errorMessage,
        },
      });

      // 2. Insert MessageEvent audit row
      await tx.messageEvent.create({
        data: {
          messageId: message.id,
          eventType: event,
          details: data.details || data.output || `Postal event: ${event}`,
          postalPayload: payload,
        },
      });

      // 3. Update campaign counters if message belongs to a campaign
      if (message.campaignId) {
        if (newStatus === 'DELIVERED') {
          await tx.campaign.update({
            where: { id: message.campaignId },
            data: { deliveredCount: { increment: 1 } },
          });
        } else if (newStatus === 'BOUNCED') {
          await tx.campaign.update({
            where: { id: message.campaignId },
            data: { bouncedCount: { increment: 1 } },
          });
        }
      }
    });

    this.logger.log(`Message ${message.id} status transitioned to "${newStatus}" via webhook.`);
    return { success: true, status: newStatus };
  }
}
