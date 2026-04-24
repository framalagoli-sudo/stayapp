import { useEffect, useState } from 'react'
import { useProperty } from '../../../hooks/useProperty'
import CollegamentiSection from '../../../components/admin/CollegamentiSection'
import { ExternalLink, X } from 'lucide-react'

const AMENITY_PRESETS = [
  'Wi-Fi gratuito', 'Parcheggio', 'Piscina', 'Spa', 'Palestra', 'Ristorante',
  'Colazione inclusa', 'Pet friendly', 'Vista mare', 'Vista montagna',
  'Aria condizionata', 'Ascensore', 'Navetta aeroporto', 'Spiaggia privata',
  'Campo da tennis', 'Noleggio bici',
]

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
  const [amenities, setAmenities] = useState([])
  const [amenityInput, setAmenityInput] = useState('')

  useEffect(() => {
    if (property) {
      setForm(property)
      setAmenities(property.amenities || [])
    }
  }, [property])

  function addAmenity(label) {
    const val = label.trim()
    if (!val || amenities.includes(val)) return
    const updated = [...amenities, val]
    setAmenities(updated)
    setAmenityInput('')
    save({ amenities: updated }).catch(() => {})
  }

  function removeAmenity(val) {
    const updated = amenities.filter(a => a !== val)
    setAmenities(updated)
    save({ amenities: updated }).catch(() => {})
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const updates = Object.fromEntries(Object.entries(form).filter(([k]) => INFO_KEYS.includes(k)))
    try { await save(updates) } catch {}
  }

  if (loading) return <p style={loadingStyle}>Caricamento…</p>
  if (!property) return <p style={errorStyle}>Nessuna struttura associata al profilo.</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ ...titleStyle, marginBottom: 0 }}>Informazioni generali</h2>
        {property.slug && (
          <a
            href={`/s/${property.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#1a1a2e', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', background: '#f0f0f0', borderRadius: 8 }}
          >
            <ExternalLink size={13} strokeWidth={2} />
            Anteprima PWA
          </a>
        )}
      </div>
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

        {property.azienda_id && (
          <CollegamentiSection
            entitaId={property.id}
            entitaTipo="struttura"
            aziendaId={property.azienda_id}
          />
        )}
      </form>

      {/* Amenities */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16, fontWeight: 700 }}>Dotazioni e servizi</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
          Tag visibili nella scheda Info dell'app e nel minisito. Aggiungili dalla lista o scrivi il tuo.
        </p>

        {/* Current tags */}
        {amenities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {amenities.map(a => (
              <span key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0f4ff', color: '#1a1a2e', fontSize: 13, fontWeight: 600, padding: '5px 10px', borderRadius: 20 }}>
                {a}
                <button onClick={() => removeAmenity(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#888', display: 'flex' }}>
                  <X size={13} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Free text input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={amenityInput}
            onChange={e => setAmenityInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(amenityInput) } }}
            placeholder="Scrivi una dotazione e premi Invio"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => addAmenity(amenityInput)}
            style={{ padding: '10px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Aggiungi
          </button>
        </div>

        {/* Presets */}
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Suggerimenti rapidi:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {AMENITY_PRESETS.filter(p => !amenities.includes(p)).map(p => (
            <button key={p} onClick={() => addAmenity(p)}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 16, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' }}>
              + {p}
            </button>
          ))}
        </div>
      </div>
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
