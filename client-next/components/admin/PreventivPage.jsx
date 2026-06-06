'use client'
import { useState, useEffect } from 'react'
import { useNavigate } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { FileText, Plus, Trash2, Copy, ChevronRight, AlertCircle } from 'lucide-react'

const STATI = [
  { key: '',           label: 'Tutti' },
  { key: 'bozza',     label: 'Bozza' },
  { key: 'inviato',   label: 'Inviato' },
  { key: 'accettato', label: 'Accettato' },
  { key: 'rifiutato', label: 'Rifiutato' },
  { key: 'scaduto',   label: 'Scaduto' },
]

const STATO_COLOR = {
  bozza:     { bg: '#f5f5f5', color: '#666' },
  inviato:   { bg: '#ebf8ff', color: '#2b6cb0' },
  accettato: { bg: '#f0fff4', color: '#276749' },
  rifiutato: { bg: '#fff5f5', color: '#c53030' },
  scaduto:   { bg: '#fffbeb', color: '#b45309' },
}

function statoBadge(stato) {
  const s = STATO_COLOR[stato] || { bg: '#f5f5f5', color: '#666' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
      {stato}
    </span>
  )
}

function calcolaTotale(voci = [], iva_pct = 0) {
  const imponibile = voci.reduce((acc, v) => {
    const sub = (v.qty || 1) * (v.prezzo_unitario || 0) * (1 - (v.sconto_pct || 0) / 100)
    return acc + sub
  }, 0)
  const iva = imponibile * (iva_pct / 100)
  return imponibile + iva
}

export default function PreventivPage() {
  const navigate = useNavigate()
  const [preventivi, setPreventivi] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function load(stato = filtroStato) {
    setLoading(true)
    try {
      const qs = stato ? `?stato=${stato}` : ''
      const data = await apiFetch(`/api/preventivi${qs}`)
      setPreventivi(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filtroStato])

  async function handleNew() {
    setCreating(true)
    try {
      const p = await apiFetch('/api/preventivi', { method: 'POST', body: JSON.stringify({ titolo: 'Nuovo preventivo' }) })
      navigate(`/admin/preventivi/${p.id}`)
    } catch (e) { setError(e.message); setCreating(false) }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo preventivo?')) return
    try {
      await apiFetch(`/api/preventivi/${id}`, { method: 'DELETE' })
      setPreventivi(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  const filtered = filtroStato ? preventivi.filter(p => p.stato === filtroStato) : preventivi

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Preventivi</h1>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} strokeWidth={1.5} /> Nuovo preventivo
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {/* Filtri stato */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATI.map(s => (
          <button
            key={s.key}
            onClick={() => setFiltroStato(s.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filtroStato === s.key ? '#1a1a2e' : '#ddd',
              background: filtroStato === s.key ? '#1a1a2e' : '#fff',
              color: filtroStato === s.key ? '#fff' : '#444',
              fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}
          >{s.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
          <FileText size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p>Nessun preventivo trovato</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const totale = calcolaTotale(p.voci, p.iva_pct)
            const scaduto = p.scadenza && new Date(p.scadenza) < new Date() && p.stato !== 'accettato'
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/admin/preventivi/${p.id}`)}
                style={{
                  background: '#fff', borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                  border: '1px solid #eee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <FileText size={20} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{p.numero}</span>
                    {statoBadge(p.stato)}
                    {scaduto && <span style={{ fontSize: 11, color: '#b45309' }}>⚠ Scaduto</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                    {p.titolo || '—'}
                    {p.contatti?.nome && <span style={{ color: '#888', marginLeft: 8 }}>· {p.contatti.nome}</span>}
                  </div>
                  {p.scadenza && (
                    <div style={{ fontSize: 12, color: scaduto ? '#b45309' : '#888', marginTop: 2 }}>
                      Scade: {new Date(p.scadenza).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {totale.toLocaleString('it-IT', { style: 'currency', currency: p.valuta || 'EUR' })}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>
                    {new Date(p.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} color="#ccc" />
                <button
                  onClick={(e) => handleDelete(p.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ccc' }}
                  title="Elimina"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
