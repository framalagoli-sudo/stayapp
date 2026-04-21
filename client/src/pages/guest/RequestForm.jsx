import { useState } from 'react'

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

const REQUEST_TYPES = [
  { value: 'reception',   label: 'Reception',    module: 'reception' },
  { value: 'housekeeping',label: 'Pulizie',      module: 'housekeeping' },
  { value: 'maintenance', label: 'Manutenzione', module: '_always' },
  { value: 'other',       label: 'Altro',        module: '_always' },
]

export default function RequestForm({ propertyId, modules = {}, primary = '#00b5b5', radius = 8, textColor = '#1a1a2e', isDark = false }) {
  const effectiveModules = { ...DEFAULT_MODULES, ...modules }
  const hasAnyRequest = effectiveModules.reception || effectiveModules.housekeeping

  const visibleTypes = REQUEST_TYPES.filter(t => {
    if (t.module === '_always') return hasAnyRequest
    return effectiveModules[t.module]
  })

  const [type, setType] = useState(visibleTypes[0]?.value || 'other')
  const [room, setRoom] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState('idle')

  const inputBg    = isDark ? '#2a2a3e' : '#fff'
  const inputBorder= isDark ? '#3a3a5e' : '#ddd'
  const labelColor = isDark ? '#ccc' : '#444'

  async function handleSubmit(e) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, type, room, message }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <p style={{ fontWeight: 600, color: primary }}>Richiesta inviata!</p>
        <p style={{ color: isDark ? '#aaa' : '#666', fontSize: 14 }}>Il personale la riceverà a breve.</p>
        <button
          onClick={() => setState('idle')}
          style={{ marginTop: 16, padding: '10px 24px', background: primary, color: '#fff', border: 'none', borderRadius: radius, cursor: 'pointer' }}
        >
          Nuova richiesta
        </button>
      </div>
    )
  }

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: labelColor, marginBottom: 6 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: radius / 2 || 4,
    border: `1px solid ${inputBorder}`, fontSize: 14, marginBottom: 16,
    boxSizing: 'border-box', background: inputBg, color: textColor,
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0, fontSize: 15, color: textColor }}>Invia una richiesta</h3>

      <label style={labelStyle}>Tipo</label>
      <div style={{ display: 'grid', gridTemplateColumns: visibleTypes.length === 1 ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {visibleTypes.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            style={{
              padding: '10px', borderRadius: radius / 2 || 4, fontSize: 13,
              border: `2px solid ${type === value ? primary : inputBorder}`,
              background: type === value ? primary : inputBg,
              color: type === value ? '#fff' : textColor,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label style={labelStyle}>Camera (opzionale)</label>
      <input
        type="text"
        value={room}
        onChange={e => setRoom(e.target.value)}
        placeholder="es. 12, Suite Blu"
        style={inputStyle}
      />

      <label style={labelStyle}>Messaggio</label>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
        rows={4}
        placeholder="Descrivi la tua richiesta…"
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      {state === 'error' && <p style={{ color: '#e53e3e', fontSize: 13 }}>Errore nell'invio. Riprova.</p>}

      <button
        type="submit"
        disabled={state === 'loading'}
        style={{ width: '100%', padding: '14px', background: primary, color: '#fff', border: 'none', borderRadius: radius, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
      >
        {state === 'loading' ? 'Invio…' : 'Invia richiesta'}
      </button>
    </form>
  )
}
