import { Suspense } from 'react'
import AnnullaEventoPage from '@/components/public/AnnullaEventoPage'

// Un link personale arrivato per email: non è una pagina da motore di ricerca.
export const metadata = { title: 'Annulla la prenotazione', robots: { index: false, follow: false } }

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#767676' }}>Caricamento…</div>}>
      <AnnullaEventoPage />
    </Suspense>
  )
}
