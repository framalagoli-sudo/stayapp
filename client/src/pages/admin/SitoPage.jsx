import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { PropertyIdContext } from '../../context/PropertyIdContext'
import { useAuth } from '../../context/AuthContext'

export default function SitoPage({ entityTipo }) {
  const navigate    = useNavigate()
  const { id: paramId } = useParams()
  const ctxId       = useContext(PropertyIdContext)
  const { profile } = useAuth()

  const entityId = entityTipo === 'struttura'
    ? (ctxId || paramId || profile?.property_id)
    : paramId

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

  async function addToMenu(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: true }) })
    load()
  }

  async function removeFromMenu(p) {
    // Se ha figli nel menu, li porta al primo livello prima di rimuovere
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ nel_menu: false }) })
    load()
  }

  async function deletePage(p) {
    if (!confirm(`Elimina "${p.titolo}"?`)) return
    await apiFetch(`/api/pagine/${p.id}`, { method: 'DELETE' })
    load()
  }

  async function move(p, dir) {
    const topLevel = pagine.filter(x => !x.parent_id)
    const arr = [...pagine]
    const idx = arr.indexOf(p)
    const t   = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
    setPagine(arr)
    await apiFetch('/api/pagine/reorder', {
      method: 'POST',
      body: JSON.stringify({ items: arr.map((x, i) => ({ id: x.id, ordine: i, parent_id: x.parent_id })) }),
    })
    load()
  }

  async function makeChild(p) {
    // Rendi sottopagina della voce sopra
    const topMenu = pagine.filter(x => x.nel_menu && !x.parent_id)
    const idx = topMenu.indexOf(p)
    if (idx <= 0) return
    const parent = topMenu[idx - 1]
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: parent.id }) })
    load()
  }

  async function makeTopLevel(p) {
    await apiFetch(`/api/pagine/${p.id}`, { method: 'PATCH', body: JSON.stringify({ parent_id: null }) })
    load()
  }

  // Derive lists
  const menuTop    = pagine.filter(p => p.nel_menu && !p.parent_id).sort((a, b) => a.ordine - b.ordine)
  const menuSubs   = id => pagine.filter(p => p.nel_menu && p.parent_id === id).sort((a, b) => a.ordine - b.ordine)
  const notInMenu  = pagine.filter(p => !p.nel_menu)

  // ── Stili condivisi ─────────────────────────────────────────────────────────
  const cardStyle = {
    background: '#fff', borderRadius: 10, border: '1px solid #eeeeee',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }
  const btnTiny = {
    background: '#f0f0f0', border: 'none', borderRadius: 6,
    padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#444',
  }
  const btnAction = (variant = 'default') => ({
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12,
    padding: '5px 12px', fontWeight: 500,
    ...(variant === 'primary'  ? { background: '#1a1a2e', color: '#fff' } :
        variant === 'danger'   ? { background: '#fce8e8', color: '#c00' } :
        variant === 'add'      ? { background: '#e8f4fb', color: '#0066aa', border: '1px solid #c8e4f4' } :
        variant === 'remove'   ? { background: '#fff3f3', color: '#c00', border: '1px solid #f4c8c8' } :
                                 { background: '#f4f4f6', color: '#444', border: '1px solid #e4e4e8' }),
  })

  // ── Row nel menu ─────────────────────────────────────────────────────────────
  function MenuRow({ p, isChild = false }) {
    const topIdx = menuTop.indexOf(p)
    const canIndent = !isChild && topIdx > 0 && menuSubs(menuTop[topIdx - 1]?.id).length === 0

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', borderRadius: 8, marginBottom: 4, border: '1px solid #eeeeee', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginLeft: isChild ? 28 : 0, position: 'relative' }}>
        {isChild && <div style={{ position: 'absolute', left: -20, top: '50%', width: 14, height: 1, background: '#ddd' }} />}

        {/* Drag handle (visivo) */}
        <span style={{ color: '#ccc', fontSize: 14, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>

        {/* Ordine */}
        {!isChild && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
            <button onClick={() => move(p, -1)} style={btnTiny} title="Sposta su">▲</button>
            <button onClick={() => move(p, 1)}  style={btnTiny} title="Sposta giù">▼</button>
          </div>
        )}

        {/* Titolo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.titolo}</span>
          {p.status === 'bozza' && (
            <span style={{ marginLeft: 8, fontSize: 10, background: '#fff3cd', color: '#856404', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>BOZZA</span>
          )}
          <span style={{ marginLeft: 6, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/{p.slug}</span>
        </div>

        {/* Controlli annidamento */}
        {canIndent && (
          <button onClick={() => makeChild(p)} style={btnAction()} title="Rendi sottopagina di quella sopra">
            Rendi sottopagina ↳
          </button>
        )}
        {isChild && (
          <button onClick={() => makeTopLevel(p)} style={btnAction()} title="Riporta al primo livello">
            ↱ Al primo livello
          </button>
        )}

        {/* Rimuovi dal menu */}
        <button onClick={() => removeFromMenu(p)} style={btnAction('remove')} title="Rimuovi dal menu">
          ✕ Rimuovi
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 780 }}>

      {/* ── SEZIONE 1: MENU DI NAVIGAZIONE ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>Menu di navigazione</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            Queste voci appaiono nella barra in cima al sito. Solo le pagine <strong>Pubblicate</strong> sono visibili ai visitatori.
          </p>
        </div>

        {/* Home — fisso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', ...cardStyle, marginBottom: 4, background: '#fafafa' }}>
          <span style={{ color: '#ddd', fontSize: 14, userSelect: 'none' }}>⠿</span>
          <span style={{ fontSize: 18 }}>🏠</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Home</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/</span>
          </div>
          <span style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>sempre presente</span>
          <button onClick={() => navigate(homeEditPath)} style={btnAction()}>
            Modifica →
          </button>
        </div>

        {/* Pagine nel menu */}
        {loading ? null : menuTop.length === 0 ? null : (
          <div>
            {menuTop.map(p => (
              <div key={p.id}>
                <MenuRow p={p} />
                {menuSubs(p.id).map(child => (
                  <MenuRow key={child.id} p={child} isChild />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Pagine fuori dal menu */}
        {notInMenu.length > 0 && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: '#f9f9fb', borderRadius: 10, border: '1px dashed #ddd' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10 }}>
              Pagine non nel menu — clicca per aggiungerle
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {notInMenu.map(p => (
                <button key={p.id} onClick={() => addToMenu(p)} style={{ ...btnAction('add'), display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>+</span>
                  <span style={{ fontWeight: 600 }}>{p.titolo}</span>
                  {p.status === 'bozza' && <span style={{ fontSize: 10, opacity: 0.6 }}>(bozza)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && pagine.length === 0 && (
          <div style={{ padding: '20px 16px', background: '#f9f9fb', borderRadius: 10, border: '1px dashed #ddd', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
            Crea le tue prime pagine nella sezione qui sotto, poi aggiungile al menu.
          </div>
        )}
      </div>

      {/* ── SEZIONE 2: TUTTE LE PAGINE ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>Tutte le pagine</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
              Crea e modifica il contenuto. Pubblica le pagine per renderle visibili.
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
            + Nuova pagina
          </button>
        </div>

        {/* Form nuova pagina */}
        {showNew && (
          <form onSubmit={createPage} style={{ ...cardStyle, padding: 14, marginBottom: 10, display: 'flex', gap: 8 }}>
            <input autoFocus required placeholder="Titolo (es. Chi siamo, Servizi…)" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
            <button type="submit" disabled={creating} style={btnAction('primary')}>
              {creating ? '...' : 'Crea'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewTitle('') }} style={btnAction()}>
              Annulla
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: '#888' }}>Caricamento...</p>
        ) : pagine.length === 0 ? (
          <div style={{ ...cardStyle, padding: '40px 24px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#888', fontSize: 15 }}>Nessuna pagina ancora</p>
            <p style={{ margin: '0 0 16px', fontSize: 13 }}>
              Aggiungi pagine come "Chi siamo", "Servizi", "Contatti" e personalizzale con blocchi di contenuto.
            </p>
            <button onClick={() => setShowNew(true)} style={btnAction('primary')}>
              + Crea la prima pagina
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pagine.map(p => (
              <div key={p.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', flexWrap: 'wrap' }}>

                {/* Titolo */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                    {p.parent_id ? '└─ ' : ''}{p.titolo}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>/{p.slug}</span>
                </div>

                {/* Status toggle */}
                <button onClick={() => toggleStatus(p)} style={{
                  ...btnAction(), flexShrink: 0,
                  background: p.status === 'pubblicata' ? '#d4edda' : '#fff3cd',
                  color:      p.status === 'pubblicata' ? '#155724' : '#856404',
                  fontWeight: 600, border: 'none',
                }}>
                  {p.status === 'pubblicata' ? '✓ Pubblicata' : '○ Bozza'}
                </button>

                {/* Nel menu indicator */}
                <span style={{ fontSize: 11, color: p.nel_menu ? '#0066aa' : '#bbb', flexShrink: 0 }}>
                  {p.nel_menu ? '☰ In menu' : '— Fuori menu'}
                </span>

                {/* Edit */}
                <button onClick={() => navigate(`/admin/pagine/${p.id}`)} style={btnAction('primary')}>
                  Modifica
                </button>

                {/* Delete */}
                <button onClick={() => deletePage(p)} style={btnAction('danger')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
