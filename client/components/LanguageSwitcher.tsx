'use client'

import { Button } from './ui/button'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  // Derive current locale: prefer localStorage, then URL path (fallback to 'ar')
  const getPath = () => {
    if (typeof window === 'undefined') return '/ar'
    try { return window.location.pathname || '/ar' } catch { return '/ar' }
  }
  const getCurrentLocale = (): 'ar' | 'en' => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null
      if (stored === 'ar' || stored === 'en') return stored
    } catch {}
    const seg = (getPath().split('/')[1] || 'ar')
    return (seg === 'en' ? 'en' : 'ar')
  }
  const currentLocale = getCurrentLocale()
  const displayLabel = currentLocale === 'ar' ? 'AR' : 'EN'

  const switchLanguage = (newLocale: 'ar' | 'en') => {
    // 1) Persist selection
    try { localStorage.setItem('locale', newLocale) } catch {}

    // 2) Update URL locale segment without navigating
    try {
      const url = new URL(window.location.href)
      const segments = url.pathname.split('/')
      segments[1] = newLocale
      url.pathname = segments.join('/')
      // Clean up stale page-specific params when toggling locale
      const page = url.searchParams.get('page') || ''
      const needsServiceId = page === 'technician-service-details'
      const needsProjectId = page === 'technician-project-details'
      if (!needsServiceId) url.searchParams.delete('serviceId')
      if (!needsProjectId) url.searchParams.delete('projectId')
      window.history.replaceState({}, '', url.toString())
    } catch {}

    // 3) Notify app in same tab
    try { window.dispatchEvent(new CustomEvent('locale-changed', { detail: newLocale })) } catch {}
  }

  return (
    <Button
      variant="ghost"
      aria-label={currentLocale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      title={currentLocale === 'ar' ? 'English' : 'العربية'}
      className="h-8 px-2 flex items-center gap-1"
      onClick={() => switchLanguage(currentLocale === 'ar' ? 'en' : 'ar')}
    >
      <Globe className="h-5 w-5" />
      <span className="text-xs font-semibold">{displayLabel}</span>
    </Button>
  )
}