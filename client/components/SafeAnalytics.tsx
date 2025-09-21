import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function SafeAnalytics() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only render analytics in production and on client side
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Add a small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
