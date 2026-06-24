import PolicyPage from '@/components/public/PolicyPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const metadata = { title: 'Privacy Policy', robots: { index: false } }

export default function Page({ searchParams }) {
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <>
      <PolicyPage type="privacy" entityType="attivita" lang={lang} />
      <LanguageSwitcher lang={lang} />
    </>
  )
}
