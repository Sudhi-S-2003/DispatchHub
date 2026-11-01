'use client';

import React, { createContext, useState, useCallback, useRef } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertDialog } from './AlertDialog';
import { ConfirmOptions, AlertOptions, DialogContextValue } from './dialog.types';

export const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({ title: '' });
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  // Alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({ title: '' });
  const alertResolverRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmOptions(options);
      setConfirmOpen(true);
      confirmResolverRef.current = resolve;
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertOptions(options);
      setAlertOpen(true);
      alertResolverRef.current = resolve;
    });
  }, []);

  const handleConfirmAction = async () => {
    if (confirmOptions.onConfirmAsync) {
      await confirmOptions.onConfirmAsync();
    }
    setConfirmOpen(false);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(true);
      confirmResolverRef.current = null;
    }
  };

  const handleCancelAction = () => {
    setConfirmOpen(false);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
      confirmResolverRef.current = null;
    }
  };

  const handleAlertDismiss = () => {
    setAlertOpen(false);
    if (alertResolverRef.current) {
      alertResolverRef.current();
      alertResolverRef.current = null;
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, showAlert }}>
      {children}
      {confirmOpen && (
        <ConfirmDialog
          isOpen={confirmOpen}
          options={confirmOptions}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      )}
      {alertOpen && (
        <AlertDialog
          isOpen={alertOpen}
          options={alertOptions}
          onDismiss={handleAlertDismiss}
        />
      )}
    </DialogContext.Provider>
  );
};
