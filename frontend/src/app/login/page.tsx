'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Zap, Shield, User, ArrowRight, Loader2, Server, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLoginAs } = useAuth();
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid account email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), apiKey.trim() || undefined);
      router.push('/');
    } catch (err: any) {
      setError(err.userMessage || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (type: 'admin' | 'client') => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await quickLoginAs(type);
      router.push('/');
    } catch (err: any) {
      setError(err.userMessage || err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white mb-4">
          <Zap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Dispatch<span className="text-indigo-400">Hub</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise Email Dispatcher & Sharded Queue Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins */}
          <div className="mb-6 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1-Click Demo Accounts
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 transition group"
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Master Admin</span>
                </div>
                <span className="mt-1 text-[11px] text-slate-400">$1,000 Wallet</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('client')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 transition group"
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Client Demo</span>
                </div>
                <span className="mt-1 text-[11px] text-slate-400">Acme Corp ($49.95)</span>
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                Or Sign In With Email / Key
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                API Key <span className="text-slate-500 font-normal">(Optional for UI session)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/25 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Infrastructure status indicators */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>NestJS Backend v1.0.0</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Docker Redis + Postgres</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
