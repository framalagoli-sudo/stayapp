import { Suspense } from 'react'
import CancellaPrenotazionePage from '@/components/public/CancellaPrenotazionePage'


export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <CancellaPrenotazionePage />
    </Suspense>
  )
}

