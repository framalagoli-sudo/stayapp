import { Suspense } from 'react'
import ConfirmSubscriptionPage from '@/components/public/ConfirmSubscriptionPage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <ConfirmSubscriptionPage />
    </Suspense>
  )
}
