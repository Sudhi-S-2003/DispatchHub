'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDialog, useToast, Dialog } from '@/components/ui';
import { AccountItem } from './AccountItem';
import {
  ChevronDown,
  UserPlus,
  LogOut,
  Shield,
  Wallet,
  Check,
  Plus,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AccountSwitcher: React.FC = () => {
  const {
    user,
    accounts,
    switchAccount,
    removeAccount,
    signOutCurrent,
    signOutAll,
    login,
  } = useAuth();

  const { confirm } = useDialog();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Account Form State
  const [newEmail, setNewEmail] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const initials = (user.name || user.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const otherAccounts = accounts.filter((a) => a.id !== user.id);

  const handleSelectAccount = async (targetId: string) => {
    setSwitchingId(targetId);
    try {
      toast.info('Switching active session...');
      await switchAccount(targetId);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.userMessage || err.message || 'Failed to switch account');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRemoveSavedAccount = async (targetId: string) => {
    const target = accounts.find((a) => a.id === targetId);
    const confirmed = await confirm({
      title: `Remove account from switcher?`,
      description: `"${target?.email || 'This account'}" will be removed from your saved accounts on this browser.`,
      confirmText: 'Remove account',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    removeAccount(targetId);
    toast.success('Saved account removed from this browser.');
  };

  const handleSignOutCurrent = async () => {
    const confirmed = await confirm({
      title: 'Sign out of current account?',
      description: `You will be signed out of ${user.email}.${
        otherAccounts.length > 0 ? ' Your other saved accounts will remain accessible.' : ''
      }`,
      confirmText: 'Sign out',
      cancelText: 'Cancel',
      variant: 'default',
    });

    if (!confirmed) return;
    setIsOpen(false);
    await signOutCurrent();
    toast.info('Signed out of current account.');
  };

  const handleSignOutAll = async () => {
    const confirmed = await confirm({
      title: 'Sign out of ALL accounts?',
      description: `This will end all ${accounts.length} active sessions and clear all cached credentials from this browser.`,
      confirmText: 'Sign out all accounts',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    setIsOpen(false);
    await signOutAll();
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await login(newEmail, newApiKey || undefined);
      toast.success(`Account authenticated! Switched to ${newEmail}`);
      setShowAddModal(false);
      setIsOpen(false);
      setNewEmail('');
      setNewApiKey('');
    } catch (err: any) {
      toast.error(err.userMessage || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAdd = async (email: string) => {
    setIsAdding(true);
    try {
      await login(email);
      toast.success(`Account authenticated! Switched to ${email}`);
      setShowAddModal(false);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.userMessage || err.message || 'Quick login failed.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 p-1.5 pl-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
            user.role === 'ADMIN'
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
          }`}
        >
          {initials}
        </div>

        {/* User Identity Preview */}
        <div className="hidden sm:block">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className="text-xs font-semibold text-white max-w-[110px] truncate">
              {user.name || user.email.split('@')[0]}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                user.role === 'ADMIN'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {user.role}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate max-w-[130px]">
            {user.email}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* GitHub-Style Account Switcher Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Active Account Section */}
          <div className="p-4 bg-slate-950/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Active Account
            </span>
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono shrink-0 ${
                  user.role === 'ADMIN'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-bold text-white truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      user.role === 'ADMIN'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-slate-400">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono font-bold text-emerald-400">
                    ${Number(user.walletBalance || 0).toFixed(3)}
                  </span>
                  <span className="text-[10px] text-slate-500">available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Switch Account Section */}
          <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2.5 pt-1 block">
              Switch Account
            </span>

            {otherAccounts.length === 0 ? (
              <p className="text-xs text-slate-500 px-2.5 py-2">
                No other accounts saved on this device.
              </p>
            ) : (
              otherAccounts.map((acc) => (
                <AccountItem
                  key={acc.id}
                  account={acc}
                  isActive={false}
                  isSwitching={switchingId === acc.id}
                  onSelect={handleSelectAccount}
                  onRemove={handleRemoveSavedAccount}
                />
              ))
            )}

            {/* Add Another Account Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-xl transition text-left"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>+ Add another account</span>
            </button>
          </div>

          {/* Logout Actions */}
          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={handleSignOutCurrent}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign out current account</span>
            </button>

            {accounts.length > 1 && (
              <button
                type="button"
                onClick={handleSignOutAll}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign out of all accounts</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <Dialog
          isOpen={showAddModal}
          onClose={() => !isAdding && setShowAddModal(false)}
          title="Add Another DispatchHub Account"
          description="Authenticate an additional tenant or admin account to switch between them seamlessly without signing out."
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Quick Demo Options */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1-Click Demo Accounts
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => handleQuickAdd('admin@dispatchhub.com')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-left transition"
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    <span>Master Admin</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    admin@dispatchhub.com
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => handleQuickAdd('client@acme.com')}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition"
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Client Demo</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    client@acme.com
                  </span>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase font-semibold">
                Or Sign In With Email
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Email / API Key Form */}
            <form onSubmit={handleAddAccountSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  API Key <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="dh_live_..."
                  className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newEmail}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition disabled:opacity-50"
                >
                  {isAdding ? 'Authenticating...' : 'Add & Activate'}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
};
