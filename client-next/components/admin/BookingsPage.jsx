'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import { CalendarCheck, CalendarDays, Search, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import StatoPagamento from './StatoPagamento'
import { etichettaStato, attendePagamento } from '@/lib/stato-prenotazione'
import { oraLocale } from '@/lib/fuso'
import { postiEvento } from '@/lib/posti-evento'

// Tutte le prenotazioni, di qualunque natura, in un posto solo.
//
// Prima questa pagina leggeva le `requests` e distingueva una prenotazione da
// una richiesta di servizio **dall'inizio del testo del messaggio**
// (`[Prenotazione…`). Si è rotto due volte in silenzio: i componenti guest
// scrivevano «Prenotazione escursione:» senza la quadra, e metà delle
// prenotazioni finiva fra le richieste senza che nessuno se ne accorgesse.
//
// Ora si legge la tabella `prenotazioni`, dove ogni riga dice a **cosa** si
// riferisce. Niente stringhe da interpretare.
//
// ⚠️ Gli eventi qui si VEDONO, ma restano una cosa a parte: tabella propria,
// voce «Eventi» propria per crearli, prenotazioni proprie (decisione del
// 27–28/08, in `CLAUDE.md`). Fino al 04/10/2026 questa pagina li lasciava fuori,
// e per chi vive di eventi — Garage 22 — «Prenotazioni» era una pagina vuota.
// Ora ogni evento compare con i suoi numeri (quanti vengono, quanti aspettano,
// quanto è incassato) e porta al suo elenco: i nomi stanno lì, non qui.


function quando(p) {
  if (p.data_fine && p.data_fine !== p.data) return `dal ${data(p.data)} al ${data(p.data_fine)}`
  if (p.ora_inizio) return `${data(p.data)} · ${p.ora_inizio.slice(0, 5)}${p.servizio ? ` · ${p.servizio}` : ''}`
  return data(p.data)
}
const data = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Che cosa è stato preso: un'offerta o una risorsa prenotabile.
const cosa = p => p.offerte?.titolo || p.risorse?.nome || 'Prenotazione'

export default function BookingsPage() {
  const { profile } = useAuth()
  const { azienda, activeAziendaId, loading: aziLoading } = useAzienda()
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId

  const [prenotazioni, setPrenotazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('tutte')
  const [cerca, setCerca] = useState('')
  const [eventi, setEventi] = useState([])
  const [passatiAperti, setPassatiAperti] = useState(false)

  useEffect(() => {
    if (aziLoading) return
    const dove = aziendaId ? `?azienda_id=${aziendaId}` : ''
    // Le due letture sono indipendenti: se una non riesce, l'altra si mostra lo stesso.
    Promise.all([
      apiFetch(`/api/booking/prenotazioni${dove}`).then(d => setPrenotazioni(Array.isArray(d) ? d : [])).catch(() => {}),
      apiFetch(`/api/eventi/riepilogo${dove}`).then(d => setEventi(Array.isArray(d) ? d : [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [aziendaId, aziLoading])

  async function cambiaStato(p, stato) {
    await apiFetch(`/api/booking/prenotazioni/${p.id}`, { method: 'PATCH', body: JSON.stringify({ stato }) })
    setPrenotazioni(l => l.map(x => x.id === p.id ? { ...x, stato } : x))
  }

  const visibili = prenotazioni
    .filter(p => filtro === 'tutte' || (filtro === 'offerte' ? !!p.offerta_id : !p.offerta_id))
    .filter(p => {
      if (!cerca.trim()) return true
      const t = cerca.toLowerCase()
      return [p.cliente_nome, p.cliente_email, p.cliente_telefono, cosa(p)].some(x => (x || '').toLowerCase().includes(t))
    })

  // Gli eventi: prima quelli che devono ancora svolgersi, dal più vicino; i
  // passati in fondo, dal più recente, e solo se qualcuno li aveva prenotati.
  const conTitolo = e => !cerca.trim() || (e.titolo || '').toLowerCase().includes(cerca.toLowerCase())
  const mostraEventi = filtro === 'tutte' || filtro === 'eventi'
  const mostraElenco = filtro !== 'eventi'
  const inProgramma = eventi.filter(e => !e.concluso && conTitolo(e))
  const mosse = e => e.prenotazioni + e.gruppi.attesa.prenotazioni + e.gruppi.perse.prenotazioni
  const passati = eventi.filter(e => e.concluso && mosse(e) > 0 && conTitolo(e)).reverse()

  // Quello che aspetta un gesto del titolare, detto in cima invece di lasciarlo
  // cercare: è il motivo per cui si apre questa pagina.
  const daGuardare = []
  for (const e of eventi.filter(x => !x.concluso)) {
    const g = e.gruppi
    const to = `/admin/eventi/${e.id}/prenotazioni`
    if (g.daConfermare.prenotazioni) daGuardare.push({ k: `c${e.id}`, to, testo: `${g.daConfermare.prenotazioni} da confermare`, dove: e.titolo })
    if (g.pagamento.prenotazioni) daGuardare.push({ k: `p${e.id}`, to, testo: `${g.pagamento.prenotazioni} ${g.pagamento.prenotazioni === 1 ? 'attende' : 'attendono'} il pagamento`, dove: e.titolo })
    if (g.attesa.prenotazioni) daGuardare.push({ k: `a${e.id}`, to, testo: `${g.attesa.prenotazioni} in lista d’attesa`, dove: e.titolo })
  }
  // Chi sta pagando non è «da confermare»: non tocca al titolare, e se la
  // confermasse a mano il pagamento online non verrebbe più atteso.
  const daConfermare = prenotazioni.filter(x => x.stato === 'in_attesa' && !attendePagamento(x)).length
  if (daConfermare) daGuardare.push({ k: 'risorse', to: null, testo: `${daConfermare} da confermare`, dove: 'risorse e offerte' })
  const inPagamento = prenotazioni.filter(attendePagamento).length
  if (inPagamento) daGuardare.push({ k: 'risorse-pag', to: null, testo: `${inPagamento} ${inPagamento === 1 ? 'attende' : 'attendono'} il pagamento`, dove: 'risorse e offerte' })

  const fuso = azienda?.fuso_orario
  const giorno = iso => oraLocale(iso, fuso, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) || '—'

  // La scheda di un evento. Funzione normale chiamata `{renderEvento(e)}`, non
  // un componente definito qui dentro (nota 22 di CLAUDE.md).
  function renderEvento(e) {
    const g = e.gruppi
    const conti = postiEvento({ seats_total: e.capienza, seats_booked: e.posti, posti_riservati: e.riservati })
    const pastiglie = [
      g.confermate.prenotazioni > 0 && { t: `${g.confermate.posti} ${g.confermate.posti === 1 ? 'posto confermato' : 'posti confermati'}`, c: '#155724', b: '#d4edda' },
      g.pagamento.prenotazioni > 0 && { t: `${g.pagamento.prenotazioni} ${g.pagamento.prenotazioni === 1 ? 'attende' : 'attendono'} il pagamento`, c: '#856404', b: '#fff3cd' },
      g.daConfermare.prenotazioni > 0 && { t: `${g.daConfermare.prenotazioni} da confermare`, c: '#856404', b: '#fff3cd' },
      g.attesa.prenotazioni > 0 && { t: `${g.attesa.prenotazioni} in lista d’attesa`, c: '#2b6cb0', b: '#ebf4ff' },
      g.perse.prenotazioni > 0 && { t: `${g.perse.prenotazioni} non andate a buon fine`, c: '#777', b: '#f0f0f0' },
    ].filter(Boolean)
    return (
      <Link key={e.id} href={`/admin/eventi/${e.id}/prenotazioni`} data-evento={e.id}
        style={{ display: 'block', background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit', opacity: e.concluso ? 0.8 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflowWrap: 'anywhere' }}>
              {e.titolo}
              {!e.pubblicato && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f0f0f0', color: '#777' }}>Non pubblicato</span>}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{giorno(e.date_start)}</div>
            {pastiglie.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {pastiglie.map(x => (
                  <span key={x.t} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: x.b, color: x.c }}>{x.t}</span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#999', marginTop: 6 }}>Nessuna prenotazione ancora.</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a2e' }}>
              {e.posti}{e.capienza ? ` / ${e.capienza}` : ''} <span style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>posti presi</span>
            </div>
            {!e.concluso && !conti.illimitato && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {conti.liberi === 0 ? 'tutto esaurito' : conti.riservati ? `${conti.liberi} liberi · ${conti.liberiOnline} vendibili online` : `ancora ${conti.liberi} liberi`}
              </div>
            )}
            {e.incassato > 0 && <div style={{ fontSize: 12.5, fontWeight: 700, color: '#276749', marginTop: 4 }}>€{e.incassato.toFixed(2)} incassati online</div>}
            {e.valore - e.incassato > 0 && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>€{(e.valore - e.incassato).toFixed(2)} ancora da incassare</div>}
          </div>
        </div>
      </Link>
    )
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Prenotazioni</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>
          Tutto quello che i tuoi clienti hanno prenotato: eventi, risorse e offerte.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
          {/* Solo i filtri che hanno qualcosa dietro: a chi fa solo eventi, «Offerte» e «Risorse» porterebbero a due pagine vuote. */}
          {[['tutte', 'Tutte'], eventi.length > 0 && ['eventi', 'Eventi'], prenotazioni.length > 0 && ['offerte', 'Offerte'], prenotazioni.length > 0 && ['risorse', 'Risorse']].filter(Boolean).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                fontWeight: filtro === k ? 600 : 400, background: filtro === k ? '#fff' : 'transparent',
                color: filtro === k ? '#1a1a2e' : '#888' }}>{l}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <Search size={15} strokeWidth={1.5} color="#aaa" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="Cerca per nome, evento o cosa"
            style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      </div>

      {filtro === 'tutte' && !cerca.trim() && daGuardare.length > 0 && (
        <div data-da-guardare style={{ background: '#fffaf0', border: '1px solid #f6d998', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#8a6d1f', marginBottom: 6 }}>
            <AlertCircle size={15} strokeWidth={1.5} color="#8a6d1f" /> Da guardare
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4 }}>
            {daGuardare.map(x => x.to ? (
              <Link key={x.k} href={x.to} style={{ fontSize: 13.5, color: '#5c4a12', textDecoration: 'none', overflowWrap: 'anywhere' }}>
                <strong>{x.testo}</strong> — {x.dove} ›
              </Link>
            ) : (
              <span key={x.k} style={{ fontSize: 13.5, color: '#5c4a12' }}><strong>{x.testo}</strong> — {x.dove}, qui sotto</span>
            ))}
          </div>
        </div>
      )}

      {mostraEventi && inProgramma.length > 0 && (
        <div data-sezione="eventi" style={{ marginBottom: 22 }}>
          <div style={titoloSezione}><CalendarDays size={15} strokeWidth={1.5} color="#1a1a2e" /> Eventi in programma</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
            {inProgramma.map(e => renderEvento(e))}
          </div>
        </div>
      )}

      {mostraElenco && (visibili.length > 0 || eventi.length === 0 || filtro !== 'tutte') && (
        <div data-sezione="elenco" style={{ marginBottom: 22 }}>
      {eventi.length > 0 && filtro === 'tutte' && <div style={titoloSezione}><CalendarCheck size={15} strokeWidth={1.5} color="#1a1a2e" /> Risorse e offerte</div>}
      {visibili.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
          <CalendarCheck size={40} strokeWidth={1} color="#ddd" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>{prenotazioni.length ? 'Nessuna prenotazione con questi filtri.' : 'Ancora nessuna prenotazione.'}</p>
        </div>
      ) : (
        // ⚠️ `minmax(0, 1fr)`: senza, un nome lungo — che è un dato del cliente —
        // allarga la riga oltre la scheda.
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
          {visibili.map(p => {
            const s = etichettaStato(p)
            return (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{cosa(p)}</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{quando(p)}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4, overflowWrap: 'anywhere' }}>
                      {p.cliente_nome}
                      {p.cliente_email ? ` · ${p.cliente_email}` : ''}
                      {p.cliente_telefono ? ` · ${p.cliente_telefono}` : ''}
                      {p.n_persone > 1 ? ` · ${p.n_persone} persone` : ''}
                    </div>
                    {p.messaggio && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4, overflowWrap: 'anywhere' }}>{p.messaggio}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.sfondo, color: s.colore }}>{s.label}</span>
                    {p.importo_totale > 0 && <span style={{ fontWeight: 700, fontSize: 14 }}>€{p.importo_totale}</span>}
                    <StatoPagamento riga={p} importo={p.importo_online} compatto />
                  </div>
                </div>
                {attendePagamento(p) && (
                  <div data-attende-pagamento style={{ fontSize: 12.5, color: '#8a5a00', marginTop: 8, lineHeight: 1.5 }}>
                    Sta pagando online{p.importo_online > 0 ? ` €${Number(p.importo_online).toFixed(2)}` : ''}: ha mezz’ora, poi si annulla da sola e la disponibilità torna libera. Non serve fare niente.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {p.stato === 'in_attesa' && (
                    <button onClick={() => cambiaStato(p, 'confermata')} title={attendePagamento(p) ? 'La tieni tu: pagherà sul posto, e il pagamento online non viene più atteso' : undefined}
                      style={{ ...azione, background: '#e6f7ee', color: '#137a4a' }}>{attendePagamento(p) ? 'Conferma: pagherà sul posto' : 'Conferma'}</button>
                  )}
                  {p.stato !== 'cancellata' && (
                    <button onClick={() => cambiaStato(p, 'cancellata')} style={{ ...azione, background: '#fff4e5', color: '#a15c00' }}>Annulla</button>
                  )}
                  {p.stato !== 'completata' && (
                    <button onClick={() => cambiaStato(p, 'completata')} style={azione}>Segna completata</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
        </div>
      )}

      {filtro === 'eventi' && inProgramma.length === 0 && passati.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
          <CalendarDays size={40} strokeWidth={1} color="#ddd" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>{eventi.length ? 'Nessun evento con questo nome.' : 'Ancora nessun evento.'}</p>
        </div>
      )}

      {/* I passati restano consultabili ma chiusi: servono a rileggere una
          serata, non a ogni apertura della pagina. */}
      {mostraEventi && passati.length > 0 && (
        <div data-sezione="passati">
          <button onClick={() => setPassatiAperti(a => !a)} aria-expanded={passatiAperti}
            style={{ ...titoloSezione, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#666' }}>
            {passatiAperti ? <ChevronDown size={16} strokeWidth={1.5} color="#666" /> : <ChevronRight size={16} strokeWidth={1.5} color="#666" />}
            Eventi passati ({passati.length})
          </button>
          {passatiAperti && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
              {passati.map(e => renderEvento(e))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const titoloSezione = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 10px' }

const azione = {
  background: '#eef0f4', border: 'none', borderRadius: 8, padding: '6px 12px',
  fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#444',
}
