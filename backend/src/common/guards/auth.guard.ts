import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { verifyJwt } from '../utils/jwt.util.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'];

    // 1. API Key Authentication
    if (apiKeyHeader) {
      const cleanKey = String(apiKeyHeader).trim();
      const account = await this.prisma.account.findUnique({
        where: { apiKey: cleanKey },
        include: { wallet: true },
      });

      if (account && account.isActive) {
        request.user = {
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          isTrusted: account.isTrusted,
          walletId: account.wallet?.id,
          apiKey: account.apiKey,
        };
        return true;
      }
      throw new UnauthorizedException('Invalid or inactive API Key');
    }

    // 2. JWT Bearer Token Authentication
    if (authHeader && String(authHeader).startsWith('Bearer ')) {
      const token = String(authHeader).substring(7).trim();
      const payload = verifyJwt(token);

      if (payload && payload.sub) {
        const account = await this.prisma.account.findUnique({
          where: { id: payload.sub },
          include: { wallet: true },
        });

        if (account && account.isActive) {
          request.user = {
            id: account.id,
            email: account.email,
            name: account.name,
            role: account.role,
            isTrusted: account.isTrusted,
            walletId: account.wallet?.id,
            apiKey: account.apiKey,
          };
          return true;
        }
      }
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    throw new UnauthorizedException('Authentication credentials (Bearer token or X-API-Key) required');
  }
}
