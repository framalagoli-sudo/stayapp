'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Search, X } from 'lucide-react'

// Bottone "Cerca su Unsplash" + modale di ricerca foto. onPick(url) riceve l'URL
// della foto scelta. Usa GET /api/ai/unsplash?q= (richiede UNSPLASH_ACCESS_KEY).
export default function UnsplashPicker({ onPick, label = 'Cerca su Unsplash', defaultQuery = '' }) {
  const [open, setOpen]       = useState(false)
  const [q, setQ]            = useState(defaultQuery)
  const [photos, setPhotos]  = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr]        = useState('')

  async function search(e) {
    e?.preventDefault?.()
    if (!q.trim()) return
    setLoading(true); setErr(''); setPhotos([])
    try {
      const data = await apiFetch(`/api/ai/unsplash?q=${encodeURIComponent(q.trim())}`)
      setPhotos(Array.isArray(data) ? data : [])
    } catch (e2) {
      setErr(e2.message?.includes('503') ? 'Unsplash non configurato (UNSPLASH_ACCESS_KEY mancante)' : (e2.message || 'Errore Unsplash'))
    }
    setLoading(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px dashed #c8c8d8', background: '#fafafa', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={13} strokeWidth={1.5} /> {label}
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Cerca una foto su Unsplash</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={search} style={{ display: 'flex', gap: 8, padding: 16, borderBottom: '1px solid #f5f5f5' }}>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="es. ristorante, spiaggia, ufficio moderno…"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #e0e0e8', borderRadius: 8, fontSize: 13 }} />
              <button type="submit" disabled={loading}
                style={{ padding: '9px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {loading ? '…' : 'Cerca'}
              </button>
            </form>
            <div style={{ overflowY: 'auto', padding: 16 }}>
              {err && <p style={{ color: '#c00', fontSize: 13 }}>{err}</p>}
              {!err && !loading && photos.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Cerca un soggetto per vedere le foto.</p>}
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                  {photos.map(p => (
                    <button key={p.id} type="button" onClick={() => { onPick(p.url); setOpen(false) }}
                      title={p.alt || `Foto di ${p.author}`}
                      style={{ padding: 0, border: '2px solid #eee', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fff', aspectRatio: '4/3' }}>
                      <img src={p.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
              {photos.length > 0 && <p style={{ fontSize: 10, color: '#aaa', margin: '10px 0 0' }}>Foto da Unsplash — credito automatico.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
