import React from 'react';

export type DialogVariant = 'danger' | 'warning' | 'default';
export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOutsideClick?: boolean;
}

export interface ConfirmOptions {
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: React.ReactNode;
  /**
   * If an async function is provided, the confirm button will show a loading spinner
   * and the dialog will only close if the promise resolves successfully.
   */
  onConfirmAsync?: () => Promise<void>;
}

export interface AlertOptions {
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  variant?: AlertVariant;
  icon?: React.ReactNode;
}

export interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
}
