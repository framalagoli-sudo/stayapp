import { useState } from 'react'
import { Waves, Sparkles, Utensils, Activity, Car, Wifi, Umbrella, Music, Wine, Coffee, Bell, Bus, Star } from 'lucide-react'

export const SERVICE_ICONS = [
  { key: 'pool',         emoji: '🏊', label: 'Piscina' },
  { key: 'spa',          emoji: '💆', label: 'Spa' },
  { key: 'restaurant',   emoji: '🍽️', label: 'Ristorante' },
  { key: 'gym',          emoji: '🏋️', label: 'Palestra' },
  { key: 'parking',      emoji: '🅿️', label: 'Parcheggio' },
  { key: 'wifi',         emoji: '📶', label: 'WiFi' },
  { key: 'beach',        emoji: '🏖️', label: 'Spiaggia' },
  { key: 'entertainment',emoji: '🎭', label: 'Animazione' },
  { key: 'bar',          emoji: '🍸', label: 'Bar' },
  { key: 'breakfast',    emoji: '☕', label: 'Colazione' },
  { key: 'reception24',  emoji: '🔔', label: 'Reception 24h' },
  { key: 'shuttle',      emoji: '🚌', label: 'Navetta' },
]

const BLANK = { icon: 'pool', name: '', description: '', hours: '' }

export function iconEmoji(key) {
  return SERVICE_ICONS.find(ic => ic.key === key)?.emoji || '⭐'
}

const SERVICE_LUCIDE = {
  pool:          Waves,
  spa:           Sparkles,
  restaurant:    Utensils,
  gym:           Activity,
  parking:       Car,
  wifi:          Wifi,
  beach:         Umbrella,
  entertainment: Music,
  bar:           Wine,
  breakfast:     Coffee,
  reception24:   Bell,
  shuttle:       Bus,
}

export function iconLucide(key) {
  return SERVICE_LUCIDE[key] || Star
}

export default function ServicesSection({ services = [], onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | number
  const [form, setForm] = useState(BLANK)

  function openNew() { setForm(BLANK); setEditing('new') }
  function openEdit(i) { setForm({ ...services[i] }); setEditing(i) }

  function save() {
    if (!form.name.trim()) return
    const entry = { ...form, id: editing === 'new' ? crypto.randomUUID() : services[editing].id }
    const next = editing === 'new'
      ? [...services, entry]
      : services.map((s, i) => i === editing ? entry : s)
    onChange(next)
    setEditing(null)
  }

  function remove(i) { onChange(services.filter((_, idx) => idx !== i)) }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {services.map((s, i) => (
          <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fafafa', borderRadius: 10, border: '1px solid #eee' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{iconEmoji(s.icon)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              {s.hours && <div style={{ fontSize: 12, color: '#888' }}>{s.hours}</div>}
            </div>
            <button onClick={() => openEdit(i)} style={editBtn}>Modifica</button>
            <button onClick={() => remove(i)} style={delBtn}>✕</button>
          </div>
        ))}
      </div>

      {editing !== null ? (
        <div style={{ background: '#f8f8f8', borderRadius: 12, padding: 20, border: '1px solid #e0e0e0' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
            {editing === 'new' ? 'Aggiungi servizio' : 'Modifica servizio'}
          </div>

          <label style={lbl}>Icona</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 16 }}>
            {SERVICE_ICONS.map(({ key, emoji, label }) => (
              <button key={key} type="button" title={label}
                onClick={() => setForm(f => ({ ...f, icon: key }))}
                style={{
                  fontSize: 20, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${form.icon === key ? '#1a1a2e' : '#ddd'}`,
                  background: form.icon === key ? '#1a1a2e18' : '#fff',
                }}
              >{emoji}</button>
            ))}
          </div>

          <label style={lbl}>Nome servizio *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="es. Piscina olimpionica" style={{ ...inp, marginBottom: 10 }} />

          <label style={lbl}>Descrizione breve</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="es. Aperta tutto il giorno, attrezzata con lettini" style={{ ...inp, marginBottom: 10 }} />

          <label style={lbl}>Orario (opzionale)</label>
          <input value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
            placeholder="es. 09:00 – 19:00" style={{ ...inp, marginBottom: 16 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={saveBtn}>Salva</button>
            <button onClick={() => setEditing(null)} style={cancelBtn}>Annulla</button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} style={saveBtn}>+ Aggiungi servizio</button>
      )}
    </div>
  )
}

const lbl    = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }
const inp    = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }
const editBtn   = { fontSize: 12, padding: '4px 10px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' }
const delBtn    = { fontSize: 13, padding: '4px 8px', background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontWeight: 700 }
const saveBtn   = { padding: '9px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const cancelBtn = { padding: '9px 16px', background: '#eee', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
