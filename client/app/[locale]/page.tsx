import Router from '../../components/Router'

export function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }]
}

export const dynamicParams = false

export default function Home() {
  return <Router />
}