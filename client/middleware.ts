import { NextRequest, NextResponse } from 'next/server'

const locales = ['ar', 'en']
const defaultLocale = 'ar'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for Vercel analytics and internal assets
  if (pathname.includes('/_vercel/') || pathname.includes('/_next/') || pathname.includes('/api/')) {
    return NextResponse.next()
  }
  
  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    )
  }

  // Add the current pathname to headers for use in layout
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, _vercel, static assets)
    '/((?!_next|_vercel|api|favicon|icon|robots.txt|sitemap.xml|manifest.json|.*\\.).*)',
  ],
}