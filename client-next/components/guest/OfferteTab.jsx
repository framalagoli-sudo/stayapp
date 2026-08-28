'use client'
import { useState } from 'react'
import { MapPin, Clock, CalendarDays, CheckCircle } from 'lucide-react'
import { guestFetch } from '@/lib/api'

// Stile dei campi di testo: uno solo, invece di ripeterlo a ogni input.
const campoStyle = (radius, bordo, sfondo, testo) => ({
  width: '100%', padding: '10px 12px', borderRadius: radius / 2 || 6,
  border: `1px solid ${bordo}`, fontSize: 14, marginBottom: 12,
  boxSizing: 'border-box', background: sfondo, color: testo,
})

// Tutto quello che il cliente propone, in una scheda sola.
//
// Prima erano **due schede fisse**, «Attività» ed «Escursioni», con due editor
// dedicati nel pannello. Erano parole del mondo alberghiero, da cui OltreNova è
// nata: una palestra fa corsi, un'agenzia viaggi, un negozio degustazioni.
//
// Ora c'è una scheda sola e a raggruppare sono le **categorie che scrive il
// cliente**. Così la domanda «come chiamiamo questa sezione» non ha più bisogno
// di una risposta nostra: la risposta è come la chiama lui.
export default function OfferteTab({ offerte = [], propertyId, numeroWhatsapp = null, primary, textColor, subText, isDark, radius }) {
  const [booking,   setBooking]   = useState(null)
  const [bookState, setBookState] = useState('idle')
  const [persons,   setPersons]   = useState(1)
  const [notes,     setNotes]     = useState('')
  const [nome,      setNome]      = useState('')
  const [contatto,  setContatto]  = useState('')
  const [privacyOk, setPrivacyOk] = useState(false)
  const [erroreTesto, setErroreTesto] = useState('')

  const cardBg     = isDark ? '#2a2a3e' : '#fff'
  const cardShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.07)'
  const inputBg    = isDark ? '#1a1a2e' : '#f8f8f8'
  const inputBorder= isDark ? '#3a3a5e' : '#ddd'

  // Le offerte raccontate nella forma che la scheda già conosce: si cambia da
  // dove arriva il dato, non come si mostra.
  const active = offerte.map(o => ({
    id: o.id,
    name: o.titolo,
    description: o.descrizione || '',
    // Il prezzo si può nascondere o scrivere a parole: una cena alla carta non
    // è «Gratis».
    price: o.mostra_prezzo === false ? null : (Number(o.prezzo) || 0),
    prezzo_testo: o.prezzo_testo || null,
    photo_url: o.cover_url || '',
    meeting_point: o.luogo || '',
    dates: o.data_inizio ? new Date(o.data_inizio).toLocaleDateString('it-IT') : '',
    // `rimasti` arriva già calcolato: null vuol dire senza limite, che è
    // diverso da zero.
    seats: o.rimasti,
    esaurita: o.rimasti !== null && o.rimasti <= 0,
    categoria: (o.categoria || '').trim(),
    condizioni: o.cta_condizioni || '',
    etichettaPulsante: o.cta_label || '',
  }))

  // I gruppi nell'ordine in cui il cliente li ha creati. Quelle senza categoria
  // finiscono in fondo, senza intestazione: inventargliene una sarebbe mettergli
  // in bocca una parola che non ha scelto.
  const gruppi = []
  for (const x of active) {
    const chiave = x.categoria || ''
    let g = gruppi.find(y => y.nome === chiave)
    if (!g) { g = { nome: chiave, voci: [] }; gruppi.push(g) }
    g.voci.push(x)
  }
  gruppi.sort((a, b) => (a.nome ? 0 : 1) - (b.nome ? 0 : 1))

  // Il pulsante si accende solo quando c'è tutto: il server rifiuterebbe
  // comunque, ma è meglio non far scrivere una richiesta per poi respingerla.
  const pronto = nome.trim() && contatto.trim() && privacyOk

  async function sendBooking(canale) {
    setBookState('loading'); setErroreTesto('')
    const testo = `${booking.name}${booking.dates ? ` — ${booking.dates}` : ''} — ${persons} person${persons === 1 ? 'a' : 'e'}${notes.trim() ? `\nNote: ${notes.trim()}` : ''}`
    try {
      // Va in `prenotazioni`, non in `requests`: una prenotazione non è un
      // messaggio, e distinguerle dal prefisso del testo si è già rotto due
      // volte in silenzio. `booking.id` è l'id dell'offerta.
      await guestFetch('/api/guest/prenota', {
        method: 'POST',
        body: JSON.stringify({
          offerta_id: booking.id,
          nome: nome.trim(), contatto: contatto.trim(),
          n_persone: persons,
          messaggio: notes.trim() || null,
          privacy_accettata: privacyOk, canale: canale || 'email',
        }),
      })
      // La richiesta è registrata: da qui in poi il titolare ce l'ha comunque,
      // anche se la chat si apre e non parte nessun messaggio.
      if (canale === 'whatsapp' && numeroWhatsapp) {
        const messaggio = `${testo}\n\nNome: ${nome.trim()}\nContatto: ${contatto.trim()}`
        // encodeURIComponent, o un apostrofo o un a capo rompono il link.
        window.open(`https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(messaggio)}`, '_blank', 'noopener')
      }
      setBookState('success')
    } catch (e) {
      setErroreTesto(e?.message || '')
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
    return <p style={{ textAlign: 'center', color: subText, marginTop: 32 }}>Nessuna proposta al momento.</p>
  }

  return (
    <div>
      {gruppi.map(g => (
        <div key={g.nome || '_'} style={{ marginBottom: 26 }}>
          {g.nome && (
            <h3 style={{ fontSize: 15, fontWeight: 700, color: textColor, margin: '0 0 12px', paddingBottom: 8, borderBottom: `2px solid ${primary}22`, overflowWrap: 'anywhere' }}>
              {g.nome}
            </h3>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
            {g.voci.map(exc => (
              <ExcursionCard key={exc.id} exc={exc} primary={primary} textColor={textColor} subText={subText}
                cardBg={cardBg} cardShadow={cardShadow} radius={radius} onBook={() => openBooking(exc)} />
            ))}
          </div>
        </div>
      ))}

      {/* Booking bottom sheet */}
      {booking && (
        <div onClick={closeBooking}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: cardBg, borderRadius: `${radius}px ${radius}px 0 0`, padding: 24, width: '100%', maxWidth: 430, boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto' }}>

            {bookState === 'success' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle size={44} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} style={{ marginBottom: 8 }} />
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
                    <CalendarDays size={13} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} />{booking.dates}
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

                {/* Chi prenota lascia il proprio nome e un recapito. Prima non
                    veniva chiesto niente: il titolare riceveva una richiesta e
                    non poteva richiamare nessuno. */}
                <label style={lblStyle(subText)}>Il tuo nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome e cognome"
                  style={campoStyle(radius, inputBorder, inputBg, textColor)} />

                <label style={lblStyle(subText)}>Email o telefono *</label>
                <input value={contatto} onChange={e => setContatto(e.target.value)} placeholder="Per poterti rispondere"
                  style={campoStyle(radius, inputBorder, inputBg, textColor)} />

                <label style={lblStyle(subText)}>Note (opzionale)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Eventuali richieste speciali, intolleranze alimentari…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: radius / 2 || 6, border: `1px solid ${inputBorder}`, fontSize: 14, marginBottom: 14, boxSizing: 'border-box', background: inputBg, color: textColor, resize: 'none' }} />

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, cursor: 'pointer', fontSize: 12.5, color: subText, lineHeight: 1.5 }}>
                  <input type="checkbox" checked={privacyOk} onChange={e => setPrivacyOk(e.target.checked)}
                    style={{ marginTop: 2, accentColor: primary, flexShrink: 0 }} />
                  <span>Ho letto e accetto l’informativa sulla privacy. I miei dati saranno usati per gestire questa richiesta.</span>
                </label>

                {bookState === 'error' && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{erroreTesto || 'Errore nell\'invio. Riprova.'}</p>}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={closeBooking}
                    style={{ flex: '1 1 100px', padding: '12px', background: isDark ? '#333' : '#f0f0f0', color: textColor, border: 'none', borderRadius: radius, cursor: 'pointer', fontSize: 14 }}>
                    Annulla
                  </button>
                  <button onClick={() => sendBooking('email')} disabled={bookState === 'loading' || !pronto}
                    style={{ flex: '2 1 140px', padding: '12px', background: pronto ? primary : '#bbb', color: '#fff', border: 'none', borderRadius: radius, cursor: pronto ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>
                    {bookState === 'loading' ? 'Invio…' : 'Invia richiesta'}
                  </button>
                </div>

                {/* Il secondo canale, se il titolare ha un numero. La richiesta
                    viene registrata comunque: WhatsApp è dove continua la
                    conversazione, non l'unico posto dove esiste. */}
                {numeroWhatsapp && (
                  <button onClick={() => sendBooking('whatsapp')} disabled={bookState === 'loading' || !pronto}
                    style={{ width: '100%', marginTop: 10, padding: '12px', background: pronto ? '#25D366' : '#bbb', color: '#fff', border: 'none', borderRadius: radius, cursor: pronto ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>
                    Scrivi su WhatsApp
                  </button>
                )}
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
            <div style={{ fontWeight: 700, fontSize: 15, color: textColor, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{exc.name}</div>
            {/* Il prezzo si può nascondere (`price` null) o scrivere a parole:
                una cena alla carta non è «Gratis». */}
            {exc.prezzo_testo
              ? <div style={{ fontSize: 15, fontWeight: 700, color: primary, flexShrink: 0, overflowWrap: 'anywhere' }}>{exc.prezzo_testo}</div>
              : exc.price != null && exc.price > 0
                ? <div style={{ fontSize: 18, fontWeight: 700, color: primary, flexShrink: 0 }}>€{exc.price}</div>
                : null}
          </div>

          {exc.duration && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} />{exc.duration}
            </div>
          )}
          {exc.meeting_point && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} />{exc.meeting_point}
            </div>
          )}
          {exc.dates && (
            <div style={{ fontSize: 12, color: subText, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={12} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} />{exc.dates}
            </div>
          )}

          {/* «Esaurito» non è «zero posti»: è un'informazione diversa, e chi
              guarda deve capire subito che non serve nemmeno provare. */}
          {exc.esaurita ? (
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fdeeee', color: '#c53030', marginBottom: 6 }}>
              Esaurito
            </span>
          ) : exc.seats != null && (
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
