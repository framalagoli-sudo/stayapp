import { useEffect, useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'

const FIELDS = [
  { key: 'name',          label: 'Nome struttura *', type: 'text' },
  { key: 'description',   label: 'Descrizione',      type: 'textarea' },
  { key: 'address',       label: 'Indirizzo',        type: 'text' },
  { key: 'phone',         label: 'Telefono',         type: 'text' },
  { key: 'email',         label: 'Email',            type: 'email' },
  { key: 'checkin_time',  label: 'Check-in',         type: 'text', placeholder: 'es. 14:00' },
  { key: 'checkout_time', label: 'Check-out',        type: 'text', placeholder: 'es. 11:00' },
  { key: 'wifi_name',     label: 'Nome WiFi',        type: 'text' },
  { key: 'wifi_password', label: 'Password WiFi',    type: 'text' },
  { key: 'rules',         label: 'Regole della struttura', type: 'textarea' },
]

const INFO_KEYS = FIELDS.map(f => f.key)

export default function PropertyInfoPage() {
  const { property, loading, saving, saved, saveError, save } = useProperty()
  const [form, setForm] = useState({})

  useEffect(() => { if (property) setForm(property) }, [property])

  async function handleSubmit(e) {
    e.preventDefault()
    const updates = Object.fromEntries(Object.entries(form).filter(([k]) => INFO_KEYS.includes(k)))
    try { await save(updates) } catch {}
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={titleStyle}>Informazioni generali</h2>
      <p style={descStyle}>Dati di base della struttura visibili agli ospiti nell'app.</p>

      <form onSubmit={handleSubmit} style={cardStyle}>
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <label style={lblStyle}>{label}</label>
            {type === 'textarea' ? (
              <textarea
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            ) : (
              <input
                type={type}
                value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={inputStyle}
              />
            )}
          </div>
        ))}

        {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}

        <button type="submit" disabled={saving} style={saveBtn}>
          {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'}
        </button>
      </form>
    </div>
  )
}

const titleStyle  = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle   = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle   = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const lblStyle    = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle  = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const saveBtn     = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const loadingStyle = { padding: 32, color: '#888' }
const errorStyle   = { padding: 32, color: '#e53e3e' }
