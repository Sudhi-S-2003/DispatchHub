'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItem } from './toast.types';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, type, title, message, duration = 4500, action } = toast;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const typeStyles = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-400',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-400',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/10 text-amber-400',
    },
    info: {
      icon: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
      border: 'border-indigo-500/30',
      badge: 'bg-indigo-500/10 text-indigo-400',
    },
  }[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 bg-slate-900/95 backdrop-blur-md border ${typeStyles.border} rounded-xl shadow-xl transition-all animate-in slide-in-from-bottom-5 fade-in duration-200`}
    >
      <div className="pt-0.5">{typeStyles.icon}</div>

      <div className="flex-1 space-y-1">
        {title && <p className="text-xs font-bold text-white tracking-tight">{title}</p>}
        <div className="text-xs text-slate-300 leading-relaxed">{message}</div>

        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss(id);
            }}
            className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-md transition"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
