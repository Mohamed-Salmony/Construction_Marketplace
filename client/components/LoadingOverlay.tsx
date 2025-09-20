import React from 'react';

export type LoadingOverlayProps = {
  open: boolean;
  message?: string;
  subMessage?: string;
};

export function LoadingOverlay({ open, message, subMessage }: LoadingOverlayProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-gray-800/70 p-6 shadow-2xl w-[90%] max-w-sm text-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" aria-hidden />
          <span className="sr-only">Loading...</span>
        </div>
        <div>
          <div className="text-base font-semibold">{message || (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl' ? 'جاري المعالجة...' : 'Processing...')}</div>
          {subMessage && <div className="text-sm text-muted-foreground mt-1">{subMessage}</div>}
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
