'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { copyTextToClipboard } from '@/lib/clipboard';
import { Wallet, PlusCircle, LogOut, Key, Check, Users, ShieldAlert } from 'lucide-react';

export default function Topbar() {
  const { user, logout, quickLoginAs, refreshAccount } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const copyApiKey = async () => {
    if (user?.apiKey) {
      const ok = await copyTextToClipboard(user.apiKey);
      if (ok) {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    }
  };

  const handleSwitchTenant = async (role: 'admin' | 'client') => {
    setIsSwitching(true);
    try {
      await quickLoginAs(role);
    } finally {
      setIsSwitching(false);
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

        {/* Tenant Quick Switcher */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => handleSwitchTenant('admin')}
            disabled={isSwitching || user?.role === 'ADMIN'}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleSwitchTenant('client')}
            disabled={isSwitching || user?.role === 'CLIENT'}
            className={`px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'CLIENT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Client Demo
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
