import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from '../components/ui/sonner'

export const metadata: Metadata = {
  title: 'Arabic Auto - منصة السيارات العربية',
  description: 'منصة شاملة لبيع وشراء السيارات والقطع والخدمات',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || ''
  const locale = pathname.split('/')[1] || 'ar'
  const isRTL = locale === 'ar'
  const isProd = process.env.NODE_ENV === 'production'
  
  return (
    <html suppressHydrationWarning lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
        {isProd && <Analytics />}
        {isProd && <SpeedInsights />}
      </body>
    </html>
  )
}