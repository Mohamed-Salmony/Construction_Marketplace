import { useEffect, useRef } from 'react';

// Call this hook at the top of a page component to show the Router's global
// LoadingOverlay once on first render, and get a helper to hide it when done.
// Usage:
//   const hideFirstOverlay = useFirstLoadOverlay(context, 'Loading...', 'Please wait');
//   ... after initial fetch completes ...
//   hideFirstOverlay(); // no-op after first call
export function useFirstLoadOverlay(
  context: any,
  message: string,
  subMessage?: string
) {
  const shownRef = useRef(false);
  const hiddenRef = useRef(false);

  useEffect(() => {
    try {
      if (!shownRef.current && typeof context?.showLoading === 'function') {
        context.showLoading(message, subMessage);
        shownRef.current = true;
      }
    } catch {}
    // do not auto-hide; page should explicitly call returned hide()
    // when its initial fetch resolves to avoid race conditions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hide = () => {
    if (hiddenRef.current) return;
    try {
      if (typeof context?.hideLoading === 'function') {
        context.hideLoading();
      }
    } catch {}
    hiddenRef.current = true;
  };

  return hide;
}
