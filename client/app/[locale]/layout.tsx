import type { Metadata } from 'next'

type Props = {
  children: React.ReactNode
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'Neoteric - منصة المقاولات الشاملة' : 'Neoteric - Comprehensive Construction Platform',
    description: locale === 'ar' 
      ? 'منصة شاملة لخدمات ومنتجات المقاولات في المملكة العربية السعودية'
      : 'Comprehensive platform for construction services and products in Saudi Arabia',
  }
}

export default function LocaleLayout({
  children,
  params: { locale },
}: Props) {
  return children
}