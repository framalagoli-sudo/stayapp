import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../lib/api'
import { Users, Calendar, Mail, Phone, Package, ArrowLeft, Check, X, Clock } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'In attesa',  bg: '#fff3cd', color: '#856404' },
  { value: 'confirmed', label: 'Confermata', bg: '#d4edda', color: '#155724' },
  { value: 'cancelled', label: 'Annullata',  bg: '#f8d7da', color: '#721c24' },
]

function statusStyle(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

export default function EventoPrenotazioniPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/eventi/${id}`),
      apiFetch(`/api/eventi/${id}/bookings`),
    ]).then(([ev, bk]) => {
      setEvento(ev)
      setBookings(bk)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function updateStatus(bookingId, status) {
    setUpdatingId(bookingId)
    try {
      const updated = await apiFetch(`/api/eventi/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updated } : b))
      // Refresh event seats count
      const ev = await apiFetch(`/api/eventi/${id}`)
      setEvento(ev)
    } catch {} finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>
  if (!evento) return <p style={{ padding: 32, color: '#e53e3e' }}>Evento non trovato.</p>

  const confirmed = bookings.filter(b => b.status === 'confirmed').reduce((n, b) => n + (b.seats || 1), 0)
  const pending   = bookings.filter(b => b.status === 'pending').reduce((n, b) => n + (b.seats || 1), 0)
  const revenue   = bookings.filter(b => b.status === 'confirmed').reduce((n, b) => n + (b.total_amount || 0), 0)

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/admin/eventi/${id}`)}
          style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
          <ArrowLeft size={14} strokeWidth={2} /> Torna all'evento
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Prenotazioni — {evento.title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{fmtDate(evento.date_start)}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Confermati', value: confirmed, sub: evento.seats_total ? `su ${evento.seats_total} posti` : 'posti', icon: Check, color: '#155724', bg: '#d4edda' },
          { label: 'In attesa',  value: pending,   sub: 'da confermare', icon: Clock, color: '#856404', bg: '#fff3cd' },
          { label: 'Ricavo',     value: `€${revenue}`, sub: 'prenotazioni confermate', icon: Users, color: '#1a1a2e', bg: '#f0f4ff' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ background: bg, borderRadius: 8, padding: 6 }}>
                <Icon size={16} strokeWidth={2} color={color} />
              </div>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Users size={36} strokeWidth={1} color="#ddd" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, color: '#888' }}>Nessuna prenotazione ancora.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const st = statusStyle(b.status)
            const pkg = b.package_id ? (evento.packages || []).find(p => p.id === b.package_id) : null
            return (
              <div key={b.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0f4ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
                    {b.guest_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{b.guest_name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{fmtDate(b.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555' }}>
                        <Mail size={11} strokeWidth={1.5} /> {b.guest_email}
                      </span>
                      {b.guest_phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555' }}>
                          <Phone size={11} strokeWidth={1.5} /> {b.guest_phone}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555' }}>
                        <Users size={11} strokeWidth={1.5} /> {b.seats} {b.seats === 1 ? 'posto' : 'posti'}
                      </span>
                    </div>
                    {pkg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555', marginBottom: 4 }}>
                        <Package size={11} strokeWidth={1.5} /> Pacchetto: <strong>{pkg.name}</strong>
                      </div>
                    )}
                    {b.notes && (
                      <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 }}>{b.notes}</div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
                      {b.total_amount > 0 ? `€${b.total_amount}` : 'Gratuito'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.filter(s => s.value !== b.status).map(s => (
                    <button key={s.value} disabled={updatingId === b.id}
                      onClick={() => updateStatus(b.id, s.value)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: s.bg, color: s.color, opacity: updatingId === b.id ? 0.6 : 1 }}>
                      → {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
