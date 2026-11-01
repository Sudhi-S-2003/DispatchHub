import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string | React.ReactNode;
  title?: string;
  duration?: number;
  action?: ToastAction;
}

export type ToastOptions = Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>;

export interface ToastContextValue {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
  show: (type: ToastType, message: string | React.ReactNode, options?: ToastOptions) => string;
  success: (message: string | React.ReactNode, options?: ToastOptions) => string;
  error: (message: string | React.ReactNode, options?: ToastOptions) => string;
  warning: (message: string | React.ReactNode, options?: ToastOptions) => string;
  info: (message: string | React.ReactNode, options?: ToastOptions) => string;
}
