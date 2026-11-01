import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';

@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('postal')
  @HttpCode(HttpStatus.OK)
  async handlePostalWebhook(@Body() payload: any) {
    this.logger.log(`Postal webhook received: ${payload?.event || 'Unknown'}`);
    return this.webhooksService.processPostalWebhook(payload);
  }
}
