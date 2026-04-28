import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Loader, CheckCheck, XCircle } from 'lucide-react'
import { apiFetch } from '../../lib/api'

const DEFAULT_MODULES = {
  reception: true, housekeeping: false, restaurant: false,
  upselling: false, chat: false, wifi: true, info: true,
}

const REQUEST_TYPES = [
  { value: 'reception',    label: 'Reception',    module: 'reception' },
  { value: 'housekeeping', label: 'Pulizie',      module: 'housekeeping' },
  { value: 'maintenance',  label: 'Manutenzione', module: '_always' },
  { value: 'other',        label: 'Altro',        module: '_always' },
]

const STATUS_CONFIG = {
  open:        { label: 'Aperta',      color: '#dd6b20', bg: '#fff7ed', Icon: Clock },
  in_progress: { label: 'In gestione', color: '#2b6cb0', bg: '#ebf8ff', Icon: Loader },
  resolved:    { label: 'Risolta',     color: '#276749', bg: '#f0fff4', Icon: CheckCheck },
  cancelled:   { label: 'Annullata',   color: '#c53030', bg: '#fff5f5', Icon: XCircle },
}

function storageKey(propertyId) { return `requests_${propertyId}` }

function saveRequest(propertyId, req) {
  const key  = storageKey(propertyId)
  const list = JSON.parse(localStorage.getItem(key) || '[]')
  list.unshift(req)
  localStorage.setItem(key, JSON.stringify(list.slice(0, 10)))
}

function loadSavedRequests(propertyId) {
  return JSON.parse(localStorage.getItem(storageKey(propertyId)) || '[]')
}

export default function RequestForm({ propertyId, modules = {}, primary = '#00b5b5', radius = 8, textColor = '#1a1a2e', isDark = false }) {
  const effectiveModules = { ...DEFAULT_MODULES, ...modules }
  const hasAnyRequest = effectiveModules.reception || effectiveModules.housekeeping

  const visibleTypes = REQUEST_TYPES.filter(t => {
    if (t.module === '_always') return hasAnyRequest
    return effectiveModules[t.module]
  })

  const [type,    setType]    = useState(visibleTypes[0]?.value || 'other')
  const [room,    setRoom]    = useState('')
  const [message, setMessage] = useState('')
  const [state,   setState]   = useState('idle')
  const [history, setHistory] = useState([])

  useEffect(() => {
    const saved = loadSavedRequests(propertyId)
    if (!saved.length) return
    const ids = saved.map(r => r.id).join(',')
    apiFetch(`/api/requests/public?ids=${ids}`)
      .then(data => {
        const statusMap = Object.fromEntries(data.map(r => [r.id, r.status]))
        setHistory(saved.map(r => ({ ...r, status: statusMap[r.id] || r.status })))
      })
      .catch(() => setHistory(saved))
  }, [propertyId])

  const inputBg     = isDark ? '#2a2a3e' : '#fff'
  const inputBorder = isDark ? '#3a3a5e' : '#ddd'
  const labelColor  = isDark ? '#ccc'    : '#444'

  async function handleSubmit(e) {
    e.preventDefault()
    setState('loading')
    try {
      const data = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({ property_id: propertyId, type, room, message }),
      })
      const newReq = { id: data.id, type, room, status: 'open', created_at: data.created_at }
      saveRequest(propertyId, newReq)
      setHistory(prev => [newReq, ...prev])
      setState('success')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <CheckCircle size={48} strokeWidth={1.5} color={primary} style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: primary, marginBottom: 4 }}>Richiesta inviata!</p>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: 14, marginBottom: 16 }}>Il personale la riceverà a breve.</p>
          <button
            onClick={() => { setState('idle'); setMessage('') }}
            style={{ padding: '10px 24px', background: primary, color: '#fff', border: 'none', borderRadius: radius, cursor: 'pointer', fontSize: 14 }}
          >
            Nuova richiesta
          </button>
        </div>
        <HistoryList history={history} primary={primary} isDark={isDark} textColor={textColor} />
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
    <div>
      <form onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0, fontSize: 15, color: textColor }}>Invia una richiesta</h3>

        <label style={labelStyle}>Tipo</label>
        <div style={{ display: 'grid', gridTemplateColumns: visibleTypes.length === 1 ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {visibleTypes.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setType(value)}
              style={{
                padding: '10px', borderRadius: radius / 2 || 4, fontSize: 13,
                border: `2px solid ${type === value ? primary : inputBorder}`,
                background: type === value ? primary : inputBg,
                color: type === value ? '#fff' : textColor,
                cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Camera (opzionale)</label>
        <input type="text" value={room} onChange={e => setRoom(e.target.value)}
          placeholder="es. 12, Suite Blu" style={inputStyle} />

        <label style={labelStyle}>Messaggio</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          required rows={4} placeholder="Descrivi la tua richiesta…"
          style={{ ...inputStyle, resize: 'vertical' }} />

        {state === 'error' && <p style={{ color: '#e53e3e', fontSize: 13 }}>Errore nell'invio. Riprova.</p>}

        <button type="submit" disabled={state === 'loading'}
          style={{ width: '100%', padding: '14px', background: primary, color: '#fff', border: 'none', borderRadius: radius, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {state === 'loading' ? 'Invio…' : 'Invia richiesta'}
        </button>
      </form>

      <HistoryList history={history} primary={primary} isDark={isDark} textColor={textColor} />
    </div>
  )
}

function HistoryList({ history, primary, isDark, textColor }) {
  if (!history.length) return null
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0'
  const subColor    = isDark ? '#888' : '#aaa'

  return (
    <div style={{ marginTop: 28 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#aaa' : '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Le mie richieste
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map(req => {
          const cfg  = STATUS_CONFIG[req.status] || STATUS_CONFIG.open
          const Icon = cfg.Icon
          return (
            <div key={req.id} style={{ background: isDark ? '#1e1e30' : '#f9f9fb', borderRadius: 10, padding: '12px 14px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: textColor, marginBottom: 2 }}>{req.type}</div>
                {req.room && <div style={{ fontSize: 12, color: subColor }}>Camera {req.room}</div>}
                <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>
                  {new Date(req.created_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: cfg.bg, flexShrink: 0 }}>
                <Icon size={12} strokeWidth={2} color={cfg.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
