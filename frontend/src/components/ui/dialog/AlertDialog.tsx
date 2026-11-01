'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Dialog } from './Dialog';
import { AlertOptions } from './dialog.types';

interface AlertDialogProps {
  isOpen: boolean;
  options: AlertOptions;
  onDismiss: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  options,
  onDismiss,
}) => {
  const {
    title,
    description,
    confirmText = 'Understood',
    variant = 'info',
    icon,
  } = options;

  const variantStyles = {
    success: {
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      defaultIcon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      btn: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 text-white shadow-lg shadow-emerald-600/20',
    },
    error: {
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      defaultIcon: <AlertCircle className="w-5 h-5 text-rose-400" />,
      btn: 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 text-white shadow-lg shadow-rose-600/20',
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      defaultIcon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      btn: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white shadow-lg shadow-amber-600/20',
    },
    info: {
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      defaultIcon: <Info className="w-5 h-5 text-indigo-400" />,
      btn: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 text-white shadow-lg shadow-indigo-600/20',
    },
  }[variant];

  return (
    <Dialog isOpen={isOpen} onClose={onDismiss} title="" maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start space-x-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
            {icon || variantStyles.defaultIcon}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {description && (
              <div className="text-xs text-slate-400 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onDismiss}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition focus:outline-none focus:ring-2 ${variantStyles.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
