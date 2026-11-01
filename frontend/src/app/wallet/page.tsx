'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { walletApi, accountsApi } from '@/lib/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  PlusCircle,
  Shield,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function WalletPage() {
  const { user, refreshAccount } = useAuth();
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });

  // Top Up Modal (for Admin or Demo)
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(50);
  const [topUpDescription, setTopUpDescription] = useState('Manual credit deposit via admin console');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await walletApi.getLedger({ page, limit });
      if (res && res.data) {
        setLedger(res.data);
        setMeta(res.meta || { total: res.data.length, totalPages: 1 });
      }
      await refreshAccount();
    } catch (err) {
      console.error('Failed to load wallet ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await accountsApi.list({ limit: 100 });
      if (res && res.data) {
        setAllAccounts(res.data);
        if (res.data.length > 0 && !targetAccountId) {
          setTargetAccountId(user?.id || res.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLedger();
    if (user?.role === 'ADMIN') {
      fetchAccounts();
    }
  }, [page, limit, user]);

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice(null);
    try {
      const accId = targetAccountId || user?.id;
      if (!accId) throw new Error('No account selected.');

      await walletApi.topUp(accId, Number(topUpAmount), topUpDescription);
      setSuccessNotice(`Successfully credited $${topUpAmount} to account!`);
      setShowTopUpModal(false);
      fetchLedger();
      await refreshAccount();
    } catch (err: any) {
      alert(err.message || 'Top-up failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wallet & Credits</h1>
          <p className="text-sm text-slate-400 mt-1">
            Zero artificial send limits. Dispatches are gated solely by real-time atomic balance deductions.
          </p>
        </div>

        <button
          onClick={() => setShowTopUpModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Top Up Credits</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Credits</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
              ${user ? Number(user.walletBalance).toFixed(3) : '0.000'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Atomic lock enforced on every single send and bulk slice.
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Economic Architecture</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4">
            <span className="text-xl font-bold text-white">Deduct First & Refund</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            100% immediate wallet refund if a campaign is rejected by admin content compliance or hard bounces.
          </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Unit Rates</span>
            <span className="text-[11px] font-mono text-indigo-400">Per Email</span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Transactional OTP:</span>
              <span className="text-white">$0.050 / $0.025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Marketing Blast:</span>
              <span className="text-white">$0.035 / $0.015</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Notification / Test:</span>
              <span className="text-white">$0.025 / $0.010</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Atomic Transaction Ledger</h2>
          <span className="text-xs text-slate-400 font-mono">Total Transactions: {meta.total}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Type</th>
                <th className="px-6 py-3 text-left font-semibold">Amount</th>
                <th className="px-6 py-3 text-left font-semibold">Balance After</th>
                <th className="px-6 py-3 text-left font-semibold">Description</th>
                <th className="px-6 py-3 text-left font-semibold">Message ID</th>
                <th className="px-6 py-3 text-left font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Loading wallet transactions...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50 transition font-mono">
                    <td className="px-6 py-3.5 font-sans">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.type === 'CREDIT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'REFUND'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? (
                          <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                        ) : tx.type === 'REFUND' ? (
                          <RotateCcw className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{tx.type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={tx.type === 'CREDIT' || tx.type === 'REFUND' ? 'text-emerald-400' : 'text-slate-300'}>
                        {tx.type === 'DEBIT' ? '-' : '+'}${Number(tx.amount).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">${Number(tx.balanceAfter).toFixed(3)}</td>
                    <td className="px-6 py-3.5 text-slate-400 font-sans max-w-xs truncate">{tx.description}</td>
                    <td className="px-6 py-3.5 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {tx.messageId || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-sans text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{meta.totalPages || 1}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => (meta.hasNextPage ? p + 1 : p))}
              disabled={!meta.hasNextPage && page >= (meta.totalPages || 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Top Up Wallet Credits</h3>
            <p className="text-xs text-slate-400 mt-1">
              Inject credits directly into the tenant wallet ledger for immediate email sending.
            </p>

            <form onSubmit={handleTopUpSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Target Tenant Account</label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {allAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.email}) - Current: ${Number(acc.walletBalance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Amount (USD)</label>
                <div className="mt-1.5 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Audit Description</label>
                <input
                  type="text"
                  required
                  value={topUpDescription}
                  onChange={(e) => setTopUpDescription(e.target.value)}
                  placeholder="e.g. Wire transfer deposit #8410"
                  className="mt-1.5 block w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  {isSubmitting ? 'Crediting...' : 'Confirm Credit Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
