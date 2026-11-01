'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { errorLogger } from '@/lib/errors';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorLogger.error(error, {
      digest: error.digest,
      source: 'NextRootGlobalError',
    });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 antialiased font-sans">
        <div className="max-w-lg w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">System Critical Failure</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              DispatchHub root application shell failed to initialize. Your session state is preserved in local storage.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-slate-500 pt-2">
                Crash Reference: <span className="text-slate-400">{error.digest}</span>
              </p>
            )}
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <span>Hard Reset</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
