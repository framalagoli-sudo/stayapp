import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import LandingAttivita from './LandingAttivita'
import AttivitaPWA from './AttivitaPWA'
import { apiFetch } from '../../lib/api'

export default function AttivitaApp({ forceSlug } = {}) {
  const { slug: paramSlug } = useParams()
  const slug = forceSlug || paramSlug
  const [searchParams] = useSearchParams()
  const isQR = searchParams.get('qr') === '1'
  const [attivita, setAttivita] = useState(null)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    apiFetch(`/api/guest/a/${slug}`)
      .then(setAttivita)
      .catch(() => setError('Attività non trovata.'))
  }, [slug])

  if (error)    return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!attivita) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  const pwaOn  = attivita.pwa?.active === true
  const miniOn = attivita.minisito?.active !== false

  // QR con PWA attiva → PWA; qualsiasi altro caso con minisito attivo → minisito
  if (miniOn && (!isQR || !pwaOn)) return <LandingAttivita attivita={attivita} />
  if (pwaOn) return <AttivitaPWA attivita={attivita} />
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', textAlign: 'center', padding: 40 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Contenuto non disponibile</p>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Questo servizio è temporaneamente offline.</p>
    </div>
  )
}
