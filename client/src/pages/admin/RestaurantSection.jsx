import { useState } from 'react'
import { uploadMedia } from '../../lib/api'

const BLANK_ITEM = { name: '', description: '', price: '', photo: '' }

export default function RestaurantSection({ restaurant = { active: false, categories: [] }, onChange }) {
  const categories = restaurant.categories || []

  const [editingCat, setEditingCat] = useState(null) // null | 'new'
  const [catName, setCatName] = useState('')
  const [editingItem, setEditingItem] = useState(null) // null | { catIdx, itemIdx | 'new' }
  const [itemForm, setItemForm] = useState(BLANK_ITEM)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  function update(patch) { onChange({ ...restaurant, ...patch }) }

  // ── Categories ──────────────────────────────────────────────────────────────
  function addCategory() {
    if (!catName.trim()) return
    update({ categories: [...categories, { id: crypto.randomUUID(), name: catName.trim(), items: [] }] })
    setCatName('')
    setEditingCat(null)
  }

  function removeCategory(ci) {
    update({ categories: categories.filter((_, i) => i !== ci) })
  }

  // ── Items ────────────────────────────────────────────────────────────────────
  function openItem(catIdx, itemIdx) {
    setItemForm(itemIdx === 'new' ? BLANK_ITEM : { ...categories[catIdx].items[itemIdx] })
    setEditingItem({ catIdx, itemIdx })
  }

  function saveItem() {
    if (!itemForm.name.trim()) return
    const { catIdx, itemIdx } = editingItem
    const cats = categories.map((cat, ci) => {
      if (ci !== catIdx) return cat
      const items = itemIdx === 'new'
        ? [...cat.items, { ...itemForm, id: crypto.randomUUID() }]
        : cat.items.map((it, ii) => ii === itemIdx ? { ...it, ...itemForm } : it)
      return { ...cat, items }
    })
    update({ categories: cats })
    setEditingItem(null)
  }

  function removeItem(catIdx, itemIdx) {
    const cats = categories.map((cat, ci) =>
      ci !== catIdx ? cat : { ...cat, items: cat.items.filter((_, ii) => ii !== itemIdx) }
    )
    update({ categories: cats })
  }

  async function uploadItemPhoto(file) {
    if (!file || file.size > 2 * 1024 * 1024) { alert('Max 2 MB'); return }
    setUploadingPhoto(true)
    try {
      const { url } = await uploadMedia('/api/upload/gallery', file)
      setItemForm(f => ({ ...f, photo: url }))
    } catch (e) { alert(e.message) }
    finally { setUploadingPhoto(false) }
  }

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Modulo ristorante / menù</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Mostra un tab "Ristorante" nell'app ospite</div>
        </div>
        <button onClick={() => update({ active: !restaurant.active })} style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
          background: restaurant.active ? '#1a1a2e' : '#ddd',
          position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: restaurant.active ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', display: 'block',
          }} />
        </button>
      </div>

      {restaurant.active && (
        <div>
          {/* Category list */}
          {categories.map((cat, catIdx) => (
            <div key={cat.id} style={{ marginBottom: 16, background: '#fafafa', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee' }}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#222' }}>{cat.name}</span>
                <button onClick={() => removeCategory(catIdx)} style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Elimina categoria
                </button>
              </div>

              {/* Items */}
              <div style={{ padding: '10px 16px 14px' }}>
                {cat.items.map((item, itemIdx) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    {item.photo && <img src={item.photo} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{item.name}</div>
                      {item.price && <div style={{ fontSize: 12, color: '#666' }}>€ {item.price}</div>}
                    </div>
                    <button onClick={() => openItem(catIdx, itemIdx)} style={{ fontSize: 11, padding: '3px 8px', background: '#eee', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Modifica</button>
                    <button onClick={() => removeItem(catIdx, itemIdx)} style={{ fontSize: 13, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                  </div>
                ))}

                {/* Item form or add button */}
                {editingItem?.catIdx === catIdx ? (
                  <ItemForm
                    form={itemForm} setForm={setItemForm}
                    onSave={saveItem} onCancel={() => setEditingItem(null)}
                    onPhoto={uploadItemPhoto} uploadingPhoto={uploadingPhoto}
                  />
                ) : (
                  <button onClick={() => openItem(catIdx, 'new')} style={{ marginTop: 10, padding: '6px 14px', background: 'none', border: '1px dashed #ccc', borderRadius: 7, fontSize: 12, color: '#888', cursor: 'pointer' }}>
                    + Aggiungi piatto
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add category */}
          {editingCat === 'new' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={catName} onChange={e => setCatName(e.target.value)}
                placeholder="Nome categoria (es. Antipasti)"
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
              <button onClick={addCategory} style={saveBtn}>Aggiungi</button>
              <button onClick={() => setEditingCat(null)} style={cancelBtn}>✕</button>
            </div>
          ) : (
            <button onClick={() => setEditingCat('new')} style={{ padding: '10px 0', width: '100%', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#444' }}>
              + Aggiungi categoria
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ItemForm({ form, setForm, onSave, onCancel, onPhoto, uploadingPhoto }) {
  return (
    <div style={{ marginTop: 12, padding: 14, background: '#f0f0f0', borderRadius: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={lbl}>Nome *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="es. Bruschetta" style={inp} />
        </div>
        <div>
          <label style={lbl}>Prezzo (€)</label>
          <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="es. 8.50" type="number" step="0.5" min="0" style={inp} />
        </div>
      </div>

      <label style={lbl}>Descrizione</label>
      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="es. Con pomodori freschi e basilico" style={{ ...inp, marginBottom: 10 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {form.photo && <img src={form.photo} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
        <label style={{ fontSize: 12, padding: '5px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
          {uploadingPhoto ? 'Upload…' : form.photo ? 'Cambia foto' : '+ Foto (opzionale)'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhoto(e.target.files[0])} />
        </label>
        {form.photo && <button type="button" onClick={() => setForm(f => ({ ...f, photo: '' }))} style={{ fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>Rimuovi</button>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} style={saveBtn}>Salva piatto</button>
        <button onClick={onCancel} style={cancelBtn}>Annulla</button>
      </div>
    </div>
  )
}

const lbl       = { display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }
const inp       = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }
const saveBtn   = { padding: '8px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const cancelBtn = { padding: '8px 14px', background: '#e0e0e0', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
