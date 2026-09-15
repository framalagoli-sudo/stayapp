'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRistorante } from '../../../hooks/useRistorante'
import GalleriaFoto from '../GalleriaFoto'

export default function RistoranteGalleryPage() {
  const { id } = useParams()
  const { ristorante, loading, save, saved, saving } = useRistorante(id)
  const [gallery, setGallery] = useState([])

  useEffect(() => { if (ristorante) setGallery(ristorante.gallery || []) }, [ristorante])

  // Ogni cambiamento — foto aggiunta, tolta o spostata — si salva subito, come
  // prima: su questa pagina non c'è un pulsante Salva da ricordarsi.
  function aggiorna(nuova) {
    setGallery(nuova)
    save({ gallery: nuova }).catch(() => {})
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
        <h2 style={titleStyle}>Galleria foto</h2>
        {saved && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={descStyle}>Le foto vengono mostrate nell'app ai clienti.</p>

      <div style={cardStyle}>
        <GalleriaFoto
          foto={gallery}
          onChange={aggiorna}
          endpoint={`/api/upload/restaurant-gallery?ristorante_id=${id}`}
          unsplashQuery={ristorante.name || ''}
          primaEtichetta="anteprima"
          nota="La prima foto è quella che si vede sulla scheda della galleria nell'app."
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
