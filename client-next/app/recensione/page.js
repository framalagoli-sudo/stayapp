import { Suspense } from 'react'
import RecensionePage from '@/components/public/RecensionePage'


export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#888'}}>Caricamento…</div>}>
      <RecensionePage />
    </Suspense>
  )
}

