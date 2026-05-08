import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { CalendarCheck } from 'lucide-react'

const STATUS_LABELS = { open: 'Nuova', in_progress: 'In gestione', resolved: 'Confermata', cancelled: 'Annullata' }
const STATUS_COLORS = { open: '#e53e3e', in_progress: '#dd6b20', resolved: '#38a169', cancelled: '#aaa' }

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function parseBooking(req) {
  const lines = (req.message || '').split('\n')
  const firstLine = lines[0] || ''
  const tipo = firstLine.startsWith('[Prenotazione escursione]') ? 'escursione' : 'attività'
  const itemName = firstLine.replace(/^\[Prenotazione (?:attività|escursione)\]\s*/, '').trim()
  const fields = {}
  lines.slice(1).forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return { tipo, itemName, ...fields }
}

function parseInteresse(req) {
  const lines = (req.message || '').split('\n')
  const firstLine = lines[0] || ''
  const itemName = firstLine.replace(/^\[Interesse offerta:\s*/, '').replace(/\]$/, '').trim()
  const fields = {}
  lines.slice(1).forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return { tipo: 'offerta', itemName, ...fields }
}

export default function BookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [tab, setTab]           = useState('attivita')
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (profile) fetchBookings()
  }, [profile])

  async function fetchBookings() {
    setLoading(true)
    const params = new URLSearchParams()
    if (['admin_struttura', 'staff'].includes(profile.role) && profile.property_id) {
      params.set('property_id', profile.property_id)
    }
    try {
      const data = await apiFetch(`/api/requests?${params}`)
      setBookings(data.filter(r =>
        r.message?.startsWith('[Prenotazione') || r.message?.startsWith('[Interesse offerta')
      ))
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setBookings(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e) {
      alert(e.message)
    }
  }

  function countNew(tipoKey) {
    if (tipoKey === 'offerte') {
      return bookings.filter(r => r.message?.startsWith('[Interesse offerta') && r.status === 'open').length
    }
    return bookings.filter(r => {
      if (!r.message?.startsWith('[Prenotazione')) return false
      const p = parseBooking(r)
      return (tipoKey === 'attivita' ? p.tipo === 'attività' : p.tipo === 'escursione') && r.status === 'open'
    }).length
  }

  const displayed = bookings.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter
    if (!matchFilter) return false
    if (tab === 'offerte') return r.message?.startsWith('[Interesse offerta')
    if (!r.message?.startsWith('[Prenotazione')) return false
    const p = parseBooking(r)
    return tab === 'attivita' ? p.tipo === 'attività' : p.tipo === 'escursione'
  })

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 24px' }}>Prenotazioni</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e8e8e8' }}>
        {[['attivita', 'Attività'], ['escursioni', 'Escursioni'], ['offerte', 'Offerte']].map(([key, label]) => {
          const n = countNew(key)
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 22px', background: 'none', border: 'none',
              borderBottom: tab === key ? '2px solid #1a1a2e' : '2px solid transparent',
              marginBottom: -2, fontWeight: tab === key ? 700 : 400,
              color: tab === key ? '#1a1a2e' : '#888',
              cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {label}
              {n > 0 && (
                <span style={{ background: '#e53e3e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtri stato */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'open', 'in_progress', 'resolved', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '5px 14px', borderRadius: 20, border: '1px solid #ddd',
            background: filter === s ? '#1a1a2e' : '#fff',
            color: filter === s ? '#fff' : '#333',
            cursor: 'pointer', fontSize: 12, fontWeight: filter === s ? 600 : 400,
          }}>
            {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa' }}>
          <CalendarCheck size={36} strokeWidth={1.5} color="#ddd" style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15 }}>Nessuna voce.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(req => (
            <BookingCard key={req.id} req={req} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ req, onUpdateStatus }) {
  const isInteresse = req.message?.startsWith('[Interesse offerta')
  const p = isInteresse ? parseInteresse(req) : parseBooking(req)
  const isNew = Date.now() - new Date(req.created_at).getTime() < 300_000
  const propertyName = req.properties?.name

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: `3px solid ${STATUS_COLORS[req.status]}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {p.itemName || '—'}
            </span>
            {propertyName && (
              <span style={{ fontSize: 11, background: '#f0f4ff', color: '#3b5bdb', padding: '2px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>
                {propertyName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', fontSize: 13, color: '#555' }}>
            {p['Nome']     && <span>{p['Nome']}</span>}
            {p['Email']    && <a href={`mailto:${p['Email']}`} style={{ color: '#1a6fc4', textDecoration: 'none' }}>{p['Email']}</a>}
            {p['Telefono'] && <a href={`tel:${p['Telefono']}`} style={{ color: '#555', textDecoration: 'none' }}>{p['Telefono']}</a>}
          </div>
          {p['Persone'] && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              <strong>Persone:</strong> {p['Persone']}
            </div>
          )}
          {(p['Note'] || p['Messaggio']) && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#888', fontStyle: 'italic' }}>
              {p['Note'] || p['Messaggio']}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: STATUS_COLORS[req.status],
            background: `${STATUS_COLORS[req.status]}18`,
            padding: '3px 10px', borderRadius: 12,
          }}>
            {STATUS_LABELS[req.status]}
          </span>
          <span style={{ fontSize: 11, color: '#aaa' }}>{formatDateTime(req.created_at)}</span>
          {isNew && req.status === 'open' && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#e53e3e', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
              NUOVA
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {req.status === 'open' && (
          <button onClick={() => onUpdateStatus(req.id, 'in_progress')} style={btnStyle('#dd6b20')}>
            Prendi in carico
          </button>
        )}
        {req.status !== 'resolved' && req.status !== 'cancelled' && (
          <button onClick={() => onUpdateStatus(req.id, 'resolved')} style={btnStyle('#38a169')}>
            Conferma
          </button>
        )}
        {req.status === 'open' && (
          <button onClick={() => onUpdateStatus(req.id, 'cancelled')} style={btnStyle('#aaa')}>
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}

const btnStyle = color => ({
  padding: '6px 14px', background: color, color: '#fff', border: 'none',
  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
})
