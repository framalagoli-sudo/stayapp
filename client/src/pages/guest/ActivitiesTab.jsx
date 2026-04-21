import { useState } from 'react'
import { MapPin, Clock, CheckCircle } from 'lucide-react'

const AGE_FILTERS = [
  { value: 'tutti',    label: 'Tutti' },
  { value: 'adulti',   label: 'Adulti' },
  { value: 'bambini',  label: 'Bambini' },
  { value: 'famiglie', label: 'Famiglie' },
]

const AGE_BADGE = {
  tutti:    { label: 'Tutti', color: '#6366f1' },
  adulti:   { label: 'Adulti', color: '#0891b2' },
  bambini:  { label: 'Bambini', color: '#d97706' },
  famiglie: { label: 'Famiglie', color: '#16a34a' },
}

export default function ActivitiesTab({ activities = [], propertyId, primary, textColor, subText, isDark, radius }) {
  const [filter, setFilter] = useState('tutti')
  const [booking, setBooking] = useState(null)
  const [bookState, setBookState] = useState('idle')
  const [room, setRoom] = useState('')

  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'

  const filtered = activities.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.active && (filter === 'tutti' || item.ageGroup === 'tutti' || item.ageGroup === filter)
    ),
  })).filter(cat => cat.items.length > 0)

  async function sendBooking(activity) {
    setBookState('loading')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          type: 'attività',
          room: room.trim() || undefined,
          message: `Richiesta prenotazione: ${activity.name}${activity.schedule ? ` — ${activity.schedule}` : ''}`,
        }),
      })
      setBookState(res.ok ? 'success' : 'error')
    } catch {
      setBookState('error')
    }
  }

  function closeBooking() {
    setBooking(null)
    setBookState('idle')
    setRoom('')
  }

  return (
    <div>
      {/* Age filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {AGE_FILTERS.map(({ value, label }) => (
          <button key={value} type="button" onClick={() => setFilter(value)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, border: 'none', cursor: 'pointer',
              background: filter === value ? primary : isDark ? '#2a2a3e' : '#f0f0f0',
              color: filter === value ? '#fff' : subText,
              fontWeight: filter === value ? 700 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: subText, marginTop: 32 }}>Nessuna attività disponibile.</p>
      ) : (
        filtered.map(cat => (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: textColor, margin: '0 0 12px', paddingBottom: 8, borderBottom: `2px solid ${primary}22` }}>
              {cat.category}
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {cat.items.map(item => (
                <ActivityCard key={item.id} item={item} primary={primary} textColor={textColor} subText={subText} cardBg={cardBg} cardShadow={cardShadow} radius={radius}
                  onBook={() => { setBooking(item); setBookState('idle') }} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Booking modal */}
      {booking && (
        <div onClick={closeBooking} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: cardBg, borderRadius: `${radius}px ${radius}px 0 0`, padding: 24, width: '100%', maxWidth: 430, boxSizing: 'border-box' }}>
            {bookState === 'success' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle size={44} strokeWidth={1.5} color={primary} style={{ marginBottom: 8 }} />
                <p style={{ fontWeight: 600, color: primary, margin: '0 0 6px' }}>Richiesta inviata!</p>
                <p style={{ color: subText, fontSize: 13, margin: '0 0 16px' }}>Il personale la contatterà a breve.</p>
                <button onClick={closeBooking} style={{ padding: '10px 28px', background: primary, color: '#fff', border: 'none', borderRadius: radius, cursor: 'pointer', fontWeight: 600 }}>
                  Chiudi
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, color: textColor }}>Prenota: {booking.name}</h3>
                {booking.schedule && (
                  <p style={{ margin: '0 0 14px', color: subText, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} strokeWidth={1.5} color={primary} />{booking.schedule}
                  </p>
                )}
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: subText, marginBottom: 4 }}>
                  Camera (opzionale)
                </label>
                <input
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="es. 12, Suite Blu"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: radius / 2 || 6,
                    border: `1px solid ${isDark ? '#3a3a5e' : '#ddd'}`, fontSize: 14,
                    marginBottom: 14, boxSizing: 'border-box',
                    background: isDark ? '#1a1a2e' : '#f8f8f8', color: textColor,
                  }}
                />
                {bookState === 'error' && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>Errore nell'invio. Riprova.</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeBooking} style={{ flex: 1, padding: '12px', background: isDark ? '#333' : '#f0f0f0', color: textColor, border: 'none', borderRadius: radius, cursor: 'pointer', fontSize: 14 }}>
                    Annulla
                  </button>
                  <button onClick={() => sendBooking(booking)} disabled={bookState === 'loading'}
                    style={{ flex: 2, padding: '12px', background: primary, color: '#fff', border: 'none', borderRadius: radius, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    {bookState === 'loading' ? 'Invio…' : 'Conferma richiesta'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityCard({ item, primary, textColor, subText, cardBg, cardShadow, radius, onBook }) {
  const badge = AGE_BADGE[item.ageGroup] || AGE_BADGE.tutti

  return (
    <div style={{ background: cardBg, borderRadius: radius, boxShadow: cardShadow, overflow: 'hidden' }}>
      {item.photo_url && (
        <img src={item.photo_url} alt={item.name}
          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: textColor }}>{item.name}</div>
          {item.ageGroup !== 'tutti' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: badge.color, padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginTop: 2 }}>
              {badge.label}
            </span>
          )}
        </div>
        {item.location && (
          <div style={{ fontSize: 12, color: subText, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} strokeWidth={1.5} color={primary} />{item.location}
          </div>
        )}
        {item.schedule && (
          <div style={{ fontSize: 12, color: subText, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} strokeWidth={1.5} color={primary} />{item.schedule}
          </div>
        )}
        {item.description && (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: subText, lineHeight: 1.6 }}>{item.description}</p>
        )}
        {item.bookable && (
          <button type="button" onClick={onBook}
            style={{ width: '100%', padding: '10px', background: primary, color: '#fff', border: 'none', borderRadius: radius / 2 || 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Prenota
          </button>
        )}
      </div>
    </div>
  )
}
