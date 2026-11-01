'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { copyTextToClipboard } from '@/lib/clipboard';
import { useToast } from '@/components/ui';
import { AccountSwitcher } from '@/features/auth';
import { Wallet, PlusCircle, Key, Check } from 'lucide-react';

export default function Topbar() {
  const { user } = useAuth();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState(false);

  const copyApiKey = async () => {
    if (user?.apiKey) {
      const ok = await copyTextToClipboard(user.apiKey);
      if (ok) {
        setCopiedKey(true);
        toast.info('API Key copied to clipboard!', { duration: 2000 });
        setTimeout(() => setCopiedKey(false), 2000);
      }
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-medium text-slate-400">DispatchHub Cloud MTA</span>
        <span className="text-slate-700">/</span>
        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>4 Shards Active</span>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* API Key Pill */}
        {user?.apiKey && (
          <button
            onClick={copyApiKey}
            title="Click to copy X-API-Key"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-lg border border-slate-700/60 transition"
          >
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>{user.apiKey.slice(0, 10)}...</span>
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
          </button>
        )}

        {/* Live Wallet Balance Chip */}
        <Link
          href="/wallet"
          className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 hover:border-indigo-400/50 transition group"
        >
          <div className="flex items-center space-x-1.5">
            <Wallet className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-slate-400 font-medium">Balance:</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              ${user ? Number(user.walletBalance).toFixed(3) : '0.000'}
            </span>
          </div>
          <span className="w-1 h-3 bg-indigo-800 rounded-full"></span>
          <span className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
            <PlusCircle className="w-3 h-3" />
            <span>Top Up</span>
          </span>
        </Link>

        {/* GitHub-style Multi-Account Switcher & Profile Dropdown */}
        <AccountSwitcher />
      </div>
    </header>
  );
}
