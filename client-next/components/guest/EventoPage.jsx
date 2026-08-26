'use client'
import { useEffect, useState } from 'react'
import { prezzoDaMostrare, prezzoPersona } from '@/lib/prezzo-evento'
import { ricco } from '@/lib/testo-ricco'
import LegalInfo from './LegalInfo'
import SiteNav from './SiteNav'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Calendar, MapPin, Users, ArrowLeft, Check } from 'lucide-react'
import { guestFetch } from '@/lib/api'

export default function EventoPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = searchParams.get('_lang') === 'en' ? 'en' : 'it'
  const backUrl = searchParams.get('back')

  // Da dove viene chi guarda, e dove lo si rimanda.
  //
  // `back` è l'indirizzo reale di provenienza — e su un dominio personalizzato
  // è l'unico che porta davvero al sito del cliente. Vale quindi più dello slug,
  // che ricostruirebbe solo l'indirizzo su oltrenova.com. Se manca, si ripiega
  // sui dati dell'entità; se manca anche quella, niente link e nessun danno.
  //
  // ⚠️ `back` arriva dall'URL, quindi da chiunque: si accetta solo se punta a
  // questo stesso sito. Un parametro manomesso non deve poter dirottare chi
  // clicca «Privacy» o «Torna al sito».
  const PREFISSO = { struttura: 's', ristorante: 'r', attivita: 'a' }

  // Siamo sul dominio del cliente? Allora il suo sito è la radice, e ogni
  // indirizzo si costruisce da lì: `/privacy`, non `/r/slug/privacy`.
  function suDominioDelCliente() {
    return typeof window !== 'undefined' && !/(^|\.)oltrenova\.com$/.test(window.location.hostname)
  }

  function baseSito(sito) {
    if (suDominioDelCliente()) return ''
    if (backUrl) {
      try {
        const u = new URL(backUrl, typeof window !== 'undefined' ? window.location.origin : 'https://oltrenova.com')
        if (typeof window === 'undefined' || u.origin === window.location.origin) {
          return u.pathname.replace(/\/+$/, '')
        }
      } catch { /* indirizzo malformato: si passa al ripiego */ }
    }
    if (sito?.slug && PREFISSO[sito.tipo]) return `/${PREFISSO[sito.tipo]}/${sito.slug}`
    return null
  }

  // Dove si torna, in ordine di quanto è probabile che sia giusto: da dove si
  // è arrivati, la cronologia, il sito del cliente. La home di OltreNova è
  // l'ultima spiaggia: a chi guarda l'evento di un ristorante non interessa.
  function goBack() {
    if (backUrl) { router.push(backUrl); return }
    if (typeof window !== 'undefined' && window.history.length > 1) { router.back(); return }
    const casa = baseSito(evento?.sito || null)
    router.push(casa || '/')
  }
  const [evento,     setEvento]     = useState(null)
  const [error,      setError]      = useState(null)
  const [pkgId,      setPkgId]      = useState('')
  const [seats,      setSeats]      = useState(1)
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [privacyOk,  setPrivacyOk]  = useState(false)
  const [booking,    setBooking]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [emailSent,  setEmailSent]  = useState(false)
  const [bookErr,    setBookErr]    = useState('')

  useEffect(() => {
    guestFetch(`/api/guest/eventi/${id}?lang=${lang}`)
      .then(ev => { setEvento(ev); if (ev.packages?.length === 1) setPkgId(ev.packages[0].id) })
      .catch(() => setError('Evento non trovato.'))
  }, [id, lang])

  async function handleBook() {
    if (!guestName.trim()) { setBookErr('Inserisci il tuo nome'); return }
    if (!guestEmail.trim()) { setBookErr('Inserisci la tua email'); return }
    setBooking(true); setBookErr('')
    try {
      const res = await guestFetch(`/api/guest/eventi/${id}/book`, {
        method: 'POST',
        body: JSON.stringify({ privacy_accettata: privacyOk, guest_name: guestName, guest_email: guestEmail,
          guest_phone: guestPhone || null, package_id: pkgId || null, seats }),
      })
      setEmailSent(!!res?.guest_confirmation_sent)
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
      <button onClick={goBack} style={backBtnStyle}>← Torna indietro</button>
    </div>
  )

  if (!evento) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#888' }}>
      Caricamento…
    </div>
  )

  const selectedPkg = (evento.packages || []).find(p => p.id === pkgId)
  const price = selectedPkg ? selectedPkg.price : (evento.price || 0)

  const sito       = evento.sito || null
  // Su un dominio del cliente i link del menu devono restare sul suo dominio,
  // non rimandare a oltrenova.com: SiteNav lo sa fare, basta dirglielo.
  const dominioCustom = suDominioDelCliente() ? window.location.hostname : null
  const sitoHome   = baseSito(sito)
  // ⚠️ Il confronto è con `null`, non con «vuoto»: sul dominio del cliente la
  // base È la stringa vuota, e con un controllo di verità i link sparirebbero
  // proprio lì — cioè sui siti che ai clienti interessano di più.
  const privacyUrl = sitoHome === null ? null : `${sitoHome}/privacy`
  const cookieUrl  = sitoHome === null ? null : `${sitoHome}/cookie`
  const tornaAlSito = sitoHome === null ? null : (sitoHome || '/')

  return (
    // L'intestazione del sito è fissata in cima allo schermo, quindi non occupa
    // spazio nel flusso: senza questo margine coprirebbe la locandina. Sta sul
    // contenitore e non su uno spaziatore fra i due, perché così non dipende
    // dall'ordine degli elementi — che è come mi si era rotto la prima volta.
    <div style={{ minHeight: '100vh', background: '#f9f9fb', fontFamily: 'Inter, system-ui, sans-serif',
      paddingTop: sito?.name ? 64 : 0 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* L'intestazione del sito del cliente, la stessa delle sue altre pagine.
          Prima c'era solo un «Indietro»: la pagina di un evento sembrava staccata
          da tutto, e chi ci arrivava da un social non capiva di chi fosse. */}
      {sito?.name ? (
        <SiteNav
          entity={{ name: sito.name, slug: sito.slug, logo_url: sito.logo_url, logo_dark_url: sito.logo_dark_url }}
          mini={{ header_cfg: sito.header_cfg, logo_size: sito.logo_size }}
          pagine={sito.pagine || []}
          prefix={PREFISSO[sito.tipo] || 's'}
          primary={sito.theme?.primaryColor || '#00b5b5'}
          secondary={sito.theme?.secondaryColor}
          heading={sito.theme?.fontHeading}
          lang={lang}
          domain={dominioCustom}
        />
      ) : (
        // Un evento aziendale non è appeso a nessun sito: resta il ritorno semplice.
        <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center' }}>
          <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a1a2e', padding: 0 }}>
            <ArrowLeft size={18} strokeWidth={1.5} /> Indietro
          </button>
        </div>
      )}

      {/* Copertina: la locandina intera, su un fondo fatto con la locandina stessa.
          Prima l'immagine veniva ritagliata a piena larghezza — e una locandina
          verticale ci perdeva la testa o i piedi. Ora si vede tutta, larga quanto
          il testo che sta sotto, e dietro la stessa foto sfocata riempie il resto
          senza lasciare due bande vuote ai lati. */}
      {evento.cover_url && (
        <div style={{ position: 'relative', overflow: 'hidden', background: '#1a1a2e' }}>
          <img src={evento.cover_url} alt="" aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              objectPosition: evento.cover_focal || 'center',
              filter: 'blur(36px) saturate(1.25)', transform: 'scale(1.15)', opacity: 0.55 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,20,35,0.35) 0%, rgba(20,20,35,0.55) 100%)' }} />
          <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
            {/* Nessun rapporto forzato e nessun ritaglio: la locandina si vede
                **com'è stata caricata**. Il formato scelto nel pannello decide
                la forma della scheda nell'elenco, dove il ritaglio è inevitabile
                perché le schede devono stare in fila — qui c'è tutto lo spazio,
                e tagliare una locandina significa perderne un pezzo. */}
            <img src={evento.cover_url} alt={evento.title}
              style={{ display: 'block', width: 'auto', height: 'auto',
                maxWidth: '100%', maxHeight: '78vh', margin: '0 auto',
                borderRadius: 14, boxShadow: '0 18px 50px -12px rgba(0,0,0,0.55)' }} />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Il ritorno esplicito. Il logo dell'intestazione porta alla home, ma
            è un gesto che si impara — qui serve una via d'uscita che si legge. */}
        <button onClick={goBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#666', padding: 0, marginBottom: 18 }}>
          <ArrowLeft size={17} strokeWidth={1.5} /> {sito?.name ? `Torna a ${sito.name}` : 'Indietro'}
        </button>

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
            {prezzoPersona(evento, selectedPkg ? selectedPkg.price : null) || ''}
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Check size={52} strokeWidth={1.5} color="#00b5b5" style={{ display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e', marginBottom: 6 }}>Prenotazione inviata!</div>
              <div style={{ fontSize: 14, color: '#888' }}>{emailSent ? 'Ti abbiamo spedito una mail di conferma.' : 'La tua prenotazione è stata registrata.'}</div>
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
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                <input type="checkbox" checked={privacyOk} onChange={e => setPrivacyOk(e.target.checked)} required
                  style={{ marginTop: 2, accentColor: '#00b5b5', flexShrink: 0 }} />
                <span>
                  Ho letto e accetto{' '}
                  {privacyUrl
                    ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00b5b5', fontWeight: 600 }}>l’informativa sulla privacy</a>
                    : <strong>l’informativa sulla privacy</strong>}.
                  {' '}I miei dati saranno usati per gestire questa prenotazione.
                </span>
              </label>

              {bookErr && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 14 }}>{bookErr}</p>}
              <button onClick={handleBook} disabled={booking || !privacyOk}
                style={{ width: '100%', padding: 16, background: privacyOk ? '#00b5b5' : '#ccc', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: privacyOk ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                {booking ? 'Invio in corso…' : (evento.cta_label || 'Prenota ora')}
              </button>

              {/* Quello che chi prenota deve sapere prima di premere: caparra,
                  disdetta, cosa è incluso. Lo scrive il cliente, e resta sotto
                  il pulsante perché è lì che lo si legge davvero. */}
              {evento.cta_condizioni && (
                <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5, color: '#777', lineHeight: 1.6, textAlign: 'center', whiteSpace: 'pre-line' }}
                  {...ricco(evento.cta_condizioni)} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Il piede di pagina.
          Fin qui l'unica via d'uscita era il «Indietro» in cima: chi arrivava
          da un social e scorreva fino in fondo restava in un vicolo cieco, senza
          sapere nemmeno di chi fosse la pagina. E per un sito d'impresa i dati
          del titolare e il link alla privacy non sono una rifinitura: li chiede
          la legge. */}
      <footer style={{ background: '#1a1a2e', color: 'rgba(255,255,255,0.7)', marginTop: 48, padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          {sito?.logo_dark_url || sito?.logo_url ? (
            <img src={sito.logo_dark_url || sito.logo_url} alt={sito.name || ''}
              style={{ maxHeight: 46, maxWidth: 190, objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
          ) : sito?.name ? (
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{sito.name}</div>
          ) : null}

          {tornaAlSito && (
            <a href={tornaAlSito}
              style={{ display: 'inline-block', padding: '11px 26px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.28)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
              {sito?.name ? `Torna a ${sito.name}` : 'Torna al sito'}
            </a>
          )}

          {(privacyUrl || cookieUrl) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13, marginBottom: 18 }}>
              {privacyUrl && <a href={privacyUrl} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Privacy</a>}
              {cookieUrl && <a href={cookieUrl} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Cookie</a>}
            </div>
          )}

          <LegalInfo azienda={sito?.azienda_legale} style={{ marginBottom: 10 }} />

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()}{sito?.name ? ` ${sito.name}` : ''}
          </div>
        </div>
      </footer>
    </div>
  )
}

const inp = { display: 'block', width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 12, fontFamily: 'Inter, system-ui, sans-serif' }
const backBtnStyle = { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }
