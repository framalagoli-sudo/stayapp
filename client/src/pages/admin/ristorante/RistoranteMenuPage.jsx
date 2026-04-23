import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRistorante } from '../../../hooks/useRistorante'
import { uploadMedia } from '../../../lib/api'

const BLANK_ITEM = { name: '', description: '', price: '', allergens: '', photo_url: '' }

export default function RistoranteMenuPage() {
  const { id } = useParams()
  const { ristorante, loading, saving, saved, save } = useRistorante(id)
  const [menu, setMenu] = useState([])

  useEffect(() => { if (ristorante) setMenu(ristorante.menu || []) }, [ristorante])

  function persist(newMenu) {
    setMenu(newMenu)
    save({ menu: newMenu }).catch(() => {})
  }

  function addCategory() {
    const name = prompt('Nome della categoria:')?.trim()
    if (!name) return
    persist([...menu, { id: crypto.randomUUID(), name, items: [] }])
  }

  function renameCategory(ci, name) {
    persist(menu.map((c, i) => i === ci ? { ...c, name } : c))
  }

  function removeCategory(ci) {
    if (!confirm('Eliminare questa categoria e tutti i suoi piatti?')) return
    persist(menu.filter((_, i) => i !== ci))
  }

  function addItem(ci) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: [...c.items, { ...BLANK_ITEM, id: crypto.randomUUID() }],
    }))
  }

  function updateItem(ci, ii, patch) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: c.items.map((it, j) => j !== ii ? it : { ...it, ...patch }),
    }))
  }

  function removeItem(ci, ii) {
    persist(menu.map((c, i) => i !== ci ? c : {
      ...c, items: c.items.filter((_, j) => j !== ii),
    }))
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!ristorante) return <p style={errorStyle}>Ristorante non trovato.</p>

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={titleStyle}>Menu</h2>
        {saved && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>✓ Salvato</span>}
        {saving && <span style={{ fontSize: 13, color: '#888' }}>Salvataggio…</span>}
      </div>
      <p style={descStyle}>Organizza il menu in categorie. Ogni modifica viene salvata automaticamente.</p>

      {menu.map((cat, ci) => (
        <div key={cat.id} style={cardStyle}>
          <CategoryHeader
            name={cat.name}
            onRename={name => renameCategory(ci, name)}
            onDelete={() => removeCategory(ci)}
          />

          <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
            {cat.items.map((item, ii) => (
              <ItemRow
                key={item.id}
                item={item}
                ristoranteId={id}
                onChange={patch => updateItem(ci, ii, patch)}
                onDelete={() => removeItem(ci, ii)}
              />
            ))}
          </div>

          <button
            onClick={() => addItem(ci)}
            style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
          >
            + Aggiungi piatto
          </button>
        </div>
      ))}

      <button
        onClick={addCategory}
        style={{ padding: '10px 24px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        + Nuova categoria
      </button>
    </div>
  )
}

function CategoryHeader({ name, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(name)

  function commit() {
    if (val.trim() && val !== name) onRename(val.trim())
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {editing ? (
        <input
          autoFocus value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ flex: 1, fontSize: 16, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: '2px solid #1a1a2e' }}
        />
      ) : (
        <h3
          onClick={() => setEditing(true)}
          style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 700, cursor: 'pointer', color: '#1a1a2e' }}
          title="Clicca per rinominare"
        >
          {name}
        </h3>
      )}
      <button onClick={onDelete} style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        Elimina categoria
      </button>
    </div>
  )
}

function ItemRow({ item, ristoranteId, onChange, onDelete }) {
  const [name, setName] = useState(item.name)
  const [desc, setDesc] = useState(item.description)
  const [price, setPrice] = useState(item.price)
  const [allergens, setAllergens] = useState(item.allergens)
  const [uploading, setUploading] = useState(false)

  async function handlePhoto(file) {
    if (!file || file.size > 2 * 1024 * 1024) { alert('Max 2 MB'); return }
    setUploading(true)
    try {
      const { url } = await uploadMedia(`/api/upload/restaurant-gallery?ristorante_id=${ristoranteId}`, file)
      onChange({ photo_url: url })
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  return (
    <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* Photo */}
      <label style={{ flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {item.photo_url
            ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : uploading ? '…' : '🍽'}
        </div>
        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handlePhoto(e.target.files[0])} />
      </label>

      {/* Fields */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px 12px' }}>
        <input
          value={name} onChange={e => setName(e.target.value)} onBlur={() => onChange({ name })}
          placeholder="Nome piatto *" style={inpStyle} />
        <input
          value={price} onChange={e => setPrice(e.target.value)} onBlur={() => onChange({ price })}
          placeholder="Prezzo €" style={inpStyle} type="number" min="0" step="0.5" />
        <input
          value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => onChange({ description: desc })}
          placeholder="Descrizione" style={{ ...inpStyle, gridColumn: '1 / -1' }} />
        <input
          value={allergens} onChange={e => setAllergens(e.target.value)} onBlur={() => onChange({ allergens })}
          placeholder="Allergeni" style={{ ...inpStyle, gridColumn: '1 / -1' }} />
      </div>

      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, lineHeight: 1, flexShrink: 0, padding: '0 4px' }} title="Elimina piatto">✕</button>
    </div>
  )
}

const inpStyle     = { padding: '8px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box', background: '#fff' }
const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
