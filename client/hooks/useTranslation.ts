'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getTranslation, type Locale } from '../lib/translations'

export function useTranslation() {
  const pathname = usePathname()

  // Initial locale: prefer saved value, then URL segment; default to 'ar'
  const initialLocale = useMemo<Locale>(() => {
    let stored: string | null = null
    try {
      if (typeof window !== 'undefined') stored = localStorage.getItem('locale')
    } catch { /* ignore */ }
    if (stored === 'en' || stored === 'ar') return stored as Locale
    const firstSegment = (pathname ?? '/ar').split('/')[1] || 'ar'
    return (firstSegment as Locale) || 'ar'
  }, [pathname])

  const [locale, setLocale] = useState<Locale>(initialLocale)

  // Client-side override: honor saved locale in localStorage if present
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('locale') as Locale | null) : null
      if (stored && stored !== locale) {
        setLocale(stored)
      }
    } catch {
      // ignore storage access issues
    }
    // Sync across tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'locale' && (e.newValue === 'en' || e.newValue === 'ar')) {
        setLocale(e.newValue as Locale)
      }
    }
    // Same-tab language switch without navigation
    const onLocaleChanged = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as Locale | undefined
        if (detail === 'en' || detail === 'ar') setLocale(detail)
        else {
          const stored = localStorage.getItem('locale') as Locale | null
          if (stored === 'en' || stored === 'ar') setLocale(stored)
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      window.addEventListener('locale-changed', onLocaleChanged as any)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('locale-changed', onLocaleChanged as any)
      }
    }
  }, [pathname, locale])

  const t = (key: string): string => {
    return getTranslation(locale, key)
  }

  return { t, locale }
}