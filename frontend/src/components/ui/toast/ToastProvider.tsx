'use client';

import React, { createContext, useState, useCallback } from 'react';
import { Toast } from './Toast';
import { ToastItem, ToastType, ToastOptions, ToastContextValue } from './toast.types';

export const ToastContext = createContext<ToastContextValue | null>(null);

let toastCount = 0;
function generateId(): string {
  toastCount += 1;
  return `toast_${Date.now()}_${toastCount}`;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string | React.ReactNode, options?: ToastOptions): string => {
      const id = generateId();
      const newToast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration !== undefined ? options.duration : 4500,
        action: options?.action,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep at most 5 toasts visible
      return id;
    },
    [],
  );

  const success = useCallback(
    (message: string | React.ReactNode, options?: ToastOptions) => show('success', message, options),
    [show],
  );

  const error = useCallback(
    (message: string | React.ReactNode, options?: ToastOptions) => show('error', message, options),
    [show],
  );

  const warning = useCallback(
    (message: string | React.ReactNode, options?: ToastOptions) => show('warning', message, options),
    [show],
  );

  const info = useCallback(
    (message: string | React.ReactNode, options?: ToastOptions) => show('info', message, options),
    [show],
  );

  return (
    <ToastContext.Provider value={{ toasts, dismiss, show, success, error, warning, info }}>
      {children}
      {/* Toast Portal Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-0 right-0 z-50 p-4 sm:p-6 flex flex-col items-end gap-2.5 pointer-events-none max-w-full"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
