import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
// Analytics disabled to prevent 404 errors and reload loops
// import { Analytics } from '@vercel/analytics/react'
// import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from '../components/ui/sonner'

export const metadata: Metadata = {
  title: 'Neoteric - منصة المقاولات الشاملة',
  description: 'منصة شاملة لخدمات ومنتجات المقاولات في المملكة العربية السعودية',
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
      <head>
        <link rel="icon" href="/Neoteric_Logo.jpg" type="image/jpeg" />
        <link rel="alternate icon" href="/Neoteric_Logo.jpg" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
        {/* Analytics disabled to prevent errors */}
        {/* {isProd && <Analytics />} */}
        {/* {isProd && <SpeedInsights />} */}
      </body>
    </html>
  )
}