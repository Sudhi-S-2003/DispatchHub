import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading telemetry...',
  className = '',
}) => {
  return (
    <div
      className={`p-10 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-2.5 ${className}`}
    >
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
};
