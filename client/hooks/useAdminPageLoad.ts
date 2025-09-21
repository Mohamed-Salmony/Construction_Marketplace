import { useEffect, useCallback, useRef, useState } from 'react';

export function useAdminPageLoad<T>(
  loadFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple calls
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isLoadingRef.current = false;
    }
  }, [loadFn]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    
    return () => {
      mountedRef.current = false;
    };
  }, dependencies);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { loading, data, error, reload: load };
}
