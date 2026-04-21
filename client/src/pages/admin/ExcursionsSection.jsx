import { useState } from 'react'
import { uploadMedia } from '../../lib/api'

function newExcursion() {
  return {
    id: crypto.randomUUID(),
    name: '', description: '', price: '', duration: '',
    meeting_point: '', seats: '', dates: '', includes: '',
    photo_url: null, active: true,
  }
}

// ─── Isolated form — local state for text fields, propagates only onBlur ───────
function ExcursionForm({ exc, onPatch, onUploadPhoto, uploading }) {
  const [name,          setName]         = useState(exc.name)
  const [description,   setDescription]  = useState(exc.description)
  const [price,         setPrice]        = useState(exc.price ?? '')
  const [duration,      setDuration]     = useState(exc.duration)
  const [meetingPoint,  setMeetingPoint] = useState(exc.meeting_point)
  const [seats,         setSeats]        = useState(exc.seats ?? '')
  const [dates,         setDates]        = useState(exc.dates)
  const [includes,      setIncludes]     = useState(exc.includes)

  const commit = (field, val) => onPatch({ [field]: val })

  return (
    <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <Field label="Nome *">
          <input value={name} onChange={e => setName(e.target.value)} onBlur={() => commit('name', name)}
            style={inputStyle} placeholder="es. Gita a Siracusa" />
        </Field>
        <Field label="Prezzo (€)">
          <input type="number" min="0" value={price}
            onChange={e => setPrice(e.target.value)}
            onBlur={() => commit('price', price === '' ? null : Number(price))}
            style={inputStyle} placeholder="es. 25" />
        </Field>
        <Field label="Durata">
          <input value={duration} onChange={e => setDuration(e.target.value)} onBlur={() => commit('duration', duration)}
            style={inputStyle} placeholder="es. Giornata intera" />
        </Field>
        <Field label="Posti disponibili">
          <input type="number" min="0" value={seats}
            onChange={e => setSeats(e.target.value)}
            onBlur={() => commit('seats', seats === '' ? null : Number(seats))}
            style={inputStyle} placeholder="es. 20" />
        </Field>
        <Field label="Date / Giorni">
          <input value={dates} onChange={e => setDates(e.target.value)} onBlur={() => commit('dates', dates)}
            style={inputStyle} placeholder="es. Ogni martedì e giovedì" />
        </Field>
        <Field label="Punto di ritrovo">
          <input value={meetingPoint} onChange={e => setMeetingPoint(e.target.value)} onBlur={() => commit('meeting_point', meetingPoint)}
            style={inputStyle} placeholder="es. Reception ore 9:00" />
        </Field>
      </div>

      <Field label="Cosa include">
        <input value={includes} onChange={e => setIncludes(e.target.value)} onBlur={() => commit('includes', includes)}
          style={inputStyle} placeholder="es. Trasporto, guida turistica, pranzo" />
      </Field>

      <Field label="Descrizione">
        <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={() => commit('description', description)}
          rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Breve descrizione dell'escursione" />
      </Field>

      {/* Photo */}
      <div style={{ marginTop: 4 }}>
        {exc.photo_url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src={exc.photo_url} alt="" style={{ height: 56, width: 96, objectFit: 'cover', borderRadius: 6 }} />
            <button type="button" onClick={() => onPatch({ photo_url: null })}
              style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}>
              Rimuovi foto
            </button>
          </div>
        )}
        <label style={uploadLabel}>
          {uploading ? 'Upload…' : exc.photo_url ? 'Cambia foto' : '+ Aggiungi foto'}
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => onUploadPhoto(e.target.files[0])} />
        </label>
      </div>
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────
export default function ExcursionsSection({ excursions = [], onChange }) {
  const [openId,    setOpenId]    = useState(null)
  const [uploading, setUploading] = useState({})

  function update(list) { onChange(list) }

  function addExcursion() {
    const exc = newExcursion()
    update([...excursions, exc])
    setOpenId(exc.id)
  }

  function removeExcursion(id) {
    update(excursions.filter(e => e.id !== id))
    if (openId === id) setOpenId(null)
  }

  function patchExcursion(id, patch) {
    update(excursions.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  async function uploadPhoto(id, file) {
    if (!file) return
    setUploading(u => ({ ...u, [id]: true }))
    try {
      const { url } = await uploadMedia('/api/upload/gallery', file)
      patchExcursion(id, { photo_url: url })
    } catch (err) { alert(`Errore upload: ${err.message}`) }
    finally { setUploading(u => ({ ...u, [id]: false })) }
  }

  return (
    <div>
      {excursions.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 20px' }}>
          Nessuna escursione ancora. Aggiungine una per iniziare.
        </p>
      )}

      {excursions.map(exc => {
        const isOpen = openId === exc.id
        return (
          <div key={exc.id} style={{ border: '1px solid #e8e8e8', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
            {/* Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: isOpen ? '#fafafa' : '#fff' }}>
              {exc.photo_url && (
                <img src={exc.photo_url} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: exc.name ? '#1a1a2e' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {exc.name || 'Nuova escursione'}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {exc.price != null && exc.price !== '' ? `€${exc.price}` : '—'}
                  {exc.seats != null && exc.seats !== '' ? ` · ${exc.seats} posti` : ''}
                  {exc.dates ? ` · ${exc.dates}` : ''}
                </div>
              </div>
              <Toggle value={exc.active} onChange={v => patchExcursion(exc.id, { active: v })} />
              <button type="button" onClick={() => setOpenId(isOpen ? null : exc.id)}
                style={arrowBtn}>{isOpen ? '▲' : '▼'}</button>
              <button type="button" onClick={() => removeExcursion(exc.id)} style={deleteBtnStyle}>✕</button>
            </div>

            {/* Form */}
            {isOpen && (
              <ExcursionForm
                key={exc.id}
                exc={exc}
                onPatch={patch => patchExcursion(exc.id, patch)}
                onUploadPhoto={file => uploadPhoto(exc.id, file)}
                uploading={!!uploading[exc.id]}
              />
            )}
          </div>
        )
      })}

      <button type="button" onClick={addExcursion}
        style={{ marginTop: 8, padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
        + Aggiungi escursione
      </button>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', padding: 0, background: value ? '#1a1a2e' : '#ddd', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle     = { width: '100%', padding: '9px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#fff', marginBottom: 0 }
const arrowBtn       = { padding: '4px 8px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#555' }
const deleteBtnStyle = { fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }
const uploadLabel    = { display: 'inline-block', padding: '7px 14px', background: '#f0f0f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, border: '1px solid #ddd', fontWeight: 600, color: '#333' }
