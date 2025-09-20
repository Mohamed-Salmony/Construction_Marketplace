import React from 'react';

export type InlineSpinnerProps = {
  className?: string;
  size?: number; // diameter in px
  message?: string;
  subMessage?: string;
};

/**
 * Inline spinner that matches the global LoadingOverlay visual style.
 * Use this inside cards/sections while keeping the same spinner look.
 */
export default function InlineSpinner({ className = '', size = 40, message, subMessage }: InlineSpinnerProps) {
  const isRtl = typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl';
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="relative">
        <div
          className="rounded-full border-4 border-primary/30 border-t-primary animate-spin"
          style={{ width: size, height: size }}
          aria-hidden
        />
        <span className="sr-only">Loading...</span>
      </div>
      {(message || subMessage) && (
        <div className="mt-3">
          <div className="text-sm font-medium">{message || (isRtl ? 'جاري التحميل...' : 'Loading...')}</div>
          {subMessage && <div className="text-xs text-muted-foreground mt-0.5">{subMessage}</div>}
        </div>
      )}
    </div>
  );
}
