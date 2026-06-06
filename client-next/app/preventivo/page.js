import { Suspense } from 'react'
import PreventivoPublicPage from '@/components/public/PreventivoPublicPage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <PreventivoPublicPage />
    </Suspense>
  )
}
