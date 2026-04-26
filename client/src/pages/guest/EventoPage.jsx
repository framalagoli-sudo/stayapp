import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowLeft, Check } from 'lucide-react'
import { apiFetch } from '../../lib/api'

export default function EventoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento,     setEvento]     = useState(null)
  const [error,      setError]      = useState(null)
  const [pkgId,      setPkgId]      = useState('')
  const [seats,      setSeats]      = useState(1)
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [booking,    setBooking]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [bookErr,    setBookErr]    = useState('')

  useEffect(() => {
    apiFetch(`/api/guest/eventi/${id}`)
      .then(ev => { setEvento(ev); if (ev.packages?.length === 1) setPkgId(ev.packages[0].id) })
      .catch(() => setError('Evento non trovato.'))
  }, [id])

  async function handleBook() {
    if (!guestName.trim()) { setBookErr('Inserisci il tuo nome'); return }
    if (!guestEmail.trim()) { setBookErr('Inserisci la tua email'); return }
    setBooking(true); setBookErr('')
    try {
      await apiFetch(`/api/guest/eventi/${id}/book`, {
        method: 'POST',
        body: JSON.stringify({ guest_name: guestName, guest_email: guestEmail,
          guest_phone: guestPhone || null, package_id: pkgId || null, seats }),
      })
      setDone(true)
    } catch (e) { setBookErr(e.message) }
    finally { setBooking(false) }
  }

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <p style={{ color: '#e53e3e', fontSize: 16 }}>{error}</p>
      <button onClick={() => navigate(-1)} style={backBtnStyle}>← Torna indietro</button>
    </div>
  )

  if (!evento) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#888' }}>
      Caricamento…
    </div>
  )

  const selectedPkg = (evento.packages || []).find(p => p.id === pkgId)
  const price = selectedPkg ? selectedPkg.price : (evento.price || 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9fb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Back bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a1a2e', padding: 0 }}>
          <ArrowLeft size={18} strokeWidth={1.5} /> Indietro
        </button>
      </div>

      {/* Cover */}
      {evento.cover_url && (
        <div style={{ height: 320, overflow: 'hidden' }}>
          <img src={evento.cover_url} alt={evento.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: '#1a1a2e', marginBottom: 16, lineHeight: 1.2 }}>
          {evento.title}
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555' }}>
            <Calendar size={15} strokeWidth={1.5} color="#00b5b5" /> {fmtDate(evento.date_start)}
          </span>
          {evento.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555' }}>
              <MapPin size={15} strokeWidth={1.5} color="#00b5b5" /> {evento.location}
            </span>
          )}
          {evento.seats_total && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555' }}>
              <Users size={15} strokeWidth={1.5} color="#00b5b5" /> {evento.seats_total - (evento.seats_booked || 0)} posti disponibili
            </span>
          )}
        </div>

        {evento.description && (
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 32 }}>{evento.description}</p>
        )}

        {/* Form prenotazione */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 24 }}>Prenota</h2>

          {(evento.packages || []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 10 }}>Scegli pacchetto</div>
              {evento.packages.map(pkg => (
                <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${pkgId === pkg.id ? '#00b5b5' : '#e0e0e0'}`, marginBottom: 8, cursor: 'pointer', background: pkgId === pkg.id ? '#00b5b510' : 'transparent' }}>
                  <input type="radio" name="pkg" value={pkg.id} checked={pkgId === pkg.id} onChange={() => setPkgId(pkg.id)} style={{ accentColor: '#00b5b5' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{pkg.name}</div>
                    {pkg.description && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{pkg.description}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: '#00b5b5', fontSize: 16 }}>{pkg.price > 0 ? `€${pkg.price}` : 'Gratis'}</div>
                </label>
              ))}
            </div>
          )}

          <div style={{ fontSize: 28, fontWeight: 800, color: '#00b5b5', marginBottom: 24 }}>
            {price > 0 ? `€${price} / persona` : 'Gratuito'}
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Check size={52} strokeWidth={1.5} color="#00b5b5" style={{ display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e', marginBottom: 6 }}>Prenotazione inviata!</div>
              <div style={{ fontSize: 14, color: '#888' }}>Riceverai una conferma via email.</div>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 14 }}>I tuoi dati</div>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nome e cognome *" style={inp} />
              <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="Email *" type="email" style={inp} />
              <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="Telefono (opzionale)" type="tel" style={inp} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <label style={{ fontSize: 14, color: '#555' }}>Posti:</label>
                <input type="number" min="1" value={seats} onChange={e => setSeats(parseInt(e.target.value) || 1)} style={{ ...inp, width: 80, textAlign: 'center', marginBottom: 0 }} />
              </div>
              {bookErr && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 14 }}>{bookErr}</p>}
              <button onClick={handleBook} disabled={booking}
                style={{ width: '100%', padding: 16, background: '#00b5b5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                {booking ? 'Invio in corso…' : 'Prenota ora'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const inp = { display: 'block', width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 12, fontFamily: 'Inter, system-ui, sans-serif' }
const backBtnStyle = { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }
