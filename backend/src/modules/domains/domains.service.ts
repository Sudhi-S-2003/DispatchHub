import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { generateDkimKeyPair } from '../../common/utils/dkim.util.js';
import { encryptSecret } from '../../common/utils/crypto.util.js';
import { DnsVerificationService } from './dns-verification.service.js';
import { parseDnsHosts } from '../../common/utils/dns.util.js';
import { Role } from '@prisma/client';

@Injectable()
export class DomainsService {
  constructor(
    private prisma: PrismaService,
    private dnsVerifier: DnsVerificationService,
  ) {}

  // Helper to safely sanitize domain objects by stripping private keys and attaching dynamic DNS instructions
  private sanitizeDomain(domain: any) {
    if (!domain) return null;
    const { dkimPrivateKey, ...safeDomain } = domain;
    const dnsInfo = parseDnsHosts(
      safeDomain.domainName,
      safeDomain.dkimSelector || 'postal',
      safeDomain.dkimPublicKey || '',
    );
    return {
      ...safeDomain,
      dnsInfo,
    };
  }

  async createDomain(accountId: string, domainName: string) {
    const cleanDomain = domainName.toLowerCase().trim();
    if (!cleanDomain || !cleanDomain.includes('.')) {
      throw new BadRequestException('Please provide a valid domain or subdomain (e.g., mail.yourcompany.com)');
    }

    // Check if domain already exists for this tenant
    const existing = await this.prisma.domain.findFirst({
      where: { accountId, domainName: cleanDomain },
    });

    if (existing) {
      throw new BadRequestException(`Domain '${cleanDomain}' is already registered under your account.`);
    }

    // Default selector
    let selector = 'postal';
    let publicKey = '';
    let privateKey = '';

    // If adding the pre-configured server sending domain, bind Postal's verified keys
    if (cleanDomain === 'mail.postal.sudhi.online') {
      selector = 'postal-EIvF6u';
      publicKey =
        'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDcxP3TnFBTdmiXzhnEsQohUASxOd2qOVIOVKqlkfZCTMNQJme+sqLcjzH6tuRtkwburFIO12wwxRcXCDM7wbkwyY+8QaqcmpcwB7xoHLMuMGCXVHIJOG12uFGGLWWlNZILrEzIoM85T7Z8G0rd5GzQ7QSgJh0A+9mxtKb8fJWA9wIDAQAB';
      privateKey = 'SERVER_POSTAL_INTERNAL_MANAGED';
    } else {
      // Generate cryptographic 2048-bit RSA DKIM Keypair for custom domains
      const dkim = generateDkimKeyPair(selector);
      publicKey = dkim.publicKey;
      privateKey = dkim.privateKey;
    }

    const spfRecord = 'v=spf1 a mx ip4:148.113.44.84 include:spf.postal.sudhi.online ~all';
    const encryptedPrivateKey = encryptSecret(privateKey);

    const domain = await this.prisma.domain.create({
      data: {
        accountId,
        domainName: cleanDomain,
        dkimSelector: selector,
        dkimPublicKey: publicKey,
        dkimPrivateKey: encryptedPrivateKey,
        spfRecord,
        status: 'PENDING_VERIFICATION',
      },
    });

    const dnsInstructions = parseDnsHosts(cleanDomain, selector, publicKey);

    // Run instant pre-flight check in case DNS is already live
    const autoCheck = await this.dnsVerifier.verifyDomain(cleanDomain, selector, publicKey);
    if (autoCheck.isSpfVerified && autoCheck.isDkimVerified) {
      const activeDomain = await this.prisma.domain.update({
        where: { id: domain.id },
        data: {
          isSpfVerified: true,
          isDkimVerified: true,
          isMxVerified: true,
          status: 'ACTIVE',
        },
      });
      return {
        domain: this.sanitizeDomain(activeDomain),
        verified: true,
        dnsInstructions,
      };
    }

    return {
      domain: this.sanitizeDomain(domain),
      verified: false,
      dnsInstructions,
    };
  }

  async verifyDomain(domainId: string, accountId?: string, userRole?: Role) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (userRole && userRole !== Role.ADMIN && domain.accountId !== accountId) {
      throw new ForbiddenException('You do not have permission to verify this domain');
    }

    const check = await this.dnsVerifier.verifyDomain(
      domain.domainName,
      domain.dkimSelector,
      domain.dkimPublicKey,
    );

    // If SPF and DKIM are verified, unlock sending
    const isReady = check.isSpfVerified && check.isDkimVerified;

    const [updated] = await this.prisma.$transaction([
      this.prisma.domain.update({
        where: { id: domainId },
        data: {
          isSpfVerified: check.isSpfVerified,
          isDkimVerified: check.isDkimVerified,
          isMxVerified: check.isMxVerified,
          dkimSelector: check.details.dkimSelectorUsed || domain.dkimSelector,
          status: isReady ? 'ACTIVE' : 'PENDING_VERIFICATION',
        },
      }),
      // Audit record for SPF
      this.prisma.domainVerification.create({
        data: {
          domainId,
          recordType: 'SPF',
          expectedValue: domain.spfRecord || 'v=spf1 ... ~all',
          actualValue: check.details.spfFound || null,
          status: check.isSpfVerified ? 'PASS' : 'FAIL',
          errorMessage: check.diagnostics.spf?.message,
        },
      }),
      // Audit record for DKIM
      this.prisma.domainVerification.create({
        data: {
          domainId,
          recordType: 'DKIM',
          expectedValue: `k=rsa; p=${domain.dkimPublicKey.substring(0, 30)}...`,
          actualValue: check.details.dkimFound || null,
          status: check.isDkimVerified ? 'PASS' : 'FAIL',
          errorMessage: check.diagnostics.dkim?.message,
        },
      }),
      // Audit record for MX
      this.prisma.domainVerification.create({
        data: {
          domainId,
          recordType: 'MX',
          expectedValue: 'MX 10 mail.postal.sudhi.online',
          actualValue: check.details.mxFound?.join(', ') || null,
          status: check.isMxVerified ? 'PASS' : 'FAIL',
          errorMessage: check.diagnostics.mx?.message,
        },
      }),
    ]);

    return {
      domain: this.sanitizeDomain(updated),
      verificationCheck: check,
      isReady,
    };
  }

  async listDomains(accountId?: string, userRole?: Role) {
    let where: any = {};
    if (userRole === Role.ADMIN) {
      if (accountId) where.accountId = accountId;
    } else {
      where.accountId = accountId;
    }

    const domains = await this.prisma.domain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        account: {
          select: { name: true, email: true },
        },
      },
    });
    return domains.map((d) => this.sanitizeDomain(d));
  }

  async getDomain(domainId: string, accountId?: string, userRole?: Role) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        verifications: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (userRole && userRole !== Role.ADMIN && domain.accountId !== accountId) {
      throw new ForbiddenException('You do not have permission to view this domain');
    }

    return this.sanitizeDomain(domain);
  }

  async deleteDomain(domainId: string, accountId: string, userRole?: Role) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (userRole && userRole !== Role.ADMIN && domain.accountId !== accountId) {
      throw new ForbiddenException('You do not have permission to delete this domain');
    }

    await this.prisma.domain.delete({
      where: { id: domainId },
    });

    return { success: true, message: `Domain '${domain.domainName}' successfully removed.` };
  }

  async getDecryptedPrivateKey(domainId: string): Promise<string> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      select: { dkimPrivateKey: true },
    });
    if (!domain || !domain.dkimPrivateKey) {
      throw new NotFoundException('Domain private key not found');
    }
    return domain.dkimPrivateKey;
  }
}
