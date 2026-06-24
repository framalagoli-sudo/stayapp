import PolicyPage from '@/components/public/PolicyPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const metadata = { title: 'Cookie Policy', robots: { index: false } }

export default function Page({ searchParams }) {
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <>
      <PolicyPage type="cookie" entityType="ristorante" lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
