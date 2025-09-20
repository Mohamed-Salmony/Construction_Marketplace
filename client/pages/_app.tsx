import React, { useEffect } from 'react';
import App, { type AppProps, type AppContext } from 'next/app';
import '../app/globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import { toastError } from '../utils/alerts';

export default function MyApp({ Component, pageProps }: AppProps) {
  // Global window-level error handlers to avoid crashing the app on runtime errors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onError = (event: ErrorEvent) => {
      // Log and show a lightweight toast; do not rethrow
      // eslint-disable-next-line no-console
      console.error('[window.error]', event.message, event.error);
      try { toastError('An unexpected error occurred'); } catch {}
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error('[window.unhandledrejection]', event.reason);
      try { toastError('A network or runtime error occurred'); } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return (
    <>
      <GlobalErrorBoundary>
        <Component {...pageProps} />
      </GlobalErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
