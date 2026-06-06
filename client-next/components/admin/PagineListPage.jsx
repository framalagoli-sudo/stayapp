'use client'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { PropertyIdContext } from '@/context/PropertyIdContext'
import { useAuth } from '@/context/AuthContext'

export default function PagineListPage({ entityTipo }) {
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const ctxId = useContext(PropertyIdContext)
  const { profile } = useAuth()
  // struttura: try URL context → URL param → profile.property_id (legacy path)
  const entityId = entityTipo === 'struttura'
    ? (ctxId || paramId || profile?.property_id)
    : paramId

  const [pagine, setPagine]   = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew]   = useState(false)

  useEffect(() => { if (entityId) load() }, [entityId])

  async function load() {
    setLoading(true)
    const data = await apiFetch(`/api/pagine?entity_tipo=${entityTipo}&entity_id=${entityId}`)
    setPagine(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function createPage(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await apiFetch('/api/pagine', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, titolo: newTitle.trim() }),
    })
    setCreating(false)
    if (res?.id) { navigate(`/admin/pagine/${res.id}`) }
    else { setNewTitle(''); setShowNew(false); load() }
  }

  async function toggleStatus(p) {
    const next = p.status === 'pubblicata' ? 'bozza' : 'pubblicata'
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
    load()
  }

  async function toggleMenu(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: !p.nel_menu }) })
    load()
  }

  async function deletePage(p) {
    if (!confirm(`Elimina "${p.titolo}"? L'operazione non è reversibile.`)) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'DELETE' })
    load()
  }

  async function move(idx, dir) {
    const arr = [...pagine]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    const items = arr.map((p, i) => ({ id: p.id, ordine: i, parent_id: p.parent_id }))
    setPagine(arr)
    await apiFetch('/api/pagine/reorder', { method: 'POST', body: JSON.stringify({ items }) })
    load()
  }

  async function indent(p, idx) {
    const prev = pagine[idx - 1]
    if (!prev || prev.parent_id) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: prev.id }) })
    load()
  }

  async function outdent(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: null }) })
    load()
  }

  const topLevel = pagine.filter(p => !p.parent_id)
  const children = (parentId) => pagine.filter(p => p.parent_id === parentId)

  function PageRow({ p, idx, isChild = false }) {
    const realIdx = pagine.indexOf(p)
    return (
      <div style={{ marginLeft: isChild ? 24 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff', borderRadius: 10, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          {/* Ordinamento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => move(realIdx, -1)} style={btnTiny} title="Su">▲</button>
            <button onClick={() => move(realIdx, 1)} style={btnTiny} title="Giù">▼</button>
          </div>

          {/* Indent/outdent */}
          {!isChild && idx > 0 && (
            <button onClick={() => indent(p, realIdx)} style={btnTiny} title="Rendi sottopagina di quella sopra">↳</button>
          )}
          {isChild && (
            <button onClick={() => outdent(p)} style={btnTiny} title="Sposta a primo livello">↱</button>
          )}

          {/* Titolo */}
          <span style={{ flex: 1, fontWeight: 600, fontSize: 14, minWidth: 120 }}>{p.titolo}</span>
          <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>/{p.slug}</span>

          {/* Status */}
          <button onClick={() => toggleStatus(p)}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: p.status === 'pubblicata' ? '#d4edda' : '#fff3cd', color: p.status === 'pubblicata' ? '#155724' : '#856404', fontWeight: 600 }}>
            {p.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
          </button>

          {/* Nel menu */}
          <button onClick={() => toggleMenu(p)}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer', background: p.nel_menu ? '#e8f4f8' : '#f5f5f5', color: p.nel_menu ? '#0066aa' : '#888' }}>
            {p.nel_menu ? '☰ In menu' : '— Fuori menu'}
          </button>

          {/* Azioni */}
          <button onClick={() => navigate(`/admin/pagine/${p.id}`)}
            style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#fff', cursor: 'pointer' }}>
            Modifica
          </button>
          <button onClick={() => deletePage(p)}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#fce8e8', color: '#c00', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        {children(p.id).map((child, ci) => (
          <PageRow key={child.id} p={child} idx={ci} isChild />
        ))}
      </div>
    )
  }

  const btnTiny = { background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '2px 5px', cursor: 'pointer', fontSize: 10, lineHeight: 1.2 }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Pagine del sito</h1>
        <button onClick={() => setShowNew(true)}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14 }}>
          + Nuova pagina
        </button>
      </div>

      <div style={{ background: '#fff7ed', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
        <strong>Come funziona:</strong> crea pagine aggiuntive per il tuo sito. Puoi scegliere se mostrarle nel menu di navigazione, tenerle come bozza, o usarle come landing page indipendenti (senza inserirle nel menu).
        Usa <strong>↳</strong> per creare sottopagine con dropdown nel menu. Ogni pagina ha i suoi blocchi indipendenti.
      </div>

      {showNew && (
        <form onSubmit={createPage} style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: 10 }}>
          <input
            autoFocus required
            placeholder="Titolo pagina (es. Chi siamo)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
          />
          <button type="submit" disabled={creating}
            style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>
            {creating ? 'Creazione...' : 'Crea'}
          </button>
          <button type="button" onClick={() => { setShowNew(false); setNewTitle('') }}
            style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 14 }}>
            Annulla
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento...</p>
      ) : pagine.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Nessuna pagina ancora</p>
          <p style={{ margin: 0, fontSize: 13 }}>Crea la tua prima pagina con il pulsante in alto.</p>
        </div>
      ) : (
        <div>
          {topLevel.map((p, i) => <PageRow key={p.id} p={p} idx={i} />)}
        </div>
      )}
    </div>
  )
}
