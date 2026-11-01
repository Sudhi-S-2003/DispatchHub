'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BaseDialogProps } from './dialog.types';

export const Dialog: React.FC<BaseDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  closeOnOutsideClick = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Focus the modal container
    if (dialogRef.current) {
      dialogRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => closeOnOutsideClick && onClose()}
        aria-hidden="true"
      />

      {/* Dialog Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxWidthClasses} bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden focus:outline-none transition-all transform animate-in zoom-in-95 fade-in duration-150`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-start justify-between gap-4">
          <div>
            <h3 id="dialog-title" className="text-base font-bold text-white tracking-tight">
              {title}
            </h3>
            {description && (
              <div id="dialog-description" className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                {description}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body & Content */}
        {children && <div className="p-6">{children}</div>}
      </div>
    </div>
  );
};
