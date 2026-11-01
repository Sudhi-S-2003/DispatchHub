'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { messagesApi, walletApi } from '@/lib/api';
import {
  Send,
  MailCheck,
  TrendingUp,
  Wallet,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshAccount } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [bouncedCount, setBouncedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await messagesApi.list({ page: 1, limit: 10 });
      if (res && res.data) {
        setMessages(res.data);
        setTotalCount(res.meta?.total || 0);

        // Calculate counts
        const delivered = res.data.filter((m: any) => m.status === 'DELIVERED').length;
        const bounced = res.data.filter((m: any) => m.status === 'BOUNCED').length;
        setDeliveredCount(delivered);
        setBouncedCount(bounced);
      }
      await refreshAccount();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const deliveryRate = totalCount > 0 ? ((deliveredCount / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-tenant dispatch metrics, queue telemetry, and wallet economics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/compose"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            <Send className="w-4 h-4" />
            <span>Launch Send Studio</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Wallet Balance Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Wallet Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              ${user ? Number(user.walletBalance).toFixed(3) : '0.000'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">Atomic "Deduct First"</span>
            <Link href="/wallet" className="text-indigo-400 hover:underline flex items-center space-x-0.5">
              <span>Top Up</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Messages Sent */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Dispatched</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <MailCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {totalCount.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Zero send limits, only balance limit</span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Delivery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {deliveryRate}%
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Postal MTA & Webhook tracking</span>
          </div>
        </div>

        {/* Sharded Queue Status */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Telinfy Sharding</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">4 Shards</span>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              Balanced
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>CRC32 Domain Hash Routing</span>
          </div>
        </div>
      </div>

      {/* Shard Topology & Pricing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shard Health telemetry */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Redis Shard Topologies</span>
          </h2>
          <div className="mt-4 space-y-3">
            {['queue:shard:0', 'queue:shard:1', 'queue:shard:2', 'queue:shard:3'].map((shard, idx) => (
              <div key={shard} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-mono text-slate-300">{shard}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">50/batch lookahead</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></div>
                <span className="text-xs font-mono text-indigo-300 font-semibold">queue:priority</span>
              </div>
              <span className="text-[11px] text-indigo-400 font-mono">OTP 1-to-1 Bypass</span>
            </div>
          </div>
        </div>

        {/* Dual-Branding Rate Card */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Dual-Branding Rate Economics</span>
            </h2>
            <span className="text-xs text-slate-400">Auto-deducted per send</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/80">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">
                    White-Label <span className="font-normal text-slate-500">(100% Private)</span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">
                    Co-Branded <span className="font-normal text-indigo-400 font-semibold">(50% OFF + Watermark)</span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">SLA Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/30 font-mono">
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-white">TRANSACTIONAL (OTP)</td>
                  <td className="px-4 py-2.5 text-slate-300">$0.050</td>
                  <td className="px-4 py-2.5 text-emerald-400 font-semibold">$0.025 (-50%)</td>
                  <td className="px-4 py-2.5 text-indigo-400 font-sans text-[11px]">Instant Bypass</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-white">MARKETING</td>
                  <td className="px-4 py-2.5 text-slate-300">$0.035</td>
                  <td className="px-4 py-2.5 text-emerald-400 font-semibold">$0.015 (-57%)</td>
                  <td className="px-4 py-2.5 text-slate-400 font-sans text-[11px]">Sharded Queue</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-white">NOTIFICATION</td>
                  <td className="px-4 py-2.5 text-slate-300">$0.025</td>
                  <td className="px-4 py-2.5 text-emerald-400 font-semibold">$0.010 (-60%)</td>
                  <td className="px-4 py-2.5 text-slate-400 font-sans text-[11px]">Sharded Queue</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-white">TEST DISPATCH</td>
                  <td className="px-4 py-2.5 text-slate-300">$0.010</td>
                  <td className="px-4 py-2.5 text-emerald-400 font-semibold">$0.010</td>
                  <td className="px-4 py-2.5 text-slate-400 font-sans text-[11px]">Mock/Live MTA</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Co-branded emails append: <span className="text-indigo-300 font-mono">⚡ Delivered via DispatchHub</span>. 
            All dispatches require pre-flight atomic wallet balance checks.
          </p>
        </div>
      </div>

      {/* Recent Dispatches Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Dispatches</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest transactional & campaign messages dispatched through shards.</p>
          </div>
          <Link
            href="/messages"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Recipient</th>
                <th className="px-6 py-3 text-left font-semibold">Subject</th>
                <th className="px-6 py-3 text-left font-semibold">Category</th>
                <th className="px-6 py-3 text-left font-semibold">Branding</th>
                <th className="px-6 py-3 text-left font-semibold">Cost</th>
                <th className="px-6 py-3 text-left font-semibold">Shard</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No dispatches recorded yet. Use the Send Studio to dispatch your first message!
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-6 py-3.5 font-medium text-slate-200">{msg.to}</td>
                    <td className="px-6 py-3.5 text-slate-400 max-w-xs truncate">{msg.subject}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {msg.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {msg.isCoBranded ? (
                        <span className="text-[10px] text-indigo-400 font-medium">Co-Branded</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">White-Label</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-emerald-400">${Number(msg.cost).toFixed(3)}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">{msg.shardKey || 'direct'}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          msg.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : msg.status === 'SENT'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : msg.status === 'BOUNCED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
