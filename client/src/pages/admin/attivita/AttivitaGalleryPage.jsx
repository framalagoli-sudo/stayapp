import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAttivita } from '../../../hooks/useAttivita'
import { uploadMedia } from '../../../lib/api'

export default function AttivitaGalleryPage() {
  const { id } = useParams()
  const { attivita, loading, save, saved, saving } = useAttivita(id)
  const [gallery, setGallery] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (attivita) setGallery(attivita.gallery || []) }, [attivita])

  async function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 10 - gallery.length)
    if (!files.length) return
    setUploading(true)
    const urls = []
    try {
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) { alert(`"${file.name}" supera i 2 MB — saltata`); continue }
        const { url } = await uploadMedia(`/api/upload/attivita-gallery?attivita_id=${id}`, file)
        urls.push(url)
      }
      if (urls.length) {
        const updated = [...gallery, ...urls]
        setGallery(updated)
        save({ gallery: updated }).catch(() => {})
      }
    } catch (err) {
      alert(`Errore upload: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function remove(i) {
    const updated = gallery.filter((_, idx) => idx !== i)
    setGallery(updated)
    save({ gallery: updated }).catch(() => {})
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
      <p style={descStyle}>Le foto vengono mostrate nella pagina pubblica. Max 10 foto, 2 MB ciascuna.</p>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          {gallery.map((url, i) => (
            <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => remove(i)}
                style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          ))}

          {gallery.length < 10 && (
            <label style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed #d0d0d0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer', background: '#fafafa', color: '#bbb', fontSize: 12, gap: 4 }}>
              {uploading
                ? 'Caricamento…'
                : <><span style={{ fontSize: 28, lineHeight: 1 }}>+</span>Aggiungi</>}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={handleFiles} disabled={uploading} />
            </label>
          )}
        </div>

        {gallery.length === 0 && !uploading && (
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>Nessuna foto ancora. Carica la prima foto.</p>
        )}
      </div>
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
