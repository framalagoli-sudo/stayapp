import { Suspense } from 'react'
import EventoPage from '@/components/guest/EventoPage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <EventoPage />
    </Suspense>
  )
}
