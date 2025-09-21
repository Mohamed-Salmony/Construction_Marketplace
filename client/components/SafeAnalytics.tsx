import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import analytics to avoid SSR issues
const Analytics = dynamic(() => import('@vercel/analytics/react').then(mod => mod.Analytics), { ssr: false });
const SpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights), { ssr: false });

export default function SafeAnalytics() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Completely disable Analytics for now to prevent 404 errors
    // TODO: Re-enable when Vercel Analytics is properly configured
    return;
    
    // Only render analytics in production environment
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Check if we're on Vercel and analytics is available
      if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel.com')) {
        const timer = setTimeout(() => {
          setShouldRender(true);
        }, 3000); // Even longer delay
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Completely disable for now
  return null;

  // Don't render anything if not in production or not ready
  if (!shouldRender || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <>
      <Analytics debug={false} />
      <SpeedInsights debug={false} />
    </>
  );
}
