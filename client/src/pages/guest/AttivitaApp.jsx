import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import LandingAttivita from './LandingAttivita'
import { apiFetch } from '../../lib/api'

export default function AttivitaApp() {
  const { slug } = useParams()
  const [attivita, setAttivita] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/api/guest/a/${slug}`)
      .then(setAttivita)
      .catch(() => setError('Attività non trovata.'))
  }, [slug])

  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#e53e3e' }}>{error}</div>
  if (!attivita) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento…</div>
  return <LandingAttivita attivita={attivita} />
}
