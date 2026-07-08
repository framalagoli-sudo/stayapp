'use client'
import { useContext, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { PropertyIdContext } from '@/context/PropertyIdContext'
import { useAuth } from '@/context/AuthContext'
import { PRESET_OPTIONS, getPreset } from '@/lib/vetrinePresets'

export default function VetrineListPage({ entityTipo }) {
  const router = useRouter()
  const { id: paramId } = useParams()
  const ctxId = useContext(PropertyIdContext)
  const { profile } = useAuth()
  const entityId = entityTipo === 'struttura' ? (ctxId || paramId || profile?.property_id) : paramId

  const [vetrine, setVetrine] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPreset, setNewPreset] = useState(PRESET_OPTIONS[0]?.key || 'progetti_immobiliari')

  useEffect(() => { if (entityId) load() }, [entityId])

  async function load() {
    setLoading(true)
    const data = await apiFetch(`/api/vetrine?entity_tipo=${entityTipo}&entity_id=${entityId}`)
    setVetrine(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function createVetrina(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await apiFetch('/api/vetrine', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, titolo: newTitle.trim(), preset: newPreset }),
    })
    setCreating(false)
    if (res?.id) router.push(`/admin/vetrine/${res.id}`)
    else { setNewTitle(''); setShowNew(false); load() }
  }

  async function toggleStatus(v) {
    const next = v.status === 'pubblicata' ? 'bozza' : 'pubblicata'
    await apiFetch(`/api/vetrine/${v.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
    load()
  }

  async function deleteVetrina(v) {
    if (!confirm(`Elimina la vetrina "${v.titolo}" e tutti i suoi elementi? L'operazione non è reversibile.`)) return
    await apiFetch(`/api/vetrine/${v.id}`, { method: 'DELETE' })
    load()
  }

  const card = { background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Vetrine</h1>
        <button onClick={() => setShowNew(true)}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14 }}>
          + Nuova vetrina
        </button>
      </div>

      <div style={{ background: '#fff7ed', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
        <strong>Cos'è una vetrina:</strong> una collezione di elementi (progetti, immobili, veicoli…) che presenti sul sito. Scegli un modello di partenza in fase di creazione; ogni elemento ha campi pubblici e campi riservati mostrati solo dopo la richiesta di contatto.
      </div>

      {showNew && (
        <form onSubmit={createVetrina} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Titolo vetrina</label>
            <input autoFocus required placeholder="Es. I nostri progetti" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Modello</label>
            <select value={newPreset} onChange={e => setNewPreset(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff' }}>
              {PRESET_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>{getPreset(newPreset).descrizione}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating}
              style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>
              {creating ? 'Creazione...' : 'Crea vetrina'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewTitle('') }}
              style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 14 }}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento...</p>
      ) : vetrine.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪟</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Nessuna vetrina ancora</p>
          <p style={{ margin: 0, fontSize: 13 }}>Crea la prima con il pulsante in alto.</p>
        </div>
      ) : (
        vetrine.map(v => (
          <div key={v.id} style={card}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 15, minWidth: 140 }}>{v.titolo}</span>
            <span style={{ fontSize: 11, color: '#888', background: '#f0f0f4', padding: '2px 8px', borderRadius: 6 }}>{getPreset(v.preset).label}</span>
            <button onClick={() => toggleStatus(v)}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: v.status === 'pubblicata' ? '#d4edda' : '#fff3cd', color: v.status === 'pubblicata' ? '#155724' : '#856404', fontWeight: 600 }}>
              {v.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
            </button>
            <button onClick={() => router.push(`/admin/vetrine/${v.id}`)}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#fff', cursor: 'pointer' }}>
              Gestisci
            </button>
            <button onClick={() => deleteVetrina(v)}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#fce8e8', color: '#c00', cursor: 'pointer' }}>✕</button>
          </div>
        ))
      )}
    </div>
  )
}
