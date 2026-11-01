import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { signJwt, verifyJwt } from '../../common/utils/jwt.util.js';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Universal Login / Auto-Provisioning:
   * Existing users log in seamlessly with their existing wallet & domains.
   * New users are automatically provisioned with a starter wallet and live API key.
   */
  async login(email: string, apiKey?: string, name?: string) {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    let account = await this.prisma.account.findUnique({
      where: { email: cleanEmail },
      include: {
        wallet: true,
        domains: { select: { id: true, domainName: true, status: true } },
      },
    });

    // Auto-provision new users on first sign in
    if (!account) {
      const generatedApiKey = `dh_live_${crypto.randomBytes(16).toString('hex')}`;
      const displayName = name || cleanEmail.split('@')[0];

      account = await this.prisma.account.create({
        data: {
          name: displayName,
          email: cleanEmail,
          role: Role.CLIENT,
          apiKey: generatedApiKey,
          isTrusted: false,
          wallet: {
            create: {
              balance: 10.0, // $10.00 welcome credit for new tenants
              currency: 'USD',
            },
          },
        },
        include: {
          wallet: true,
          domains: { select: { id: true, domainName: true, status: true } },
        },
      });

      // Record welcome bonus transaction
      if (account.wallet) {
        await this.prisma.walletTransaction.create({
          data: {
            walletId: account.wallet.id,
            accountId: account.id,
            amount: 10.0,
            balanceBefore: 0.0,
            balanceAfter: 10.0,
            type: 'ADMIN_TOPUP',
            description: 'New Tenant Welcome Treasury Credit',
            performedBy: 'SYSTEM_BOOTSTRAP',
          },
        });
      }
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact support.');
    }

    // Optional API Key verification if provided
    if (apiKey && apiKey.trim() !== account.apiKey) {
      throw new UnauthorizedException('Invalid API Key provided for this account');
    }

    // Generate JWT token
    const token = signJwt({
      sub: account.id,
      email: account.email,
      role: account.role,
    });

    return {
      accessToken: token,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        apiKey: account.apiKey,
        role: account.role,
        isTrusted: account.isTrusted,
        wallet: account.wallet,
        domains: account.domains,
      },
    };
  }

  async validateTokenOrApiKey(authHeader?: string, apiKeyHeader?: string) {
    if (apiKeyHeader) {
      const cleanKey = apiKeyHeader.trim();
      const account = await this.prisma.account.findUnique({
        where: { apiKey: cleanKey },
        include: { wallet: true },
      });
      if (account && account.isActive) {
        return { account, role: account.role, authType: 'API_KEY' };
      }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const payload = verifyJwt(token);
      if (payload && payload.sub) {
        const account = await this.prisma.account.findUnique({
          where: { id: payload.sub },
          include: { wallet: true },
        });
        if (account && account.isActive) {
          return { account, role: account.role, authType: 'JWT' };
        }
      }
    }

    throw new UnauthorizedException('Missing or invalid Authorization Bearer token or X-API-Key');
  }

  async getMe(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        wallet: true,
        domains: { select: { id: true, domainName: true, status: true } },
      },
    });

    if (!account) {
      throw new UnauthorizedException('User session invalid or account not found');
    }

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      walletBalance: account.wallet ? Number(account.wallet.balance) : 0,
      apiKey: account.apiKey,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
      domains: account.domains,
    };
  }
}
