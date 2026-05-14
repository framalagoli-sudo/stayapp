import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { PropertyIdContext } from '../../context/PropertyIdContext'
import { useAuth } from '../../context/AuthContext'

export default function SitoPage({ entityTipo }) {
  const navigate   = useNavigate()
  const { id: paramId } = useParams()
  const ctxId      = useContext(PropertyIdContext)
  const { profile } = useAuth()

  const entityId = entityTipo === 'struttura'
    ? (ctxId || paramId || profile?.property_id)
    : paramId

  // Link all'editor della home (minisito)
  const homeEditPath = entityTipo === 'struttura'
    ? (ctxId ? `/admin/struttura/${ctxId}/minisito`
               : paramId ? `/admin/struttura/${paramId}/minisito`
               : '/admin/property/minisito')
    : entityTipo === 'ristorante'
    ? `/admin/ristoranti/${paramId}/minisito`
    : `/admin/attivita/${paramId}/minisito`

  const [pagine,   setPagine]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNew,  setShowNew]  = useState(false)

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
    if (res?.id) navigate(`/admin/pagine/${res.id}`)
    else { setNewTitle(''); setShowNew(false); load() }
  }

  async function toggleStatus(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'pubblicata' ? 'bozza' : 'pubblicata' }) })
    load()
  }

  async function toggleMenu(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: !p.nel_menu }) })
    load()
  }

  async function deletePage(p) {
    if (!confirm(`Elimina "${p.titolo}"?`)) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'DELETE' })
    load()
  }

  async function move(idx, dir) {
    const arr = [...pagine]
    const t = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
    setPagine(arr)
    await apiFetch('/api/pagine/reorder', { method: 'POST', body: JSON.stringify({ items: arr.map((p, i) => ({ id: p.id, ordine: i, parent_id: p.parent_id })) }) })
    load()
  }

  async function indent(p, realIdx) {
    const prev = pagine[realIdx - 1]
    if (!prev || prev.parent_id) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: prev.id }) })
    load()
  }

  async function outdent(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: null }) })
    load()
  }

  const topLevel  = pagine.filter(p => !p.parent_id)
  const subOf     = id => pagine.filter(p => p.parent_id === id)
  const menuItems = pagine.filter(p => !p.parent_id && p.nel_menu && p.status === 'pubblicata')
  const menuSubs  = id => pagine.filter(p => p.parent_id === id && p.nel_menu && p.status === 'pubblicata')

  const btnTiny = { background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10, lineHeight: 1.4 }

  function PageRow({ p, isChild = false }) {
    const realIdx = pagine.indexOf(p)
    const topIdx  = topLevel.indexOf(p)
    return (
      <div style={{ marginLeft: isChild ? 32 : 0, position: 'relative' }}>
        {isChild && (
          <div style={{ position: 'absolute', left: -20, top: 20, width: 14, height: 1, background: '#ddd' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: '#fff', borderRadius: 10, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>

          {/* Ordinamento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <button onClick={() => move(realIdx, -1)} style={btnTiny} title="Sposta su">▲</button>
            <button onClick={() => move(realIdx, 1)}  style={btnTiny} title="Sposta giù">▼</button>
          </div>

          {/* Indent / outdent */}
          {!isChild && topIdx > 0 && (
            <button onClick={() => indent(p, realIdx)} style={{ ...btnTiny, fontSize: 12 }} title="Rendi sottopagina di quella sopra">↳</button>
          )}
          {isChild && (
            <button onClick={() => outdent(p)} style={{ ...btnTiny, fontSize: 12 }} title="Riporta al primo livello">↱</button>
          )}

          {/* Titolo + slug */}
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.titolo}</div>
            <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 1 }}>/{p.slug}</div>
          </div>

          {/* Status */}
          <button onClick={() => toggleStatus(p)} style={{
            fontSize: 11, padding: '4px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
            background: p.status === 'pubblicata' ? '#d4edda' : '#fff3cd',
            color:      p.status === 'pubblicata' ? '#155724' : '#856404',
          }}>
            {p.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
          </button>

          {/* Nel menu */}
          <button onClick={() => toggleMenu(p)} style={{
            fontSize: 11, padding: '4px 11px', borderRadius: 20, border: '1px solid #e0e0e0', cursor: 'pointer', flexShrink: 0,
            background: p.nel_menu ? '#e8f4fb' : '#f5f5f5',
            color:      p.nel_menu ? '#0066aa' : '#aaa',
          }}>
            {p.nel_menu ? '☰ In menu' : '— Nascosta'}
          </button>

          {/* Azioni */}
          <button onClick={() => navigate(`/admin/pagine/${p.id}`)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            Modifica
          </button>
          <button onClick={() => deletePage(p)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#fce8e8', color: '#c00', cursor: 'pointer', flexShrink: 0 }}>
            ✕
          </button>
        </div>
        {subOf(p.id).map(child => <PageRow key={child.id} p={child} isChild />)}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Sito pubblico</h1>
        <button onClick={() => setShowNew(true)}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14 }}>
          + Nuova pagina
        </button>
      </div>

      {/* Anteprima menu */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Anteprima menu navigazione
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', background: 'rgba(18,18,32,0.06)', borderRadius: 8, padding: '10px 14px' }}>
          {/* Home sempre presente */}
          <span style={{ padding: '5px 14px', borderRadius: 20, background: '#1a1a2e', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            Home
          </span>
          {menuItems.map(p => {
            const subs = menuSubs(p.id)
            return (
              <span key={p.id} style={{ padding: '5px 14px', borderRadius: 20, background: '#e8f0fe', color: '#1a1a2e', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                {p.titolo}
                {subs.length > 0 && <span style={{ opacity: 0.5, fontSize: 10 }}>▾</span>}
              </span>
            )
          })}
          {menuItems.length === 0 && (
            <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Nessuna pagina aggiuntiva nel menu ancora</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
          Vengono mostrate solo le pagine <strong>Pubblicate</strong> con <strong>In menu</strong> attivo.
          {menuItems.some(p => menuSubs(p.id).length > 0) && ' Le voci con ▾ aprono un dropdown.'}
        </div>
      </div>

      {/* Card Home */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          🏠
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Home</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Pagina principale — sezioni, foto, blocchi di contenuto</div>
        </div>
        <span style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: '#d4edda', color: '#155724', fontWeight: 600, flexShrink: 0 }}>✓ Pubblicata</span>
        <span style={{ fontSize: 11, padding: '4px 11px', borderRadius: 20, background: '#e8f4fb', color: '#0066aa', border: '1px solid #e0e0e0', flexShrink: 0 }}>☰ In menu</span>
        <button onClick={() => navigate(homeEditPath)}
          style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer', fontWeight: 600, color: '#1a1a2e', flexShrink: 0 }}>
          Modifica home →
        </button>
      </div>

      {/* Divisore pagine aggiuntive */}
      <div style={{ margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ height: 1, flex: 1, background: '#e8e8e8' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase' }}>Pagine aggiuntive</span>
        <div style={{ height: 1, flex: 1, background: '#e8e8e8' }} />
      </div>

      {/* Form nuova pagina */}
      {showNew && (
        <form onSubmit={createPage} style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: 8 }}>
          <input autoFocus required placeholder="Titolo pagina (es. Chi siamo, Servizi…)" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
          <button type="submit" disabled={creating}
            style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>
            {creating ? '...' : 'Crea'}
          </button>
          <button type="button" onClick={() => { setShowNew(false); setNewTitle('') }}
            style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 14 }}>
            Annulla
          </button>
        </form>
      )}

      {/* Lista pagine */}
      {loading ? (
        <p style={{ color: '#888', padding: '12px 0' }}>Caricamento...</p>
      ) : pagine.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '36px 24px', textAlign: 'center', color: '#888', border: '1px dashed #ddd' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 15 }}>Nessuna pagina aggiuntiva</p>
          <p style={{ margin: '0 0 16px', fontSize: 13 }}>Aggiungi una pagina "Chi siamo", "Servizi", "Contatti" e molto altro.</p>
          <button onClick={() => setShowNew(true)}
            style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
            + Crea la prima pagina
          </button>
        </div>
      ) : (
        <div>
          {topLevel.map(p => <PageRow key={p.id} p={p} />)}
        </div>
      )}

      {/* Nota sul funzionamento */}
      {pagine.length > 0 && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#f9f9fb', borderRadius: 10, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
          <strong style={{ color: '#555' }}>Suggerimenti:</strong>{' '}
          Usa <strong>↳</strong> per creare sottopagine (appaiono come dropdown nel menu).
          Le pagine <strong>Fuori menu</strong> sono comunque accessibili via URL diretto — utili per landing page di campagne.
          Le pagine in <strong>Bozza</strong> non sono visibili ai visitatori.
        </div>
      )}
    </div>
  )
}
