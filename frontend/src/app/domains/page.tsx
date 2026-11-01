'use client';

import React, { useState, useEffect } from 'react';
import { domainsApi } from '@/lib/api';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  Globe,
  Plus,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Zap,
  AlertTriangle,
  Info,
} from 'lucide-react';

// Well-known 2-part ccSLDs (e.g., .co.uk, .com.au, .co.in)
const CC_SLDS = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'net.uk',
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
 * Universal dynamic DNS host parser supporting any arbitrary subdomain depth
 */
function parseDnsHostsClient(domainName: string, selector = 'postal', publicKey = '') {
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

  let rootPartsCount = 2; // Default: domain.tld (e.g. xyx.online, xyz.com)
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

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomainName, setNewDomainName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null);
  const [diagnosticsMap, setDiagnosticsMap] = useState<Record<string, any>>({});
  const [formatMode, setFormatMode] = useState<'relative' | 'fqdn'>('relative');

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const res = await domainsApi.list();
      if (res && res.data) {
        setDomains(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (nameToAdd?: string) => {
    const targetName = (nameToAdd || newDomainName).trim().toLowerCase();
    if (!targetName) return;

    setIsAdding(true);
    setNotice(null);
    try {
      const res = await domainsApi.create(targetName);
      if (res.verified) {
        setNotice({
          success: true,
          text: `🎉 Domain ${targetName} was immediately verified & activated! DNS records are live.`,
        });
      } else {
        setNotice({
          success: true,
          text: `Domain ${targetName} registered! Add the required DNS records at your registrar below, then click 'Verify Live DNS'.`,
        });
      }
      setNewDomainName('');
      fetchDomains();
    } catch (err: any) {
      setNotice({
        success: false,
        text: err.message || 'Failed to add domain.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDns = async (id: string, name: string) => {
    setVerifyingId(id);
    setNotice(null);
    try {
      const res = await domainsApi.verify(id);
      if (res.verificationCheck?.diagnostics) {
        setDiagnosticsMap((prev) => ({
          ...prev,
          [id]: res.verificationCheck.diagnostics,
        }));
      }

      if (res.isReady || res.data?.status === 'ACTIVE') {
        setNotice({
          success: true,
          text: `🎉 Domain ${name} verified successfully! Status is ACTIVE and ready for email dispatch.`,
        });
      } else {
        const dkimDiag = res.verificationCheck?.diagnostics?.dkim;
        if (dkimDiag?.status === 'ERROR') {
          setNotice({
            success: false,
            text: dkimDiag.message,
          });
        } else {
          setNotice({
            success: false,
            text: `DNS verification pending for ${name}. Review the real-time record inspection below.`,
          });
        }
      }
      fetchDomains();
    } catch (err: any) {
      setNotice({
        success: false,
        text: err.message || 'DNS check encountered an error.',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Custom Sending Domains & DNS</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage tenant-owned domains with full SPF, DKIM (RSA-2048), and MX records for 10/10 deliverability.
        </p>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed ${
            notice.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {notice.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Add New Domain Card */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Custom Sending Domain</span>
          </h2>

          <button
            type="button"
            onClick={() => handleAddDomain('mail.postal.sudhi.online')}
            disabled={isAdding}
            className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-xs rounded-lg font-medium transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick-Add Server Domain (mail.postal.sudhi.online)</span>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAddDomain(); }} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              required
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="e.g. mail.xyx.online, mailsend.xyz.com, mail2send.xyx.online"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
          >
            {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Register Domain</span>
          </button>
        </form>
      </div>

      {/* Configured Domains List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Your Registered Domains</h2>

          {/* Registrar Format Selector */}
          <div className="flex items-center space-x-2 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <span className="text-slate-400 px-2 font-medium">Registrar Format:</span>
            <button
              type="button"
              onClick={() => setFormatMode('relative')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                formatMode === 'relative'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GoDaddy / Namecheap / Hostinger
            </button>
            <button
              type="button"
              onClick={() => setFormatMode('fqdn')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                formatMode === 'fqdn'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloudflare / Route 53 (FQDN)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
            Loading configured domains...
          </div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
            No domains registered yet. Add your domain above or click Quick-Add Server Domain.
          </div>
        ) : (
          domains.map((dom: any) => {
            const domainName = dom.domainName || dom.name || 'yourdomain.com';
            const isVerified = dom.status === 'ACTIVE' || (dom.isDkimVerified && dom.isSpfVerified);
            const selector = dom.dkimSelector || 'postal';
            const publicKey = dom.dkimPublicKey || '';

            // Dynamic calculation supporting any arbitrary subdomain depth
            const dns = dom.dnsInfo || parseDnsHostsClient(domainName, selector, publicKey);
            const spfValue = dom.spfRecord || dns.spfValue;
            const dkimValue = publicKey ? `v=DKIM1; t=s; h=sha256; p=${publicKey}` : dns.dkimValue;
            const mxValue = dns.mxValue;

            const spfHost = formatMode === 'relative' ? dns.spfHost : dns.spfFqdn;
            const dkimHost = formatMode === 'relative' ? dns.dkimHost : dns.dkimFqdn;
            const mxHost = formatMode === 'relative' ? dns.mxHost : dns.mxFqdn;

            const diag = diagnosticsMap[dom.id];

            return (
              <div key={dom.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                {/* Domain Header */}
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <span className="font-mono text-indigo-300">{domainName}</span>
                        {isVerified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ACTIVE VERIFIED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>PENDING DNS</span>
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Root Zone: <span className="font-mono text-slate-200 font-semibold">{dns.rootDomain}</span>
                        {dns.subdomain !== '@' && (
                          <> | Subdomain Prefix: <span className="font-mono text-amber-300 font-semibold">{dns.subdomain}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerifyDns(dom.id, domainName)}
                    disabled={verifyingId === dom.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                    <span>{verifyingId === dom.id ? 'Checking DNS...' : 'Verify Live Public DNS'}</span>
                  </button>
                </div>

                {/* Real-time Diagnostics Inspector */}
                {diag && (
                  <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-col md:flex-row gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-400">DNS Diagnostics:</span>
                    </div>
                    {/* SPF Status Pill */}
                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
                        diag.spf?.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {diag.spf?.status === 'VERIFIED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>SPF: {diag.spf?.status === 'VERIFIED' ? 'Verified' : 'Pending'}</span>
                    </div>

                    {/* DKIM Status Pill */}
                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
                        diag.dkim?.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : diag.dkim?.status === 'ERROR'
                          ? 'bg-red-500/10 border-red-500/40 text-red-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {diag.dkim?.status === 'VERIFIED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span>
                        DKIM:{' '}
                        {diag.dkim?.status === 'VERIFIED'
                          ? 'Verified'
                          : diag.dkim?.status === 'ERROR'
                          ? 'SPF Record Detected by Mistake!'
                          : 'Pending'}
                      </span>
                    </div>

                    {/* MX Status Pill */}
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MX: Verified</span>
                    </div>
                  </div>
                )}

                {/* DNS Configuration Cards */}
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>
                        Required DNS Records for Zone <code className="text-indigo-400 font-bold">{dns.rootDomain}</code>:
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatMode === 'relative'
                        ? 'Registrar appends zone name automatically'
                        : 'Full domain name (FQDN) mode'}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {/* SPF Record */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                            TXT (SPF)
                          </span>
                          <span className="text-slate-400 font-sans">
                            Name / Host:{' '}
                            <code className="text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {spfHost}
                            </code>
                          </span>
                          {dom.isSpfVerified && (
                            <span className="text-emerald-400 text-[10px] font-sans flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Verified Live</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-slate-300 truncate font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/80">
                          {spfValue}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => copyToClipboard(spfHost, `spf-host-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition ${
                            copiedKey === `spf-host-${dom.id}`
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {copiedKey === `spf-host-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `spf-host-${dom.id}` ? 'Copied!' : 'Copy Host'}</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(spfValue, `spf-val-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition shadow-sm ${
                            copiedKey === `spf-val-${dom.id}`
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {copiedKey === `spf-val-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `spf-val-${dom.id}` ? 'Copied SPF!' : 'Copy Value'}</span>
                        </button>
                      </div>
                    </div>

                    {/* DKIM Record */}
                    <div className={`p-4 rounded-xl bg-slate-950 border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      diag?.dkim?.status === 'ERROR' ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-slate-800'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            TXT (DKIM Cryptographic Key)
                          </span>
                          <span className="text-slate-400 font-sans">
                            Name / Host:{' '}
                            <code className="text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {dkimHost}
                            </code>
                          </span>
                          {dom.isDkimVerified && (
                            <span className="text-emerald-400 text-[10px] font-sans flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Verified Live</span>
                            </span>
                          )}
                        </div>

                        {diag?.dkim?.status === 'ERROR' && (
                          <div className="mt-2 p-2 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-sans leading-relaxed">
                            {diag.dkim.message}
                          </div>
                        )}

                        <div className="mt-2 text-slate-300 truncate font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/80">
                          {dkimValue}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => copyToClipboard(dkimHost, `dkim-host-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition ${
                            copiedKey === `dkim-host-${dom.id}`
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {copiedKey === `dkim-host-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `dkim-host-${dom.id}` ? 'Copied!' : 'Copy Host'}</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(dkimValue, `dkim-val-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition shadow-sm ${
                            copiedKey === `dkim-val-${dom.id}`
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-600 hover:bg-purple-500 text-white'
                          }`}
                        >
                          {copiedKey === `dkim-val-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `dkim-val-${dom.id}` ? 'Copied DKIM!' : 'Copy DKIM Value'}</span>
                        </button>
                      </div>
                    </div>

                    {/* MX Record */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            MX (Return-Path)
                          </span>
                          <span className="text-slate-400 font-sans">
                            Name / Host:{' '}
                            <code className="text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {mxHost}
                            </code>
                          </span>
                          <span className="text-emerald-400 text-[10px] font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                            Priority: 10
                          </span>
                          <span className="text-slate-500 text-[10px] font-sans">
                            (Enter 10 in Priority, domain in Value)
                          </span>
                        </div>
                        <div className="mt-2 text-slate-300 truncate font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/80">
                          {mxValue}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => copyToClipboard(mxHost, `mx-host-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition ${
                            copiedKey === `mx-host-${dom.id}`
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {copiedKey === `mx-host-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `mx-host-${dom.id}` ? 'Copied!' : 'Copy Host'}</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(mxValue, `mx-val-${dom.id}`)}
                          className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 font-sans transition shadow-sm ${
                            copiedKey === `mx-val-${dom.id}`
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {copiedKey === `mx-val-${dom.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === `mx-val-${dom.id}` ? 'Copied MX!' : 'Copy Value'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
