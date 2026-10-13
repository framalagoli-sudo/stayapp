'use client'
import { useAuth } from '@/context/AuthContext'
import { usePropertyId } from '@/context/PropertyIdContext'
import MarchioEStile from '@/components/admin/MarchioEStile'

// La pagina «Marchio e stile» della struttura: il pannello è uno solo per i tre
// tipi. L'id arriva dall'indirizzo (/admin/struttura/:id/…) o, per chi ha una
// struttura sola, dal profilo — come in `useProperty`.
export default function PropertyThemePage() {
  const { profile } = useAuth()
  const id = usePropertyId() || profile?.property_id
  if (!id) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  return <MarchioEStile tipo="struttura" id={id} />
}
