import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import LandingAttivita from './LandingAttivita'
import AttivitaPWA from './AttivitaPWA'
import { apiFetch } from '../../lib/api'

export default function AttivitaApp({ forceSlug } = {}) {
  const { slug: paramSlug } = useParams()
  const slug = forceSlug || paramSlug
  const [attivita, setAttivita] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/api/guest/a/${slug}`)
      .then(setAttivita)
      .catch(() => setError('Attività non trovata.'))
  }, [slug])

  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!attivita) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>

  if (attivita.pwa?.active) return <AttivitaPWA attivita={attivita} />
  // minisito.active mancante o true → mostra il sito pubblico (default)
  if (attivita.minisito?.active !== false) return <LandingAttivita attivita={attivita} />
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', textAlign: 'center', padding: 40 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Contenuto non disponibile</p>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Questo servizio è temporaneamente offline.</p>
    </div>
  )
}
