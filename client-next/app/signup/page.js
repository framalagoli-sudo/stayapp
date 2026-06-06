import { Suspense } from 'react'
import SignupPage from '@/components/public/SignupPage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <SignupPage />
    </Suspense>
  )
}
