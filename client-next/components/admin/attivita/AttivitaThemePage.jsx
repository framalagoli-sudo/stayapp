'use client'
import { useParams } from 'next/navigation'
import MarchioEStile from '@/components/admin/MarchioEStile'

// La pagina «Marchio e stile» dell'attività: il pannello è uno solo per i tre tipi.
export default function AttivitaThemePage() {
  const { id } = useParams()
  return <MarchioEStile tipo="attivita" id={id} />
}
