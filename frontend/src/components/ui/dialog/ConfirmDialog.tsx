'use client';

import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { ConfirmOptions } from './dialog.types';

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  options,
  onConfirm,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const {
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    icon,
  } = options;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      defaultIcon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 text-white shadow-lg shadow-rose-600/20',
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      defaultIcon: <AlertCircle className="w-5 h-5 text-amber-400" />,
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 text-white shadow-lg shadow-amber-600/20',
    },
    default: {
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      defaultIcon: <Info className="w-5 h-5 text-indigo-400" />,
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 text-white shadow-lg shadow-indigo-600/20',
    },
  }[variant];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !loading && onCancel()}
      title=""
      closeOnOutsideClick={!loading}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header with Variant Icon */}
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg border border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 focus:outline-none focus:ring-2 disabled:opacity-50 ${variantStyles.confirmBtn}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
