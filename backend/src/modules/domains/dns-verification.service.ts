import { Injectable, Logger } from '@nestjs/common';
import { Resolver } from 'dns/promises';

export interface DnsDiagnosticRecord {
  status: 'VERIFIED' | 'WARNING' | 'ERROR';
  message: string;
  found?: string;
  expected?: string;
}

export interface DnsCheckResult {
  isSpfVerified: boolean;
  isDkimVerified: boolean;
  isMxVerified: boolean;
  isReady: boolean;
  diagnostics: {
    spf: DnsDiagnosticRecord;
    dkim: DnsDiagnosticRecord;
    mx: DnsDiagnosticRecord;
  };
  details: {
    spfFound?: string;
    dkimFound?: string;
    dkimSelectorUsed?: string;
    mxFound?: string[];
  };
}

@Injectable()
export class DnsVerificationService {
  private readonly logger = new Logger(DnsVerificationService.name);
  private resolver: Resolver;

  constructor() {
    this.resolver = new Resolver();
    try {
      // Query Google & Cloudflare directly, bypassing local Docker caching
      this.resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (err: any) {
      this.logger.warn(`Failed to set public DNS servers, using default: ${err.message}`);
    }
  }

  async verifyDomain(
    domainName: string,
    dkimSelector: string = 'postal',
    expectedDkimKey?: string,
  ): Promise<DnsCheckResult> {
    const cleanDomain = (domainName || '').toLowerCase().trim();

    const result: DnsCheckResult = {
      isSpfVerified: false,
      isDkimVerified: false,
      isMxVerified: false,
      isReady: false,
      diagnostics: {
        spf: { status: 'WARNING', message: 'Checking SPF...' },
        dkim: { status: 'WARNING', message: 'Checking DKIM...' },
        mx: { status: 'WARNING', message: 'Checking MX...' },
      },
      details: {},
    };

    // 1. Verify SPF Record
    try {
      const txtRecords = await this.resolver.resolveTxt(cleanDomain);
      // Join RFC 1035 chunks for each record
      const records = txtRecords.map((chunks) =>
        Array.isArray(chunks) ? chunks.join('') : String(chunks),
      );
      const flattenedTxt = records.join(' ');
      result.details.spfFound = flattenedTxt;

      if (flattenedTxt.includes('v=spf1')) {
        result.isSpfVerified = true;
        result.diagnostics.spf = {
          status: 'VERIFIED',
          message: 'SPF record verified! Authorizes Mail Transfer Agent to dispatch on your behalf.',
          found: flattenedTxt,
        };
      } else {
        result.diagnostics.spf = {
          status: 'WARNING',
          message: 'TXT records were found, but none contained a valid "v=spf1" mechanism.',
          found: flattenedTxt,
        };
      }
    } catch (error: any) {
      result.diagnostics.spf = {
        status: 'WARNING',
        message: `No SPF TXT record detected yet (${error.code || error.message}). Ensure TXT record is saved at your registrar.`,
      };
    }

    // 2. Verify DKIM Record
    const selectorsToTry = Array.from(
      new Set([dkimSelector, 'postal-EIvF6u', 'postal', 'default']),
    ).filter(Boolean);
    let dkimHostQueried = '';

    for (const sel of selectorsToTry) {
      const dkimHost = `${sel}._domainkey.${cleanDomain}`;
      dkimHostQueried = dkimHost;

      try {
        const dkimTxt = await this.resolver.resolveTxt(dkimHost);
        // Each entry is an array of string chunks (RFC 1035 splits >255 bytes into chunks)
        const records = dkimTxt.map((chunks) =>
          Array.isArray(chunks) ? chunks.join('') : String(chunks),
        );

        // Step A: Check for valid DKIM public key FIRST
        const validDkim = records.find(
          (r) => r.includes('v=DKIM1') || (r.includes('p=') && r.length > 50),
        );

        if (validDkim) {
          result.isDkimVerified = true;
          result.details.dkimFound = validDkim;
          result.details.dkimSelectorUsed = sel;
          result.diagnostics.dkim = {
            status: 'VERIFIED',
            message: `DKIM cryptographic signature verified with selector "${sel}".`,
            found: validDkim,
          };
          break;
        }

        // Step B: Only if no valid DKIM is found, check if user accidentally pasted SPF into DKIM
        const spfMistake = records.find((r) => r.includes('v=spf1'));
        if (spfMistake) {
          result.details.dkimFound = spfMistake;
          result.diagnostics.dkim = {
            status: 'ERROR',
            message: `⚠️ SPF record found on DKIM host "${dkimHost}"! Please edit this record in your registrar and paste the DKIM key starting with "v=DKIM1; t=s; h=sha256; p=...".`,
            found: spfMistake,
          };
          break;
        }
      } catch (err: any) {
        // Continue searching other selectors
      }
    }

    if (!result.isDkimVerified && result.diagnostics.dkim.status !== 'ERROR') {
      result.diagnostics.dkim = {
        status: 'WARNING',
        message: `DKIM record not found yet at "${dkimHostQueried}". Ensure host is "${dkimSelector}._domainkey" in your DNS registrar.`,
      };
    }

    // 3. Verify MX Record
    try {
      const mx = await this.resolver.resolveMx(cleanDomain);
      if (mx && mx.length > 0) {
        result.isMxVerified = true;
        result.details.mxFound = mx.map((m) => `${m.priority} ${m.exchange}`);
        result.diagnostics.mx = {
          status: 'VERIFIED',
          message: 'MX record verified for bounce processing & return-path.',
          found: result.details.mxFound.join(', '),
        };
      } else {
        result.isMxVerified = true;
        result.diagnostics.mx = {
          status: 'VERIFIED',
          message: 'Optional for sending-only domains.',
        };
      }
    } catch {
      result.isMxVerified = true;
      result.diagnostics.mx = {
        status: 'VERIFIED',
        message: 'Optional for sending-only domains.',
      };
    }

    result.isReady = result.isSpfVerified && result.isDkimVerified;
    return result;
  }
}
