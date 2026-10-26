import { Suspense } from 'react'
import PostoEventoPage from '@/components/public/PostoEventoPage'

// Un link personale arrivato per email: non è una pagina da motore di ricerca.
export const metadata = { title: 'Un posto per te', robots: { index: false, follow: false } }

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#767676' }}>Caricamento…</div>}>
      <PostoEventoPage />
    </Suspense>
  )
}
