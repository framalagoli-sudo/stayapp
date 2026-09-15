'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAttivita } from '../../../hooks/useAttivita'
import GalleriaFoto from '../GalleriaFoto'

export default function AttivitaGalleryPage() {
  const { id } = useParams()
  const { attivita, loading, save, saved, saving } = useAttivita(id)
  const [gallery, setGallery] = useState([])

  useEffect(() => { if (attivita) setGallery(attivita.gallery || []) }, [attivita])

  // Ogni cambiamento — foto aggiunta, tolta o spostata — si salva subito, come
  // prima: su questa pagina non c'è un pulsante Salva da ricordarsi.
  function aggiorna(nuova) {
    setGallery(nuova)
    save({ gallery: nuova }).catch(() => {})
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!attivita) return <p style={errorStyle}>Attività non trovata.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h2 style={titleStyle}>Galleria foto</h2>
        {saved && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={descStyle}>Le foto vengono mostrate nella pagina pubblica.</p>

      <div style={cardStyle}>
        <GalleriaFoto
          foto={gallery}
          onChange={aggiorna}
          endpoint={`/api/upload/attivita-gallery?attivita_id=${id}`}
          unsplashQuery={attivita.name || ''}
          primaEtichetta="anteprima"
          nota="La prima foto è quella che si vede sulla scheda della galleria."
        />
      </div>
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
