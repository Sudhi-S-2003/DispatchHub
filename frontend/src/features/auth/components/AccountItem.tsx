'use client';

import React from 'react';
import { AccountSession } from '../types/account-session.types';
import { Check, Trash2, Shield, User, Loader2 } from 'lucide-react';

interface AccountItemProps {
  account: AccountSession;
  isActive: boolean;
  isSwitching?: boolean;
  onSelect: (accountId: string) => void;
  onRemove: (accountId: string) => void;
}

export const AccountItem: React.FC<AccountItemProps> = ({
  account,
  isActive,
  isSwitching,
  onSelect,
  onRemove,
}) => {
  const initials = (account.name || account.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isAdmin = account.role === 'ADMIN';

  return (
    <div
      className={`group flex items-center justify-between p-2.5 rounded-xl transition ${
        isActive
          ? 'bg-indigo-950/40 border border-indigo-500/30'
          : 'hover:bg-slate-850 border border-transparent'
      }`}
    >
      {/* Account Info Button */}
      <button
        type="button"
        disabled={isActive || isSwitching}
        onClick={() => onSelect(account.id)}
        className="flex items-center space-x-3 text-left flex-1 min-w-0 pr-2 disabled:cursor-default"
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 transition ${
            isAdmin
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {initials}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-white truncate max-w-[140px]">
              {account.name || account.email.split('@')[0]}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {account.role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{account.email}</p>
        </div>
      </button>

      {/* Trailing Actions */}
      <div className="flex items-center space-x-1 shrink-0">
        {isSwitching ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        ) : isActive ? (
          <div
            className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"
            title="Active Account"
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(account.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
            title="Remove account from device"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
