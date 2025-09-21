import { useCallback, useRef } from 'react';

/**
 * Creates a stable callback that can access latest values without causing re-renders
 * This prevents infinite loops while maintaining access to current state
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(((...args: any[]) => {
    return callbackRef.current(...args);
  }) as T, []);
}

export default useStableCallback;
