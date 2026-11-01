'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Send,
  MailCheck,
  Globe2,
  FileCode2,
  Wallet,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/compose', label: 'Send Studio', icon: Send },
    { href: '/messages', label: 'Message Logs', icon: MailCheck },
    { href: '/domains', label: 'Domains & DNS', icon: Globe2 },
    { href: '/templates', label: 'Templates', icon: FileCode2 },
    { href: '/wallet', label: 'Wallet & Credits', icon: Wallet },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({
      href: '/admin/approvals',
      label: 'Campaign Approvals',
      icon: ShieldCheck,
    });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-lg">Dispatch<span className="text-indigo-400">Hub</span></span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">v1.0</span>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Platform Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Active Tenant Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Loading...'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
          <span className="text-slate-500">Tier:</span>
          <span className="font-medium text-indigo-400 font-mono uppercase">{user?.role || 'CLIENT'}</span>
        </div>
      </div>
    </aside>
  );
}
