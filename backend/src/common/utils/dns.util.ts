export interface DnsHostInfo {
  rootDomain: string;
  subdomain: string;
  isApex: boolean;
  spfHost: string;
  spfFqdn: string;
  spfValue: string;
  dkimHost: string;
  dkimFqdn: string;
  dkimValue: string;
  mxHost: string;
  mxFqdn: string;
  mxPriority: number;
  mxValue: string;
  fullDomain: string;
}

// Well-known second-level domains (ccSLDs) to correctly detect apex domain
const CC_SLDS = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'net.uk', 'me.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'co.za', 'net.za', 'org.za',
  'co.jp', 'ne.jp', 'or.jp',
  'com.br', 'net.br', 'org.br',
  'com.sg', 'edu.sg', 'gov.sg',
  'com.mx', 'org.mx',
  'com.cn', 'net.cn', 'org.cn',
]);

/**
 * Universal dynamic DNS parser supporting arbitrary subdomain depth
 * Handles:
 * - Root domains: xyz.com, brand.co.uk
 * - Single-level subdomains: mail.xyz.com, mailsend.xyz.online
 * - Deep multi-level subdomains: mail2send.xyx.online, mail1send2.xyz.com, a.b.c.domain.com
 */
export function parseDnsHosts(
  domainName: string,
  selector: string = 'postal',
  publicKey: string = '',
): DnsHostInfo {
  const clean = (domainName || '').toLowerCase().trim().replace(/^\.+|\.+$/g, '');
  const parts = clean.split('.').filter(Boolean);

  if (parts.length <= 1) {
    return {
      rootDomain: clean,
      subdomain: '@',
      isApex: true,
      spfHost: '@',
      spfFqdn: clean,
      spfValue: 'v=spf1 a mx ip4:148.113.44.84 include:spf.postal.sudhi.online ~all',
      dkimHost: `${selector}._domainkey`,
      dkimFqdn: `${selector}._domainkey.${clean}`,
      dkimValue: `v=DKIM1; t=s; h=sha256; p=${publicKey}`,
      mxHost: '@',
      mxFqdn: clean,
      mxPriority: 10,
      mxValue: 'mail.postal.sudhi.online',
      fullDomain: clean,
    };
  }

  // Check if domain ends in a recognized 2-part ccSLD (e.g., .co.uk)
  let rootPartsCount = 2; // Default: domain.tld (e.g. xyz.com, postal.online)
  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (CC_SLDS.has(lastTwo)) {
      rootPartsCount = 3;
    }
  }

  const isApex = parts.length <= rootPartsCount;
  const rootDomain = isApex ? clean : parts.slice(parts.length - rootPartsCount).join('.');
  const subdomain = isApex ? '@' : parts.slice(0, parts.length - rootPartsCount).join('.');

  const spfHost = isApex ? '@' : subdomain;
  const spfFqdn = clean;
  const spfValue = 'v=spf1 a mx ip4:148.113.44.84 include:spf.postal.sudhi.online ~all';

  const dkimHost = isApex ? `${selector}._domainkey` : `${selector}._domainkey.${subdomain}`;
  const dkimFqdn = `${selector}._domainkey.${clean}`;
  const dkimValue = `v=DKIM1; t=s; h=sha256; p=${publicKey}`;

  const mxHost = spfHost;
  const mxFqdn = clean;
  const mxPriority = 10;
  const mxValue = 'mail.postal.sudhi.online';

  return {
    rootDomain,
    subdomain,
    isApex,
    spfHost,
    spfFqdn,
    spfValue,
    dkimHost,
    dkimFqdn,
    dkimValue,
    mxHost,
    mxFqdn,
    mxPriority,
    mxValue,
    fullDomain: clean,
  };
}
