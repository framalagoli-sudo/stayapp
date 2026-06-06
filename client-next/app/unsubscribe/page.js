import { Suspense } from 'react'
import UnsubscribePage from '@/components/public/UnsubscribePage'


export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <UnsubscribePage />
    </Suspense>
  )
}

