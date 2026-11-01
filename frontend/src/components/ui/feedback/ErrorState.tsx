import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) => {
  return (
    <div
      className={`p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-rose-400" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-rose-300">{title}</h4>
        <p className="text-xs text-rose-400/90 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 border border-rose-500/30 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};
