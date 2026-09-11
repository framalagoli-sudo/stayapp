'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { Users, Calendar, Mail, Phone, Package, ArrowLeft, Check, X, Clock, Plus, PhoneCall, Send } from 'lucide-react'
import { useAzienda } from '../../../context/AziendaContext'
import { oraLocale } from '../../../lib/fuso'

// Quando è arrivata una prenotazione (`created_at`) si legge nell'ora di chi
// guarda — è un fatto del pannello. L'ora dell'evento no: quella è del posto,
// e passa da `fmtEvento`.
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtEvento(iso, fuso) {
  return oraLocale(iso, fuso, { day: '2-digit', month: 'short', year: 'numeric' }) || '—'
}

// Scrivere a chi ha prenotato: cosa dire, e a chi.
//
// ⛔ Prima c'era solo un pulsante «Manda il promemoria» che partiva verso tutti
// con un testo fisso. Ma il gesto vero è più largo: «ci vediamo domani», «la
// cena è spostata alle 21», «portate una felpa» sono lo stesso invio con tre
// testi diversi — e il secondo non si manda a chi l'ha già saputo al telefono.
//
// ⚠️ Definito FUORI dalla pagina: un componente dichiarato dentro un altro cambia
// identità a ogni render e React smonta i campi mentre ci si scrive (nota 22).
// Qui sarebbe il difetto peggiore: si perde un messaggio già battuto.
function PannelloPromemoria({ prom, inviando, onChiudi, onManda }) {
  const [testo, setTesto] = useState(prom?.testo_predefinito || '')
  // Chi ha un'email e non l'ha ancora ricevuto: la proposta di partenza è quella
  // giusta nel caso normale, e resta modificabile.
  const raggiungibili = (prom?.persone || []).filter(p => !p.senza_email)
  const [scelti, setScelti] = useState(
    () => new Set(raggiungibili.filter(p => !p.gia_avvisato).map(p => p.id)))

  const senzaEmail = (prom?.persone || []).filter(p => p.senza_email)
  const tuttiScelti = raggiungibili.length > 0 && raggiungibili.every(p => scelti.has(p.id))

  function commuta(id) {
    setScelti(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Send size={17} strokeWidth={1.5} color="#2b6cb0" />
        <h3 style={{ margin: 0, fontSize: 16 }}>Scrivi a chi ha prenotato</h3>
        <button onClick={onChiudi} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 13 }}>Chiudi</button>
      </div>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }}>Il messaggio</label>
      <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={4} maxLength={2000}
        placeholder="Ti ricordiamo la tua prenotazione…"
        style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }} />
      <div style={{ fontSize: 12, color: '#999', margin: '5px 0 16px', lineHeight: 1.55 }}>
        Ognuno lo riceve con il suo nome, il titolo dell’evento, la data e il luogo: qui scrivi
        solo cosa vuoi dirgli. Gli a-capo si vedono; &lt;b&gt;grassetto&lt;/b&gt; se serve.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#444', cursor: 'pointer' }}>
          <input type="checkbox" checked={tuttiScelti}
            onChange={e => setScelti(e.target.checked ? new Set(raggiungibili.map(p => p.id)) : new Set())} />
          Seleziona tutti
        </label>
        <span style={{ fontSize: 12.5, color: '#888' }}>
          {scelti.size} {scelti.size === 1 ? 'persona selezionata' : 'persone selezionate'} su {raggiungibili.length}
        </span>
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
        {raggiungibili.map(p => (
          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', fontSize: 13.5 }}>
            <input type="checkbox" checked={scelti.has(p.id)} onChange={() => commuta(p.id)} />
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong>{p.nome}</strong> <span style={{ color: '#999' }}>· {p.email}</span>
            </span>
            <span style={{ flexShrink: 0, fontSize: 12, color: '#888' }}>{p.posti} {p.posti === 1 ? 'posto' : 'posti'}</span>
            {/* ⚠️ Chi l'ha già ricevuto si vede, non sparisce: rimandarglielo è
                una scelta legittima — un cambio di orario si dice a tutti. */}
            {p.gia_avvisato && (
              <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, background: '#edf2f7', color: '#4a5568', borderRadius: 4, padding: '2px 6px' }}>già avvisato</span>
            )}
            {p.stato === 'waitlist' && (
              <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, background: '#ebf4ff', color: '#2b6cb0', borderRadius: 4, padding: '2px 6px' }}>in lista</span>
            )}
          </label>
        ))}
      </div>

      {/* ⛔ Chi ha prenotato al telefono senza lasciare l'email non si può
          avvisare, e va detto: sparire dall'elenco senza spiegazione fa credere
          che il sistema li abbia contati. Vanno chiamati a voce. */}
      {senzaEmail.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#8a6d1f', background: '#fffaf0', border: '1px solid #f6d998', borderRadius: 8, padding: '9px 12px', lineHeight: 1.55 }}>
          {senzaEmail.length === 1 ? 'Una persona ha' : `${senzaEmail.length} persone hanno`} prenotato senza lasciare un’email
          ({senzaEmail.map(p => p.nome).join(', ')}): {senzaEmail.length === 1 ? 'va avvisata' : 'vanno avvisate'} a voce.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => onManda(testo, [...scelti])} disabled={inviando || scelti.size === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: scelti.size ? '#2b6cb0' : '#cbd5e0', border: 'none', borderRadius: 8, cursor: inviando ? 'wait' : scelti.size ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600, color: '#fff' }}>
          <Send size={15} strokeWidth={2} />
          {inviando ? 'Mando…' : scelti.size ? `Manda a ${scelti.size}` : 'Scegli chi avvisare'}
        </button>
        <button onClick={onChiudi} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13.5, cursor: 'pointer' }}>Annulla</button>
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'In attesa',  bg: '#fff3cd', color: '#856404' },
  { value: 'confirmed', label: 'Confermata', bg: '#d4edda', color: '#155724' },
  { value: 'cancelled', label: 'Annullata',  bg: '#f8d7da', color: '#721c24' },
  // ⛔ Chi è in lista d'attesa NON occupa un posto: è il punto della funzione.
  // Confermarlo lo fa diventare una prenotazione vera, e da lì parte la
  // conferma all'ospite — **ma solo se il titolare l'ha accesa.** Se è spenta,
  // promuovere qualcuno non gli dice niente: resta ad aspettare una chiamata
  // già arrivata. L'avviso più sotto lo dichiara invece di lasciarlo scoprire.
  { value: 'waitlist',  label: 'In lista d’attesa', bg: '#ebf4ff', color: '#2b6cb0' },
]

// Segnare al volo una prenotazione arrivata per telefono.
//
// ⚠️ Serve **solo il nome**. Chi telefona mentre il locale è pieno detta un
// nome e riattacca: pretendere l'email trasformerebbe dieci secondi in una
// trattativa, e la prenotazione tornerebbe sul quaderno — che è il posto da cui
// la stiamo togliendo.
//
// ⚠️ Definito fuori dalla pagina: dentro cambierebbe identità a ogni render e
// React smonterebbe i campi mentre ci si scrive.
function ModuloTelefono({ eventoId, liberi, onChiudi, onFatta }) {
  const [dati, setDati] = useState({ guest_name: '', guest_phone: '', guest_email: '', seats: 1, notes: '' })
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState('')
  const campo = (k, v) => setDati(d => ({ ...d, [k]: v }))

  async function salva() {
    if (!dati.guest_name.trim()) { setErrore('Serve almeno il nome'); return }
    setInCorso(true); setErrore('')
    try {
      const creata = await apiFetch(`/api/eventi/${eventoId}/bookings`, {
        method: 'POST', body: JSON.stringify(dati),
      })
      onFatta(creata)
    } catch (e) { setErrore(e.message); setInCorso(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <PhoneCall size={16} strokeWidth={1.5} color="#1a1a2e" />
        <strong style={{ fontSize: 15 }}>Prenotazione presa al telefono</strong>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888', lineHeight: 1.6 }}>
        Basta il nome. Il resto se ce l'hai — telefono ed email servono solo se vuoi poterlo avvisare.
        {liberi !== null && liberi !== undefined && <> Restano <strong>{liberi}</strong> posti.</>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 10 }}>
        <input autoFocus value={dati.guest_name} onChange={e => campo('guest_name', e.target.value)}
          placeholder="Nome di chi ha chiamato *" style={campoStile} />
        <input value={dati.guest_phone} onChange={e => campo('guest_phone', e.target.value)}
          placeholder="Telefono" style={campoStile} />
        <input value={dati.guest_email} onChange={e => campo('guest_email', e.target.value)}
          placeholder="Email" style={campoStile} />
        <input type="number" min="1" value={dati.seats} onChange={e => campo('seats', Math.max(1, Number(e.target.value) || 1))}
          placeholder="Persone" style={campoStile} />
      </div>
      <input value={dati.notes} onChange={e => campo('notes', e.target.value)}
        placeholder="Note (allergie, tavolo, chi lo conosce…)" style={{ ...campoStile, width: '100%', marginBottom: 12 }} />
      {errore && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#c53030' }}>{errore}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={salva} disabled={inCorso}
          style={{ padding: '9px 18px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: inCorso ? 'wait' : 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff', opacity: inCorso ? .7 : 1 }}>
          {inCorso ? 'Salvo…' : 'Segna'}
        </button>
        <button onClick={onChiudi} style={{ padding: '9px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13.5 }}>
          Annulla
        </button>
      </div>
      {/* Va detto: non stiamo raccogliendo una spunta, la sta raccogliendo lui. */}
      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#999', lineHeight: 1.6 }}>
        Registriamo che il consenso ai dati l'hai raccolto tu a voce — non risulta come spunta del cliente,
        perché non l'ha messa nessuno.
      </p>
    </div>
  )
}

const campoStile = { padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

function statusStyle(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

export default function EventoPrenotazioniPage() {
  const { id } = useParams()
  const router = useRouter()
  const { azienda } = useAzienda()
  const [evento, setEvento] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [nuova, setNuova] = useState(false)
  // Quante persone riceverebbero il promemoria: si chiede prima, così chi
  // preme il pulsante sa a quanti sta per scrivere.
  const [prom, setProm] = useState(null)
  const [inviando, setInviando] = useState(false)
  const [pannelloProm, setPannelloProm] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/eventi/${id}`),
      apiFetch(`/api/eventi/${id}/bookings`),
    ]).then(([ev, bk]) => {
      setEvento(ev)
      setBookings(bk)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const caricaPromemoria = useCallback(() => {
    apiFetch(`/api/eventi/${id}/promemoria`).then(setProm).catch(() => setProm(null))
  }, [id])
  useEffect(() => { caricaPromemoria() }, [caricaPromemoria])

  // ⛔ Prima c'era un pulsante che mandava subito a tutti, con un `confirm()` che
  // diceva solo quante persone. Francesco: «dovrebbe essere un pannello con un
  // testo da personalizzare e la lista dei prenotati da checkare». Ha ragione:
  // «ci vediamo domani» e «la cena è spostata alle 21» sono lo stesso gesto con
  // due testi diversi, e la seconda non si manda a chi l'ha già saputo.
  async function mandaPromemoria(testo, destinatari) {
    setInviando(true)
    try {
      const esito = await apiFetch(`/api/eventi/${id}/promemoria`, {
        method: 'POST', body: JSON.stringify({ testo, destinatari }),
      })
      alert(esito.inviati
        ? `Mandato a ${esito.inviati} ${esito.inviati === 1 ? 'persona' : 'persone'}.${esito.falliti ? ` ${esito.falliti} non ${esito.falliti === 1 ? 'è partito' : 'sono partiti'}.` : ''}`
        : esito.messaggio || 'Nessuno da avvisare.')
      setPannelloProm(false)
      caricaPromemoria()
      setBookings(await apiFetch(`/api/eventi/${id}/bookings`))
    } catch (e) { alert(`Non è partito: ${e.message}`) }
    setInviando(false)
  }

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

  // ⛔ Sotto ogni riga c'erano TRE pulsanti colorati con la freccia — «→ In
  // attesa», «→ Annullata», «→ In lista d'attesa» — tutti dello stesso peso.
  // Parole di Francesco: «il mio cliente mi ha detto che non capisce nulla».
  // Aveva ragione: chiedevano di scegliere uno **stato interno**, mentre chi
  // gestisce una serata pensa «questo ha disdetto», «questo lo faccio entrare».
  //
  // Ora c'è UNA cosa da fare, evidente, con il nome di quello che succede alla
  // persona; il resto è testo piccolo accanto. Nessuna azione è stata tolta —
  // sono le stesse quattro transizioni, ordinate.
  //
  // ⚠️ È una funzione normale chiamata `{renderAzioni(b)}`, non un componente
  // definito qui dentro: quello cambierebbe identità a ogni render (nota 22).
  function renderAzioni(b) {
    const AZIONI = {
      // Il caso normale: è confermata e la persona verrà. L'unica cosa che
      // capita è che disdica.
      confirmed: { principale: { stato: 'cancelled', testo: 'Ha disdetto', bg: '#f8d7da', color: '#721c24' },
                   altre: [{ stato: 'pending', testo: 'rimetti in attesa' }] },
      // In attesa esiste per quando i pagamenti saranno accesi. Finché no, la
      // cosa da fare è confermare.
      pending:   { principale: { stato: 'confirmed', testo: 'Conferma', bg: '#d4edda', color: '#155724' },
                   altre: [{ stato: 'cancelled', testo: 'annulla' }] },
      // ⛔ «Fai entrare», non «Conferma»: da qui parte l'email che dice alla
      // persona che il posto è suo, ed è la differenza fra un gesto e una
      // promessa mantenuta.
      waitlist:  { principale: { stato: 'confirmed', testo: 'Fai entrare', bg: '#d4edda', color: '#155724' },
                   altre: [{ stato: 'cancelled', testo: 'togli dalla lista' }] },
      cancelled: { principale: { stato: 'confirmed', testo: 'Rimetti dentro', bg: '#d4edda', color: '#155724' },
                   altre: [] },
    }
    const a = AZIONI[b.status]
    if (!a) return null
    const bloccato = updatingId === b.id
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        <button disabled={bloccato} onClick={() => updateStatus(b.id, a.principale.stato)}
          style={{ fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: bloccato ? 'wait' : 'pointer', background: a.principale.bg, color: a.principale.color, opacity: bloccato ? 0.6 : 1 }}>
          {bloccato ? 'Un attimo…' : a.principale.testo}
        </button>
        {a.altre.map(x => (
          <button key={x.stato} disabled={bloccato} onClick={() => updateStatus(b.id, x.stato)}
            style={{ fontSize: 12.5, background: 'none', border: 'none', padding: 0, color: '#888', cursor: bloccato ? 'wait' : 'pointer', textDecoration: 'underline' }}>
            {x.testo}
          </button>
        ))}
      </div>
    )
  }

  // ⛔ Il primo riquadro contava SOLO le confermate, e mostrava «0 confermati ·
  // €0» a chi aveva nove persone e 375 € di cena prenotata. Il numero era
  // esatto e raccontava il falso: quello che il titolare vuole sapere aprendo
  // questa pagina e' **quanta gente viene**, non in che stato interno sta la
  // riga. I posti presi sono tutti quelli non annullati — la stessa cosa che
  // conta `recomputeEventSeats` per decidere se l'evento e' pieno.
  // ⚠️ La lista d'attesa resta fuori dai posti presi, altrimenti riempirebbe
  // l'evento da sola: e quando un posto si libera non risulterebbe libero — né
  // per chi prenota né per chi è in lista.
  const inAttesa = bookings.filter(b => b.status === 'waitlist')
  const vive     = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'waitlist')
  const presi    = vive.reduce((n, b) => n + (b.seats || 1), 0)
  const pending  = bookings.filter(b => b.status === 'pending').reduce((n, b) => n + (b.seats || 1), 0)
  const revenue  = vive.reduce((n, b) => n + (b.total_amount || 0), 0)
  const liberi   = evento.seats_total ? Math.max(0, evento.seats_total - presi) : null

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push(`/admin/eventi/${id}`)}
          style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
          <ArrowLeft size={14} strokeWidth={2} /> Torna all'evento
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, overflowWrap: 'anywhere' }}>Prenotazioni — {evento.title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{fmtEvento(evento.date_start, azienda?.fuso_orario)}</p>
        </div>
        {/* Chi chiama al telefono finiva su un quaderno, e i posti nel pannello
            non tornavano più con la realtà: l'evento risultava mezzo vuoto
            mentre era pieno. Adesso si segna qui. */}
        <button onClick={() => setNuova(true)}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
          <Plus size={15} strokeWidth={2} /> Segna prenotazione
        </button>
      </div>

      {/* ⛔ Con la conferma spenta, ogni gesto di questa pagina è muto: chi
          prenota non riceve niente, e chi viene promosso dalla lista d'attesa
          non sa di essere entrato. Era il caso di **tutti** gli eventi veri
          fino all'08/09 — spenti per il vecchio default, non per una scelta.
          Adesso nascono accesi, ma chi la spegne deve leggerlo qui: un pulsante
          «conferma» che non conferma niente è una promessa falsa. */}
      {evento.send_guest_confirmation === false && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#fffaf0', border: '1px solid #f6d998', borderRadius: 10, padding: '13px 16px', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 14, color: '#8a6d1f', lineHeight: 1.6 }}>
            <strong>La conferma all’ospite è spenta per questo evento.</strong> Chi prenota non riceve nessuna email
            {inAttesa.length > 0 && <>, e se confermi qualcuno dalla lista d’attesa non saprà di essere entrato</>}
            : {inAttesa.length > 0 ? 'vanno avvisati' : 'va avvisato'} a voce.
          </div>
          <button onClick={() => router.push(`/admin/eventi/${id}`)}
            style={{ flexShrink: 0, padding: '9px 16px', background: '#8a6d1f', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
            Accendila
          </button>
        </div>
      )}

      {/* ⛔ Il promemoria automatico si programma quando uno prenota: chi aveva
          già prenotato prima non è in nessuna coda, e non ci finirà mai. Per la
          cena del 10 settembre erano ventisette persone che non avrebbero
          ricevuto niente. Questo è il pulsante che dice «mandalo adesso a chi
          c'è» — ed è anche più adatto: il titolare guarda la lista e decide. */}
      {pannelloProm && prom ? (
        <PannelloPromemoria prom={prom} inviando={inviando}
          onChiudi={() => setPannelloProm(false)} onManda={mandaPromemoria} />
      ) : prom && prom.totale > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#f0f4ff', border: '1px solid #c3dafe', borderRadius: 10, padding: '13px 16px', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 14, color: '#2b6cb0', lineHeight: 1.6 }}>
            {prom.da_avvisare > 0 ? (
              <><strong>{prom.da_avvisare} {prom.da_avvisare === 1 ? 'persona non ha' : 'persone non hanno'} ancora ricevuto niente.</strong>
                {prom.gia_avvisati > 0 && <> Ne {prom.gia_avvisati === 1 ? 'è già stata avvisata 1' : `sono già state avvisate ${prom.gia_avvisati}`}.</>}</>
            ) : (
              // ⚠️ Il riquadro non spariva quando erano tutti avvisati, e con
              // lui spariva l'unico modo di scrivere a chi ha prenotato: un
              // cambio d'orario si comunica anche a chi il promemoria l'ha già
              // ricevuto.
              <>Tutti hanno ricevuto il promemoria. Se qualcosa cambia — l’orario, il posto — puoi scrivere di nuovo.</>
            )}
            {prom.senza_email > 0 && <> {prom.senza_email} {prom.senza_email === 1 ? 'ha prenotato' : 'hanno prenotato'} senza lasciare un’email: {prom.senza_email === 1 ? 'va avvisata' : 'vanno avvisate'} a voce.</>}
          </div>
          <button onClick={() => setPannelloProm(true)}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#2b6cb0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
            <Send size={15} strokeWidth={2} /> Scrivi a chi ha prenotato
          </button>
        </div>
      )}

      {nuova && (
        <ModuloTelefono
          eventoId={id}
          liberi={liberi}
          onChiudi={() => setNuova(false)}
          onFatta={async (creata) => {
            setBookings(prev => [creata, ...prev])
            setNuova(false)
            // I posti li ricalcola il server: si rilegge l'evento invece di
            // fare un conto parallelo che prima o poi diverge.
            try { setEvento(await apiFetch(`/api/eventi/${id}`)) } catch {}
          }}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Posti presi', value: evento.seats_total ? `${presi} / ${evento.seats_total}` : presi,
            sub: liberi === null ? 'nessun limite' : liberi === 0 ? 'tutto esaurito' : `ancora ${liberi} liberi`,
            icon: Check, color: '#155724', bg: '#d4edda' },
          // ⚠️ Diceva «Persone» e contava le prenotazioni: nove righe per
          // quindici posti. L'etichetta e il numero si contraddicevano, e chi
          // legge si fida dell'etichetta — che era quella sbagliata. Le persone
          // sono i posti, e stanno nel riquadro accanto.
          { label: 'Prenotazioni', value: vive.length,
            sub: inAttesa.length ? `+ ${inAttesa.length} in lista d’attesa` : 'nell’elenco qui sotto',
            icon: Users, color: '#1a1a2e', bg: '#f0f4ff' },
          { label: 'Valore',     value: `€${revenue}`, sub: pending ? `${pending} posti ancora in attesa` : 'prenotazioni valide', icon: Package, color: '#2b6cb0', bg: '#ebf4ff' },
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
          {/* ⚠️ Le etichette colorate erano lì da sempre e nessuno aveva mai
              scritto cosa vogliono dire. Una parola sola su una pastiglia —
              «In attesa» — non spiega se quella persona verrà o no, e chi
              gestisce la serata deve saperlo prima di aprire la porta.
              Si mostrano solo gli stati che ci sono davvero: spiegare la lista
              d'attesa a chi non la usa è un'altra cosa da leggere per niente. */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: 12.5, color: '#666', lineHeight: 1.7 }}>
            {[
              bookings.some(b => b.status === 'confirmed') && <span key="c"><strong style={{ color: '#155724' }}>Confermata</strong> = ha il posto e verrà.</span>,
              bookings.some(b => b.status === 'pending') && <span key="p"><strong style={{ color: '#856404' }}>In attesa</strong> = ha prenotato ma il posto non è ancora suo: va confermata.</span>,
              bookings.some(b => b.status === 'waitlist') && <span key="w"><strong style={{ color: '#2b6cb0' }}>In lista d’attesa</strong> = non c’era posto. Non ne occupa uno, e «Fai entrare» le manda la conferma.</span>,
              bookings.some(b => b.status === 'cancelled') && <span key="a"><strong style={{ color: '#721c24' }}>Annullata</strong> = ha disdetto, il suo posto è tornato libero.</span>,
            ].filter(Boolean).map((x, i, arr) => <span key={i}>{x}{i < arr.length - 1 ? ' · ' : ''}</span>)}
          </div>
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

                {renderAzioni(b)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
