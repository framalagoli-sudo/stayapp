'use client'
import { useContext, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { PropertyIdContext } from '@/context/PropertyIdContext'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { PRESET_OPTIONS, getPreset } from '@/lib/vetrinePresets'

// I **Prodotti** sono il catalogo del cliente: quello che offre, che sia una
// cosa o un servizio. È lo strato di base — sopra ci vanno le offerte (lo
// amplifichi per un periodo) e la vendita. Vedi `CATALOGO.md`.
//
// Nei dati si chiamano ancora «vetrine» ed «elementi di vetrina»: il nome è
// cambiato dove lo legge il cliente, le tabelle no. Rinominarle sarebbe una
// migration su dati vivi per un guadagno solo estetico.
//
// `livelloAzienda` = la pagina sta accanto a Shop e vale per tutte le entità,
// quindi l'entità la sceglie chi la usa invece di leggerla dall'indirizzo.
export default function VetrineListPage({ entityTipo, livelloAzienda = false }) {
  const router = useRouter()
  const { id: paramId } = useParams()
  const ctxId = useContext(PropertyIdContext)
  const { profile } = useAuth()
  const { strutture, ristoranti, attivita } = useAzienda()

  const entita = [
    ...(strutture || []).map(e => ({ id: e.id, tipo: 'struttura', etichetta: `Struttura: ${e.name}` })),
    ...(ristoranti || []).map(e => ({ id: e.id, tipo: 'ristorante', etichetta: `Ristorante: ${e.name}` })),
    ...(attivita || []).map(e => ({ id: e.id, tipo: 'attivita', etichetta: `Attività: ${e.name}` })),
  ]
  const [scelta, setScelta] = useState(null)
  // Con una sola entità non c'è niente da scegliere.
  useEffect(() => { if (livelloAzienda && !scelta && entita.length) setScelta(entita[0]) }, [livelloAzienda, entita.length])

  const tipo = livelloAzienda ? scelta?.tipo : entityTipo
  const entityId = livelloAzienda
    ? scelta?.id
    : (entityTipo === 'struttura' ? (ctxId || paramId || profile?.property_id) : paramId)

  const [vetrine, setVetrine] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPreset, setNewPreset] = useState(PRESET_OPTIONS[0]?.key || 'progetti_immobiliari')

  useEffect(() => { if (entityId && tipo) load() }, [entityId, tipo])

  async function load() {
    setLoading(true)
    const data = await apiFetch(`/api/vetrine?entity_tipo=${tipo}&entity_id=${entityId}`)
    setVetrine(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function createVetrina(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await apiFetch('/api/vetrine', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: tipo, entity_id: entityId, titolo: newTitle.trim(), preset: newPreset }),
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
    if (!confirm(`Elimina il catalogo "${v.titolo}" e tutto quello che contiene? L'operazione non è reversibile.`)) return
    await apiFetch(`/api/vetrine/${v.id}`, { method: 'DELETE' })
    load()
  }

  const card = { background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Prodotti e servizi</h1>
        <button onClick={() => setShowNew(true)}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
          + Nuovo catalogo
        </button>
      </div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#888' }}>
        Quello che offri, caricato una volta sola. Da qui lo metti in offerta o lo vendi.
      </p>

      {livelloAzienda && entita.length > 1 && (
        <select value={scelta?.id || ''} onChange={e => setScelta(entita.find(x => x.id === e.target.value) || null)}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', marginBottom: 20, maxWidth: '100%' }}>
          {entita.map(x => <option key={x.id} value={x.id}>{x.etichetta}</option>)}
        </select>
      )}

      {livelloAzienda && !entita.length && (
        <p style={{ color: '#888', fontSize: 14 }}>Nessuna attività su cui caricare i prodotti.</p>
      )}

      <div style={{ background: '#fff7ed', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
        <strong>Come funziona:</strong> raggruppi quello che offri in cataloghi (i viaggi, gli immobili, i corsi…).
        Ogni voce ha i suoi campi pubblici e quelli riservati, mostrati solo dopo una richiesta di contatto.
        Da ogni voce puoi poi <strong>creare un'offerta</strong> — quando l'offerta finisce, la voce resta qui.
      </div>

      {showNew && (
        <form onSubmit={createVetrina} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>Nome del catalogo</label>
            <input autoFocus required placeholder="Es. I nostri viaggi, Auto usate, Corsi" value={newTitle} onChange={e => setNewTitle(e.target.value)}
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
              {creating ? 'Creazione...' : 'Crea catalogo'}
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
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Nessun catalogo ancora</p>
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
