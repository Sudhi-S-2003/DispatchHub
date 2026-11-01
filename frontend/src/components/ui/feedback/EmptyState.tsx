import React from 'react';
import { Layers } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  const hasButton = action || (actionLabel && onAction);
  const buttonLabel = action ? action.label : actionLabel;
  const buttonClick = action ? action.onClick : onAction;

  return (
    <div
      className={`p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center">
        {icon || <Layers className="w-6 h-6 text-slate-500" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        {description && <p className="text-xs text-slate-400 leading-relaxed">{description}</p>}
      </div>
      {hasButton && (
        <button
          type="button"
          onClick={buttonClick}
          className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
};
