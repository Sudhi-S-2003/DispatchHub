import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ShardingService } from '../sharding/sharding.service.js';
import { ContentGuardService } from '../campaigns/content-guard.service.js';

@Module({
  imports: [WalletModule, AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, ShardingService, ContentGuardService],
  exports: [MessagesService, ShardingService],
})
export class MessagesModule {}
