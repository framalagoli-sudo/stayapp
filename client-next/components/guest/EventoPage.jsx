'use client'
import { useEffect, useState } from 'react'
import { prezzoDaMostrare, prezzoPersona } from '@/lib/prezzo-evento'
import { eventoConcluso } from '@/lib/evento-concluso'
import { oraLocale } from '@/lib/fuso'
import { ricco } from '@/lib/testo-ricco'
import LegalInfo from './LegalInfo'
import SiteNav from './SiteNav'
import CampoPosti, { numeroPosti } from './CampoPosti'
import { testiEvento } from './evento-testi'
import RiepilogoPrenotazione from './RiepilogoPrenotazione'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Calendar, MapPin, Users, ArrowLeft, Check } from 'lucide-react'
import { guestFetch } from '@/lib/api'
import { percorsoInterno } from '@/lib/percorso-interno'

export default function EventoPage({ iniziale = null, dominioCliente = null, lingua = 'it' }) {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  // La lingua la dice il server. `_lang` lo aggiunge il middleware solo nella
  // riscrittura interna: nel browser l'indirizzo è `/en/eventi/…` senza
  // parametro, quindi leggerlo da qui disegnava in italiano una pagina servita
  // in inglese — etichette mescolate ed errore di hydration (#418).
  const lang = lingua === 'en' ? 'en' : 'it'
  const T = testiEvento(lang)
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
  //
  // ⚠️ Lo dice il SERVER (`dominioCliente`, letto dall'header Host), non
  // `window`: sul server `window` non esiste, quindi gli href uscivano diversi
  // da quelli del browser e React dava un errore di hydration (#418).
  function suDominioDelCliente() {
    return !!dominioCliente
  }

  function baseSito(sito) {
    if (suDominioDelCliente()) return ''
    const back = percorsoInterno(backUrl)
    if (back) return back.split(/[?#]/)[0].replace(/\/+$/, '')
    if (sito?.slug && PREFISSO[sito.tipo]) return `/${PREFISSO[sito.tipo]}/${sito.slug}`
    return null
  }

  // Dove si torna, in ordine di quanto è probabile che sia giusto: da dove si
  // è arrivati, la cronologia, il sito del cliente. La home di OltreNova è
  // l'ultima spiaggia: a chi guarda l'evento di un ristorante non interessa.
  function goBack() {
    const back = percorsoInterno(backUrl)
    if (back) { router.push(back); return }
    if (typeof window !== 'undefined' && window.history.length > 1) { router.back(); return }
    const casa = baseSito(evento?.sito || null)
    router.push(casa || '/')
  }
  const [evento,     setEvento]     = useState(iniziale)
  const [error,      setError]      = useState(null)
  const [pkgId,      setPkgId]      = useState('')
  // Testo, non numero: il campo deve poter restare vuoto mentre si scrive.
  const [seats,      setSeats]      = useState('1')
  // Il riepilogo da leggere prima di andare a pagare (null = non ancora chiesto).
  const [riepilogo,  setRiepilogo]  = useState(null)
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [privacyOk,  setPrivacyOk]  = useState(false)
  const [notes,      setNotes]      = useState('')
  const [booking,    setBooking]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [emailSent,  setEmailSent]  = useState(false)
  const [bookErr,    setBookErr]    = useState('')
  // La lista d'attesa riusa gli stessi campi del modulo di prenotazione: chi
  // arriva qui compila nome, email e quante persone, e non deve imparare un
  // secondo modulo per dire la stessa cosa.
  const [inLista,    setInLista]    = useState(false)

  useEffect(() => {
    // Il primo caricamento arriva dal SERVER: i dati sono già nell'HTML, ed è
    // quello che leggono i motori di ricerca. Si richiedono solo se non ci
    // sono (vecchi link montati altrove) o se si cambia lingua.
    if (iniziale && lang === (iniziale.lingua || 'it')) {
      if (iniziale.packages?.length === 1) setPkgId(iniziale.packages[0].id)
      return
    }
    guestFetch(`/api/guest/eventi/${id}?lang=${lang}`)
      .then(ev => { setEvento(ev); if (ev.packages?.length === 1) setPkgId(ev.packages[0].id) })
      .catch(() => setError(T.nonTrovato))
  }, [id, lang, iniziale])

  async function handleAttesa() {
    setBookErr('')
    if (!guestName.trim() || !guestEmail.trim()) { setBookErr(T.erNomeEmail); return }
    if (!privacyOk) { setBookErr(T.erConsenso); return }
    const posti = numeroPosti(seats)
    if (!posti) { setBookErr(T.erQuante); return }
    setBooking(true)
    try {
      // Come sopra: la lista d'attesa lavora per id, non per indirizzo.
      const res = await guestFetch(`/api/guest/eventi/${evento.id}/lista-attesa`, {
        method: 'POST',
        body: JSON.stringify({
          guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone,
          seats: posti, privacy_accettata: privacyOk,
        }),
      })
      if (res.error) throw new Error(res.error)
      setInLista(true)
    } catch (e) { setBookErr(e.message || T.erRiprova) }
    setBooking(false)
  }

  async function handleBook() {
    if (!guestName.trim()) { setBookErr(T.erNome); return }
    if (!guestEmail.trim()) { setBookErr(T.erEmail); return }
    // Lo stesso controllo c'è nella route: qui si evita solo il giro inutile.
    if (telefonoServe && !guestPhone.trim()) { setBookErr(T.erTelefono); return }
    const posti = numeroPosti(seats)
    if (!posti) { setBookErr(T.erQuantePrenota); return }
    setBooking(true); setBookErr('')
    try {
      // ⚠️ Se c'è da pagare, prima si dice cosa sta per succedere — e i posti
      // NON si prendono ancora. Chi arrivava alla cassa senza aspettarsela la
      // chiudeva, e i posti restavano tenuti mezz'ora per nessuno. Il secondo
      // giro (riepilogo già a schermo) è la conferma: da lì si prenota davvero.
      if (!riepilogo) {
        const conti = await guestFetch(`/api/guest/eventi/${evento.id}/riepilogo`, {
          method: 'POST', body: JSON.stringify({ package_id: pkgId || null, seats: posti }),
        })
        if (conti?.da_pagare > 0) { setRiepilogo(conti); return }
      }
      // ⚠️ Si prenota sull'**id** dell'evento, non su quello che c'è nell'URL:
      // l'indirizzo può essere uno slug, e le route che scrivono lavorano per id.
      const res = await guestFetch(`/api/guest/eventi/${evento.id}/book`, {
        method: 'POST',
        body: JSON.stringify({ privacy_accettata: privacyOk, guest_name: guestName, guest_email: guestEmail,
          guest_phone: guestPhone || null, package_id: pkgId || null, seats: posti, notes: notes.trim() || null }),
      })
      // Se c'è da pagare si va subito alla cassa: il posto è tenuto, e torna
      // libero se il pagamento non arriva.
      if (res?.pagamento?.url) { window.location.href = res.pagamento.url; return }
      setEmailSent(!!res?.guest_confirmation_sent)
      setDone(true)
    } catch (e) {
      setBookErr(e.message)
      // ⛔ Se i posti sono finiti mentre si compilava, restava il modulo con
      // una riga rossa: si riprovava e si ribeccava lo stesso errore. Ora la
      // pagina si aggiorna e mostra quello che c'è davvero — «tutto esaurito»
      // e, se c'è, la lista d'attesa.
      if (e.posti_liberi === 0) {
        guestFetch(`/api/guest/eventi/${evento.id}?lang=${lang}`)
          .then(ev => setEvento(ev))
          .catch(() => {})
      }
    }
    finally { setBooking(false) }
  }

  // L'ora dell'evento è quella del posto dove si svolge: chi guarda da un
  // altro fuso deve leggere l'ora a cui deve presentarsi, non la propria.
  function fmtDate(iso) {
    return oraLocale(iso, evento?.fuso, {
      day: '2-digit', month: 'long', year: 'numeric',
      locale: lang === 'en' ? 'en-GB' : 'it-IT',
    }) || '—'
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <p style={{ color: '#e53e3e', fontSize: 16 }}>{error}</p>
      <button onClick={goBack} style={backBtnStyle}>{T.tornaIndietro}</button>
    </div>
  )

  if (!evento) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#888' }}>
      {T.caricamento}
    </div>
  )

  // Il telefono è facoltativo, a meno che chi organizza non l'abbia
  // richiesto: per una cena bisogna poter richiamare, per un evento online no.
  const telefonoServe = evento.telefono_obbligatorio === true
  const selectedPkg = (evento.packages || []).find(p => p.id === pkgId)
  const price = selectedPkg ? selectedPkg.price : (evento.price || 0)

  // Non si può più prenotare per due motivi diversi: perché l'ha deciso il
  // titolare, o perché i posti sono finiti. Il modulo si chiude in entrambi i
  // casi, ma il messaggio non è lo stesso — e la differenza la sente chi legge.
  // Al netto dei posti tenuti per il telefono: il sito vende solo i suoi.
  // Il server manda già i posti prenotabili online (null = senza limite).
  const rimasti = evento.posti_online ?? null
  const chiuso = !!evento.prenotazioni_chiuse || (rimasti !== null && rimasti <= 0)
  // Un evento finito resta visibile — il sito lo mostra fra i passati, e i
  // vecchi link continuano a portare qui — ma non si prenota più.
  const concluso = eventoConcluso(evento)

  const sito       = evento.sito || null
  // Su un dominio del cliente i link del menu devono restare sul suo dominio,
  // non rimandare a oltrenova.com: SiteNav lo sa fare, basta dirglielo.
  const dominioCustom = dominioCliente
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
          <ArrowLeft size={17} strokeWidth={1.5} /> {sito?.name ? T.tornaA(sito.name) : T.indietro}
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
          {/* ⚠️ «0 posti disponibili» è un modo goffo di dire «esaurito», e
              «-2 posti» — che poteva succedere — è un modo di sembrare rotti. */}
          {rimasti !== null && !concluso && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555' }}>
              <Users size={15} strokeWidth={1.5} color="#00b5b5" />
              {rimasti > 0 ? T.postiDisponibili(rimasti) : T.esaurito}
            </span>
          )}
        </div>

        {/* ⛔ Era «tutto appiccicato»: il testo finiva in un `<p>` e in HTML gli
            a-capo non esistono, quindi tre paragrafi diventavano un muro unico.
            `pre-wrap` rispetta gli invii che il cliente ha battuto davvero — che
            è il modo in cui uno scrive — e `ricco` riaccende i pochi tag ammessi
            per chi vuole anche il grassetto. */}
        {evento.description && (
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 32, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            {...ricco(evento.description)} />
        )}

        {/* ⛔ Quando non si può più prenotare, il modulo NON si mostra.
            Restava aperto anche a posti finiti: si compilava nome, email,
            telefono e la spunta privacy, si premeva, e solo allora arrivava
            «posti non disponibili». Con una campagna a pagamento sopra è il
            modo peggiore di spendere un clic — e di trattare una persona.

            Due motivi diversi, due frasi diverse: «il titolare ha chiuso» e
            «i posti sono finiti» non sono la stessa cosa per chi legge. */}
        {concluso ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>{T.concluso}</div>
            <p style={{ fontSize: 15.5, color: '#555', lineHeight: 1.7, margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              {T.giaSvolto}{tornaAlSito !== null && T.prossimi}
            </p>
            {tornaAlSito !== null && (
              <a href={tornaAlSito}
                style={{ display: 'inline-block', marginTop: 20, padding: '12px 26px', borderRadius: 10, background: '#1a1a2e', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                {sito?.name ? T.vaiA(sito.name) : T.vaiAlSito}
              </a>
            )}
          </div>
        ) : chiuso ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <div style={{ textAlign: 'center', marginBottom: evento.lista_attesa && !inLista ? 26 : 0 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>
                {evento.prenotazioni_chiuse ? T.chiuse : T.esaurito}
              </div>
              <p style={{ fontSize: 15.5, color: '#555', lineHeight: 1.7, margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                {evento.prenotazioni_chiuse_testo?.trim()
                  || (evento.prenotazioni_chiuse
                    ? T.nonRaccogliamo
                    : T.postiFiniti)}
              </p>
            </div>

            {/* ⛔ Qui c'era solo il messaggio, e chi lo leggeva se ne andava.
                Il valore della lista d'attesa non è la serata in corso — quella
                è piena — ma la prossima: si parte con l'elenco di chi voleva
                venire e non è entrato. */}
            {evento.lista_attesa && (inLista ? (
              <div style={{ textAlign: 'center', padding: '22px 0 4px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#e8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Check size={26} strokeWidth={2} color="#00b5b5" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a2e', marginBottom: 8 }}>{T.inLista}</div>
                {/* ⚠️ Va detto che NON è una prenotazione: chi lo legge di fretta
                    potrebbe presentarsi convinto di avere un posto. */}
                <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, margin: 0, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                  {T.nonPrenotazione}
                </p>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                <div style={{ fontSize: 16.5, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>{T.avvisiamo}</div>
                <p style={{ fontSize: 14.5, color: '#777', lineHeight: 1.65, marginTop: 0, marginBottom: 18 }}>
                  {T.lasciaContatto}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={T.nome} style={inp} />
                  <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={T.email} style={inp} />
                  <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder={T.telefono} style={inp} />
                  <CampoPosti value={seats} onChange={setSeats} placeholder={T.quante} aria-label={T.quante} style={inp} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#666', cursor: 'pointer', lineHeight: 1.6, marginBottom: 14 }}>
                  <input type="checkbox" checked={privacyOk} onChange={e => setPrivacyOk(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, accentColor: '#00b5b5' }} />
                  <span>
                    {T.hoLetto} {privacyUrl
                      ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00b5b5', fontWeight: 600 }}>{T.informativa}</a>
                      : <strong>{T.informativa}</strong>}. {T.usoAttesa}
                  </span>
                </label>
                {bookErr && <p style={{ margin: '0 0 12px', fontSize: 14, color: '#c0392b' }}>{bookErr}</p>}
                <button onClick={handleAttesa} disabled={booking}
                  style={{ width: '100%', padding: '14px 20px', background: '#1a1a2e', border: 'none', borderRadius: 10, cursor: booking ? 'wait' : 'pointer', fontSize: 15.5, fontWeight: 700, color: '#fff', opacity: booking ? .7 : 1 }}>
                  {booking ? T.unAttimo : T.avvisatemi}
                </button>
              </div>
            ))}
          </div>
        ) : (
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 24 }}>{T.prenota}</h2>

          {(evento.packages || []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 10 }}>{T.scegliPacchetto}</div>
              {evento.packages.map(pkg => (
                <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${pkgId === pkg.id ? '#00b5b5' : '#e0e0e0'}`, marginBottom: 8, cursor: 'pointer', background: pkgId === pkg.id ? '#00b5b510' : 'transparent' }}>
                  <input type="radio" name="pkg" value={pkg.id} checked={pkgId === pkg.id} onChange={() => { setPkgId(pkg.id); setRiepilogo(null) }} style={{ accentColor: '#00b5b5' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{pkg.name}</div>
                    {pkg.description && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{pkg.description}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: '#00b5b5', fontSize: 16 }}>{pkg.price > 0 ? `€${pkg.price}` : T.gratis}</div>
                </label>
              ))}
            </div>
          )}

          <div style={{ fontSize: 28, fontWeight: 800, color: '#00b5b5', marginBottom: 24 }}>
            {prezzoPersona(evento, selectedPkg ? selectedPkg.price : null, { gratuito: T.gratuito, perPersona: T.perPersona }) || ''}
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Check size={52} strokeWidth={1.5} color="#00b5b5" style={{ display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e', marginBottom: 6 }}>{T.inviata}</div>
              <div style={{ fontSize: 14, color: '#888' }}>{emailSent ? T.mailSpedita : T.registrata}</div>
            </div>
          ) : riepilogo ? (
            <RiepilogoPrenotazione riepilogo={riepilogo} titoloEvento={evento.title} quando={fmtDate(evento.date_start)} lang={lang}
              inCorso={booking} errore={bookErr} onConferma={handleBook} onModifica={() => { setRiepilogo(null); setBookErr('') }} />
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 14 }}>{T.tuoiDati}</div>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={T.nome} style={inp} />
              <input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={T.email} type="email" style={inp} />
              <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder={telefonoServe ? T.telefonoServe : T.telefonoFacoltativo} type="tel" style={inp} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <label htmlFor="posti-evento" style={{ fontSize: 14, color: '#555' }}>{T.posti}</label>
                <CampoPosti id="posti-evento" value={seats} onChange={setSeats} style={{ ...inp, width: 80, textAlign: 'center', marginBottom: 0 }} />
              </div>
              {/* Il posto dove salvarle c'era già (colonna `notes`, e l'admin le
                  mostra), mancava solo il campo: chi prenota non aveva modo di
                  dire «sono celiaco» o «arrivo tardi». */}
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
                placeholder={T.note}
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', marginBottom: 24 }} />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                <input type="checkbox" checked={privacyOk} onChange={e => setPrivacyOk(e.target.checked)} required
                  style={{ marginTop: 2, accentColor: '#00b5b5', flexShrink: 0 }} />
                <span>
                  {T.hoLetto}{' '}
                  {privacyUrl
                    ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00b5b5', fontWeight: 600 }}>{T.informativa}</a>
                    : <strong>{T.informativa}</strong>}.
                  {' '}{T.usoPrenotazione}
                </span>
              </label>

              {bookErr && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 14 }}>{bookErr}</p>}
              <button onClick={handleBook} disabled={booking || !privacyOk}
                style={{ width: '100%', padding: 16, background: privacyOk ? '#00b5b5' : '#ccc', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: privacyOk ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                {booking ? T.invio : (evento.cta_label || T.prenotaOra)}
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
        )}
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
              {sito?.name ? T.tornaA(sito.name) : T.tornaAlSito}
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
