import { Suspense } from 'react'
import EventoPage from '@/components/guest/EventoPage'
import LanguageSwitcher from '@/components/guest/LanguageSwitcher'

export const dynamic = 'force-dynamic'

export default async function Page(props) {
  const searchParams = await props.searchParams;
  const lang = searchParams?._lang === 'en' ? 'en' : 'it'
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <EventoPage />
      <LanguageSwitcher lang={lang} />
    </Suspense>
  )
}
