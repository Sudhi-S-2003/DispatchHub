import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { DomainsModule } from './modules/domains/domains.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    WalletModule,
    DomainsModule,
    TemplatesModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
