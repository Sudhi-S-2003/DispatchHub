import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service.js';
import { TemplatesController } from './templates.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
