import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { Calendar, MapPin, Users, Plus, ChevronRight, Eye, EyeOff } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadge(ev) {
  if (!ev.active)    return { label: 'Disattivo',    bg: '#f0f0f0', color: '#888' }
  if (!ev.published) return { label: 'Bozza',        bg: '#fff3cd', color: '#856404' }
  const past = new Date(ev.date_start) < new Date()
  if (past)          return { label: 'Concluso',     bg: '#f0f0f0', color: '#888' }
  return               { label: 'Pubblicato',         bg: '#d4edda', color: '#155724' }
}

export default function EventiListPage() {
  const { profile } = useAuth()
  const { azienda } = useAzienda()
  const navigate = useNavigate()
  const [eventi, setEventi] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/eventi')
      .then(setEventi)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  const upcoming = eventi.filter(e => new Date(e.date_start) >= new Date())
  const past     = eventi.filter(e => new Date(e.date_start) <  new Date())

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Eventi</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>
            Gestisci eventi, pacchetti e prenotazioni.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/eventi/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} strokeWidth={2.5} /> Nuovo evento
        </button>
      </div>

      {eventi.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Calendar size={40} strokeWidth={1} color="#ddd" style={{ marginBottom: 16 }} />
          <p style={{ margin: 0, color: '#888', fontSize: 15 }}>Nessun evento ancora. Creane uno!</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>In programma</div>
          <EventGrid eventi={upcoming} navigate={navigate} />
        </>
      )}

      {past.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', margin: '24px 0 10px' }}>Passati</div>
          <EventGrid eventi={past} navigate={navigate} muted />
        </>
      )}
    </div>
  )
}

function EventGrid({ eventi, navigate, muted }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {eventi.map(ev => {
        const badge = statusBadge(ev)
        const seatsLeft = ev.seats_total ? ev.seats_total - ev.seats_booked : null
        return (
          <div key={ev.id}
            onClick={() => navigate(`/admin/eventi/${ev.id}`)}
            style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, opacity: muted ? 0.65 : 1, transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
          >
            {ev.cover_url
              ? <img src={ev.cover_url} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f0f4ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={24} strokeWidth={1.5} color="#1a1a2e" />
                </div>
            }

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                  <Calendar size={11} strokeWidth={1.5} /> {fmtDate(ev.date_start)}
                </span>
                {ev.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                    <MapPin size={11} strokeWidth={1.5} /> {ev.location}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                  <Users size={11} strokeWidth={1.5} />
                  {ev.seats_booked} prenotati{seatsLeft !== null ? ` · ${seatsLeft} posti rimasti` : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
                {ev.price > 0 ? `€${ev.price}` : 'Gratuito'}
              </span>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/admin/eventi/${ev.id}/prenotazioni`) }}
                style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e', background: '#f0f4ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                Prenotazioni →
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
