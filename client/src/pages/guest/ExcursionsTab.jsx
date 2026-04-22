import { useState } from 'react'
import { MapPin, Clock, CalendarDays, CheckCircle } from 'lucide-react'
import { apiFetch } from '../../lib/api'

export default function ExcursionsTab({ excursions = [], propertyId, primary, textColor, subText, isDark, radius }) {
  const [booking,   setBooking]   = useState(null)
  const [bookState, setBookState] = useState('idle')
  const [persons,   setPersons]   = useState(1)
  const [notes,     setNotes]     = useState('')

  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'
  const inputBg    = isDark ? '#1a1a2e' : '#f8f8f8'
  const inputBorder= isDark ? '#3a3a5e' : '#ddd'

  const active = excursions.filter(e => e.active)

  async function sendBooking() {
    setBookState('loading')
    try {
      await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          property_id: propertyId,
          type: 'escursione',
          message: `Prenotazione escursione: ${booking.name}${booking.dates ? ` — ${booking.dates}` : ''} — ${persons} person${persons === 1 ? 'a' : 'e'}${notes.trim() ? `\nNote: ${notes.trim()}` : ''}`,
        }),
      })
      setBookState('success')
    } catch {
      setBookState('error')
    }
  }

  function openBooking(exc) {
    setBooking(exc)
    setBookState('idle')
    setPersons(1)
    setNotes('')
  }

  function closeBooking() {
    setBooking(null)
    setBookState('idle')
  }

  if (active.length === 0) {
    return <p style={{ textAlign: 'center', color: subText, marginTop: 32 }}>Nessuna escursione disponibile.</p>
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 14 }}>
        {active.map(exc => (
          <ExcursionCard key={exc.id} exc={exc} primary={primary} textColor={textColor} subText={subText}
            cardBg={cardBg} cardShadow={cardShadow} radius={radius} onBook={() => openBooking(exc)} />
        ))}
      </div>

      {/* Booking bottom sheet */}
      {booking && (
        <div onClick={closeBooking}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: cardBg, borderRadius: `${radius}px ${radius}px 0 0`, padding: 24, width: '100%', maxWidth: 430, boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto' }}>

            {bookState === 'success' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle size={44} strokeWidth={1.5} color={primary} style={{ marginBottom: 8 }} />
                <p style={{ fontWeight: 600, color: primary, margin: '0 0 6px' }}>Richiesta inviata!</p>
                <p style={{ color: subText, fontSize: 13, margin: '0 0 16px' }}>Il personale la contatterà per confermare la disponibilità.</p>
                <button onClick={closeBooking}
                  style={{ padding: '10px 28px', background: primary, color: '#fff', border: 'none', borderRadius: radius, cursor: 'pointer', fontWeight: 600 }}>
                  Chiudi
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: textColor }}>{booking.name}</h3>
                {booking.dates && (
                  <p style={{ margin: '0 0 16px', color: subText, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays size={13} strokeWidth={1.5} color={primary} />{booking.dates}
                  </p>
                )}

                <label style={lblStyle(subText)}>Numero di persone</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <button type="button" onClick={() => setPersons(p => Math.max(1, p - 1))}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>−</button>
                  <span style={{ fontSize: 22, fontWeight: 700, color: textColor, minWidth: 24, textAlign: 'center' }}>{persons}</span>
                  <button type="button" onClick={() => setPersons(p => p + 1)}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${inputBorder}`, background: inputBg, color: textColor, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>+</button>
                  {booking.price != null && (
                    <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: primary }}>
                      Totale: €{(booking.price * persons).toFixed(0)}
                    </span>
                  )}
                </div>

                <label style={lblStyle(subText)}>Note (opzionale)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Eventuali richieste speciali, intolleranze alimentari…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: radius / 2 || 6, border: `1px solid ${inputBorder}`, fontSize: 14, marginBottom: 14, boxSizing: 'border-box', background: inputBg, color: textColor, resize: 'none' }} />

                {bookState === 'error' && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>Errore nell'invio. Riprova.</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeBooking}
                    style={{ flex: 1, padding: '12px', background: isDark ? '#333' : '#f0f0f0', color: textColor, border: 'none', borderRadius: radius, cursor: 'pointer', fontSize: 14 }}>
                    Annulla
                  </button>
                  <button onClick={sendBooking} disabled={bookState === 'loading'}
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

function ExcursionCard({ exc, primary, textColor, subText, cardBg, cardShadow, radius, onBook }) {
  const includesList = exc.includes
    ? exc.includes.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div style={{ background: cardBg, borderRadius: radius, boxShadow: cardShadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Photo */}
        {exc.photo_url && (
          <img src={exc.photo_url} alt={exc.name}
            style={{ width: 110, flexShrink: 0, objectFit: 'cover', display: 'block' }} />
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: textColor, lineHeight: 1.3 }}>{exc.name}</div>
            {exc.price != null && (
              <div style={{ fontSize: 18, fontWeight: 700, color: primary, flexShrink: 0 }}>€{exc.price}</div>
            )}
          </div>

          {exc.duration && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} strokeWidth={1.5} color={primary} />{exc.duration}
            </div>
          )}
          {exc.meeting_point && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} strokeWidth={1.5} color={primary} />{exc.meeting_point}
            </div>
          )}
          {exc.dates && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={12} strokeWidth={1.5} color={primary} />{exc.dates}
            </div>
          )}

          {exc.seats != null && (
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: `${primary}18`, color: primary, marginBottom: 6 }}>
              Posti disponibili: {exc.seats}
            </span>
          )}
        </div>
      </div>

      {/* Description + includes + button */}
      {(exc.description || includesList.length > 0) && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${exc.photo_url ? 'transparent' : '#f0f0f0'}` }}>
          {exc.description && (
            <p style={{ margin: '10px 0 8px', fontSize: 13, color: subText, lineHeight: 1.6 }}>{exc.description}</p>
          )}
          {includesList.length > 0 && (
            <ul style={{ margin: '0 0 12px', paddingLeft: 16, fontSize: 12, color: subText, lineHeight: 1.8 }}>
              {includesList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
        </div>
      )}

      <div style={{ padding: '0 16px 14px' }}>
        <button type="button" onClick={onBook}
          style={{ width: '100%', padding: '10px', background: primary, color: '#fff', border: 'none', borderRadius: radius / 2 || 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Prenota
        </button>
      </div>
    </div>
  )
}

const lblStyle = subText => ({ display: 'block', fontSize: 12, fontWeight: 600, color: subText, marginBottom: 6 })
