import { useState } from 'react'
import { uploadMedia } from '../../lib/api'

export default function GallerySection({ gallery = [], onChange }) {
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 10 - gallery.length)
    if (!files.length) return
    setUploading(true)
    const urls = []
    try {
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) { alert(`"${file.name}" supera i 2 MB — saltata`); continue }
        const { url } = await uploadMedia('/api/upload/gallery', file)
        urls.push(url)
      }
      if (urls.length) onChange([...gallery, ...urls])
    } catch (err) {
      alert(`Errore upload: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function remove(i) {
    onChange(gallery.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {gallery.map((url, i) => (
          <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => remove(i)}
              style={{
                position: 'absolute', top: 5, right: 5,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        ))}

        {gallery.length < 10 && (
          <label style={{
            aspectRatio: '1', borderRadius: 10, border: '2px dashed #d0d0d0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'default' : 'pointer', background: '#fafafa',
            color: '#bbb', fontSize: 12, gap: 4,
          }}>
            {uploading
              ? 'Caricamento…'
              : <><span style={{ fontSize: 28, lineHeight: 1 }}>+</span>Aggiungi</>
            }
            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={handleFiles} disabled={uploading} />
          </label>
        )}
      </div>
      <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
        Max 10 foto · max 2 MB ciascuna · Le foto vengono salvate automaticamente.
      </p>
    </div>
  )
}
