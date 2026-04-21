import { useProperty } from '../../../hooks/useProperty'
import GallerySection from '../GallerySection'
import { apiFetch, uploadMedia } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { useState } from 'react'

function getStoragePath(url) {
  const marker = '/property-media/'
  const idx = url?.indexOf(marker) ?? -1
  return idx !== -1 ? url.slice(idx + marker.length).split('?')[0] : null
}

export default function PropertyGalleryPage() {
  const { property, loading, save, propertyId } = useProperty()
  const [uploading, setUploading] = useState({})

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  async function handleUpload(field, file) {
    if (!file) return
    setUploading(u => ({ ...u, [field]: true }))
    try {
      const type = field === 'logo_url' ? 'logo' : 'cover'
      const { url } = await uploadMedia(`/api/upload/${type}`, file)
      await save({ [field]: url })
    } catch (e) { alert(`Errore upload: ${e.message}`) }
    finally { setUploading(u => ({ ...u, [field]: false })) }
  }

  async function removeMedia(field) {
    const type = field === 'logo_url' ? 'logo' : 'cover'
    try { await apiFetch(`/api/upload/${type}`, { method: 'DELETE' }) }
    catch (e) { alert(`Errore rimozione: ${e.message}`) }
    await save({ [field]: null }).catch(() => {})
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={titleStyle}>Galleria foto</h2>
      <p style={descStyle}>Le foto vengono mostrate nell'app ospite con scroll orizzontale. Tocca una foto per vederla a schermo intero.</p>

      {/* Logo & Cover */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Logo e copertina</h3>

        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <label style={lblStyle}>Logo struttura</label>
          {property.logo_url && (
            <div style={{ marginBottom: 10, padding: 12, background: '#f5f5f5', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <img key={property.logo_url} src={property.logo_url} alt="logo"
                style={{ maxHeight: 64, maxWidth: 180, objectFit: 'contain' }} />
              <button type="button" onClick={() => removeMedia('logo_url')}
                style={removeBtnStyle}>Rimuovi</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={uploadLabelStyle}>
              {uploading.logo_url ? 'Upload…' : property.logo_url ? 'Cambia logo' : 'Carica logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleUpload('logo_url', e.target.files[0])} />
            </label>
          </div>
          <p style={hintStyle}>Consigliato: 300×100 px, max 200 KB, PNG trasparente</p>
        </div>

        {/* Cover */}
        <div>
          <label style={lblStyle}>Foto di copertina</label>
          {property.cover_url && (
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <img key={property.cover_url} src={property.cover_url} alt="cover"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1px solid #ddd' }} />
              <button type="button" onClick={() => removeMedia('cover_url')}
                style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 10px' }}>
                Rimuovi
              </button>
            </div>
          )}
          <label style={uploadLabelStyle}>
            {uploading.cover_url ? 'Upload…' : property.cover_url ? 'Cambia foto' : 'Carica foto di copertina'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleUpload('cover_url', e.target.files[0])} />
          </label>
          <p style={hintStyle}>Consigliato: 1200×400 px, max 1 MB — usata nell'header con stile Cover o Gradiente</p>
        </div>
      </div>

      {/* Gallery */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Galleria</h3>
        <GallerySection
          gallery={property.gallery || []}
          onChange={v => save({ gallery: v }).catch(() => {})}
        />
      </div>
    </div>
  )
}

const titleStyle      = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle       = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle       = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle    = { marginTop: 0, marginBottom: 16, fontSize: 15 }
const lblStyle        = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }
const hintStyle       = { margin: '6px 0 0', fontSize: 11, color: '#aaa' }
const uploadLabelStyle = { padding: '8px 16px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333' }
const removeBtnStyle  = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }
const loadingStyle    = { padding: 32, color: '#888' }
const errorStyle      = { padding: 32, color: '#e53e3e' }
