'use client'
import { useParams } from 'next/navigation'
import MarchioEStile from '@/components/admin/MarchioEStile'

// La pagina «Marchio e stile» del ristorante: il pannello è uno solo per i tre tipi.
export default function RistoranteThemePage() {
  const { id } = useParams()
  return <MarchioEStile tipo="ristorante" id={id} />
}
