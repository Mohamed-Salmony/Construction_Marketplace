export type ShowLoadingFn = (message?: string, subMessage?: string) => void;
export type HideLoadingFn = () => void;

/**
 * Wrap any async task to show the global LoadingOverlay consistently.
 * Example:
 *   await withLoading(ctx.showLoading, ctx.hideLoading, () => fetchStuff(), 'Loading...', 'Please wait');
 */
export async function withLoading<T>(
  show?: ShowLoadingFn,
  hide?: HideLoadingFn,
  task?: () => Promise<T>,
  message?: string,
  subMessage?: string
): Promise<T | undefined> {
  try {
    show?.(message, subMessage);
    // @ts-ignore
    return await task?.();
  } finally {
    hide?.();
  }
}
