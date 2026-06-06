'use client'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { ArrowLeft, Package, AlertCircle } from 'lucide-react'

const STATI = [
  { k: 'in_attesa',      label: 'In attesa',      color: '#b7791f', bg: '#fffbeb' },
  { k: 'pagato',         label: 'Pagato',          color: '#276749', bg: '#f0fff4' },
  { k: 'in_lavorazione', label: 'In lavorazione',  color: '#2b6cb0', bg: '#ebf8ff' },
  { k: 'spedito',        label: 'Spedito',         color: '#6b46c1', bg: '#faf5ff' },
  { k: 'consegnato',     label: 'Consegnato',      color: '#276749', bg: '#f0fff4' },
  { k: 'annullato',      label: 'Annullato',       color: '#c53030', bg: '#fff5f5' },
]

export default function OrdineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ordine, setOrdine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stato, setStato] = useState('')
  const [noteAdmin, setNoteAdmin] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')

  useEffect(() => {
    apiFetch(`/api/shop/ordini/${id}`)
      .then(o => {
        setOrdine(o); setStato(o.stato || 'in_attesa')
        setNoteAdmin(o.note_admin || ''); setTrackingUrl(o.tracking_url || '')
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  async function save() {
    setSaving(true); setError('')
    try {
      const updated = await apiFetch(`/api/shop/ordini/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stato, note_admin: noteAdmin, tracking_url: trackingUrl }),
      })
      setOrdine(updated)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>
  if (!ordine) return null

  const stInfo = STATI.find(s => s.k === ordine.stato) || STATI[0]

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/shop')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <Package size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>Ordine #{ordine.numero}</h1>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: stInfo.bg, color: stInfo.color }}>
          {stInfo.label}
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Cliente */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>Cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 14 }}>
            <div><span style={{ color: '#888', fontSize: 12 }}>Nome</span><br />{ordine.nome_cliente || '—'}</div>
            <div><span style={{ color: '#888', fontSize: 12 }}>Email</span><br />{ordine.email_cliente}</div>
            {ordine.telefono_cliente && <div><span style={{ color: '#888', fontSize: 12 }}>Telefono</span><br />{ordine.telefono_cliente}</div>}
          </div>
          {ordine.indirizzo?.via && (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              <span style={{ color: '#888', fontSize: 12 }}>Indirizzo</span><br />
              {ordine.indirizzo.via}, {ordine.indirizzo.cap} {ordine.indirizzo.citta} ({ordine.indirizzo.provincia})
            </div>
          )}
          {ordine.note_cliente && (
            <div style={{ marginTop: 10, background: '#f9f9fb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#555' }}>
              Note: {ordine.note_cliente}
            </div>
          )}
        </div>

        {/* Voci ordine */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>Prodotti</div>
          {(ordine.voci || []).map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              {v.immagine && <img src={v.immagine} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{v.nome}</div>
                <div style={{ fontSize: 12, color: '#888' }}>€{Number(v.prezzo).toFixed(2)} × {v.qty}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>€{(v.prezzo * v.qty).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 16, fontWeight: 700 }}>
            Totale: €{Number(ordine.totale).toFixed(2)}
          </div>
        </div>

        {/* Gestione admin */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>Gestione ordine</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stato</label>
              <select value={stato} onChange={e => setStato(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}>
                {STATI.map(s => <option key={s.k} value={s.k}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>URL tracking spedizione</label>
              <input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)}
                placeholder="https://track.sda.it/…"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Note interne</label>
            <textarea value={noteAdmin} onChange={e => setNoteAdmin(e.target.value)} rows={2}
              placeholder="Note visibili solo all'admin…"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={save} disabled={saving}
              style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {saving ? 'Salvataggio…' : 'Aggiorna ordine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
