'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { ImageIcon, X } from 'lucide-react'

// Bottone "Sfoglia immagini" + modale che mostra gli upload già fatti per
// l'entità (via GET /api/media). onPick(url) riceve l'URL scelto.
export default function MediaPickerButton({ entityId, entityTipo, onPick, label = 'Sfoglia immagini' }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  async function load() {
    setLoading(true); setErr(null)
    try {
      const data = await apiFetch(`/api/media?entity_type=${entityTipo}&entity_id=${entityId}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) { setErr(e.message); setItems([]) }
    setLoading(false)
  }
  function openModal() { setOpen(true); if (items === null) load() }

  return (
    <>
      <button type="button" onClick={openModal} disabled={!entityId}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: entityId ? 'pointer' : 'not-allowed', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ImageIcon size={13} strokeWidth={1.5} /> {label}
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Immagini caricate</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: 16 }}>
              {loading && <p style={{ color: '#888', fontSize: 13 }}>Caricamento…</p>}
              {err && <p style={{ color: '#c00', fontSize: 13 }}>{err}</p>}
              {items && items.length === 0 && !loading && (
                <p style={{ color: '#aaa', fontSize: 13 }}>Nessuna immagine ancora. Caricane una con "Carica immagine".</p>
              )}
              {items && items.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                  {items.map(it => (
                    <button key={it.name} type="button" onClick={() => { onPick(it.url); setOpen(false) }}
                      style={{ padding: 0, border: '2px solid #eee', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fff', aspectRatio: '1/1' }}>
                      <img src={it.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
