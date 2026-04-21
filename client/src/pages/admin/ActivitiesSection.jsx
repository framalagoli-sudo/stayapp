import { useState } from 'react'
import { uploadMedia } from '../../lib/api'

const AGE_GROUPS = [
  { value: 'tutti',     label: 'Tutti' },
  { value: 'adulti',    label: 'Adulti' },
  { value: 'bambini',   label: 'Bambini' },
  { value: 'famiglie',  label: 'Famiglie' },
]

function newActivity() {
  return {
    id: crypto.randomUUID(),
    name: '', description: '', location: '', schedule: '',
    ageGroup: 'tutti', photo_url: null, bookable: false, active: true,
  }
}

function newCategory(name) {
  return { id: crypto.randomUUID(), category: name, items: [] }
}

// ─── Isolated category name input — local state, propagates only onBlur ───────
function CategoryNameInput({ value, onCommit }) {
  const [local, setLocal] = useState(value)
  return (
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      style={{ flex: 1, fontSize: 15, fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: '#1a1a2e' }}
      placeholder="Nome categoria"
    />
  )
}

// ─── Isolated item form — local state for text fields, propagates only onBlur ──
function ItemForm({ item, onPatch, onUploadPhoto, uploading }) {
  const [name,        setName]        = useState(item.name)
  const [location,    setLocation]    = useState(item.location)
  const [schedule,    setSchedule]    = useState(item.schedule)
  const [description, setDescription] = useState(item.description)

  function commit(field, val) { onPatch({ [field]: val }) }

  return (
    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <Field label="Nome *">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => commit('name', name)}
            style={inputStyle}
            placeholder="es. Torneo Padel"
          />
        </Field>
        <Field label="Luogo">
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            onBlur={() => commit('location', location)}
            style={inputStyle}
            placeholder="es. Campo A"
          />
        </Field>
        <Field label="Orario / Giorni">
          <input
            value={schedule}
            onChange={e => setSchedule(e.target.value)}
            onBlur={() => commit('schedule', schedule)}
            style={inputStyle}
            placeholder="es. Lun/Mer 10:00-12:00"
          />
        </Field>
        <Field label="Fascia età">
          {/* select: no typing issue, propagate immediately */}
          <select
            value={item.ageGroup}
            onChange={e => onPatch({ ageGroup: e.target.value })}
            style={inputStyle}
          >
            {AGE_GROUPS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descrizione">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => commit('description', description)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Breve descrizione dell'attività"
        />
      </Field>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <Toggle value={item.bookable} onChange={v => onPatch({ bookable: v })} />
          Prenotabile
        </label>
        <div>
          {item.photo_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <img src={item.photo_url} alt="" style={{ height: 48, width: 80, objectFit: 'cover', borderRadius: 6 }} />
              <button type="button" onClick={() => onPatch({ photo_url: null })}
                style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>
                Rimuovi
              </button>
            </div>
          )}
          <label style={{ ...uploadLabel, fontSize: 12, padding: '6px 12px' }}>
            {uploading ? 'Upload…' : item.photo_url ? 'Cambia foto' : '+ Foto'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => onUploadPhoto(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────
export default function ActivitiesSection({ activities = [], onChange }) {
  const [newCatName, setNewCatName] = useState('')
  const [openItem,   setOpenItem]   = useState(null) // 'catId:itemId'
  const [uploading,  setUploading]  = useState({})

  function update(cats) { onChange(cats) }

  function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    update([...activities, newCategory(name)])
    setNewCatName('')
  }

  function removeCategory(catId) {
    update(activities.filter(c => c.id !== catId))
  }

  function moveCategory(catId, dir) {
    const i = activities.findIndex(c => c.id === catId)
    if (i + dir < 0 || i + dir >= activities.length) return
    const next = [...activities]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    update(next)
  }

  function patchCategory(catId, patch) {
    update(activities.map(c => c.id === catId ? { ...c, ...patch } : c))
  }

  function addItem(catId) {
    const item = newActivity()
    update(activities.map(c =>
      c.id === catId ? { ...c, items: [...c.items, item] } : c
    ))
    setOpenItem(`${catId}:${item.id}`)
  }

  function removeItem(catId, itemId) {
    update(activities.map(c =>
      c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    ))
  }

  function patchItem(catId, itemId, patch) {
    update(activities.map(c =>
      c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
        : c
    ))
  }

  async function uploadPhoto(catId, itemId, file) {
    if (!file) return
    const key = `${catId}:${itemId}`
    setUploading(u => ({ ...u, [key]: true }))
    try {
      const { url } = await uploadMedia('/api/upload/gallery', file)
      patchItem(catId, itemId, { photo_url: url })
    } catch (e) { alert(`Errore upload: ${e.message}`) }
    finally { setUploading(u => ({ ...u, [key]: false })) }
  }

  return (
    <div>
      {activities.map((cat, ci) => (
        <div key={cat.id} style={{ marginBottom: 28, border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
          {/* Category header */}
          <div style={{ background: '#f8f8f8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CategoryNameInput
              value={cat.category}
              onCommit={name => patchCategory(cat.id, { category: name })}
            />
            <button type="button" onClick={() => moveCategory(cat.id, -1)} disabled={ci === 0} style={arrowBtn}>↑</button>
            <button type="button" onClick={() => moveCategory(cat.id, 1)} disabled={ci === activities.length - 1} style={arrowBtn}>↓</button>
            <button type="button" onClick={() => removeCategory(cat.id)} style={deleteBtnStyle}>Elimina</button>
          </div>

          {/* Items */}
          <div style={{ padding: '12px 16px' }}>
            {cat.items.map(item => {
              const key = `${cat.id}:${item.id}`
              const isOpen = openItem === key
              return (
                <div key={item.id} style={{ border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 8 }}>
                  {/* Item row */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
                    <span
                      style={{ flex: 1, fontSize: 14, color: item.name ? '#222' : '#aaa', cursor: 'pointer' }}
                      onClick={() => setOpenItem(isOpen ? null : key)}
                    >
                      {item.name || 'Nuova attività'}
                    </span>
                    <Toggle value={item.active} onChange={v => patchItem(cat.id, item.id, { active: v })} />
                    <button type="button" onClick={() => setOpenItem(isOpen ? null : key)}
                      style={{ ...arrowBtn, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</button>
                    <button type="button" onClick={() => removeItem(cat.id, item.id)} style={deleteBtnStyle}>✕</button>
                  </div>

                  {/* Item form — isolated component, no re-render on typing */}
                  {isOpen && (
                    <ItemForm
                      key={item.id}
                      item={item}
                      onPatch={patch => patchItem(cat.id, item.id, patch)}
                      onUploadPhoto={file => uploadPhoto(cat.id, item.id, file)}
                      uploading={!!uploading[key]}
                    />
                  )}
                </div>
              )
            })}

            <button type="button" onClick={() => addItem(cat.id)} style={addItemBtn}>
              + Aggiungi attività
            </button>
          </div>
        </div>
      ))}

      {/* Add category */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder="es. Piscina, Padel, Mini Club, Yoga, Escursioni, Animazione…"
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        />
        <button type="button" onClick={addCategory}
          style={{ padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          Aggiungi categoria
        </button>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', padding: 0,
        background: value ? '#1a1a2e' : '#ddd', position: 'relative', cursor: 'pointer', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
      }} />
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle     = { width: '100%', padding: '9px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#fff', marginBottom: 0 }
const arrowBtn       = { padding: '4px 8px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#555' }
const deleteBtnStyle = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }
const addItemBtn     = { marginTop: 8, padding: '8px 14px', background: 'none', border: '1.5px dashed #ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#666', width: '100%' }
const uploadLabel    = { padding: '8px 14px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: '1px solid #ddd', fontWeight: 600, color: '#333' }
