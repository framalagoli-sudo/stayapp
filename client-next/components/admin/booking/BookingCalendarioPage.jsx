'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'

// Il calendario delle prenotazioni, un mese alla volta.
//
// Prima era una griglia settimanale con una riga per risorsa: buona per
// confrontare più risorse in pochi giorni, inutile per chi affitta — che vuole
// vedere «com'è messo il mese» su **una** cosa. Ora si sceglie la risorsa e si
// guarda il mese intero, come nel piano editoriale.
//
// Il colore dice a colpo d'occhio quanto è pieno un giorno. Non è verde/rosso
// secco: a slot e a coperti un giorno può essere **mezzo** pieno, e dipingerlo
// di rosso perché c'è una prenotazione a pranzo direbbe una cosa falsa.

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const STATI_COLOR = {
  confermata: '#2e7d32', in_attesa: '#e65100', cancellata: '#999',
  completata: '#1565c0', no_show: '#b71c1c',
}

// ⚠️ `toISOString()` converte in UTC: su un fuso avanti a Greenwich il giorno 1
// alle 00:00 locali diventa il 31 del mese prima, e il calendario slitta di un
// giorno. Qui la data si compone dai campi locali.
function iso(anno, mese, giorno) {
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}
const isoDi = d => iso(d.getFullYear(), d.getMonth(), d.getDate())

// Le caselle del mese, con i vuoti davanti per far cadere il 1° nel suo giorno
// della settimana. La settimana comincia di lunedì.
function caselleDelMese(anno, mese) {
  const primo = new Date(anno, mese, 1).getDay()
  const quanti = new Date(anno, mese + 1, 0).getDate()
  const vuoti = primo === 0 ? 6 : primo - 1
  return [...Array(vuoti).fill(null), ...Array.from({ length: quanti }, (_, i) => i + 1)]
}

// Quanto è pieno questo giorno, da 0 a 1.
//
// A giornate la capienza sono le copie identiche (tre appartamenti = 3); a
// coperti sono i posti a sedere; a slot le risorse in parallelo. Sono numeri
// diversi e chiederne uno solo darebbe percentuali senza senso.
function quantoPieno(risorsa, cella) {
  if (!cella) return 0
  if (risorsa.modalita === 'coperti') {
    const max = risorsa.max_coperti || 0
    return max ? Math.min(1, (cella.persone || 0) / max) : (cella.count ? 1 : 0)
  }
  const max = risorsa.quantita || 1
  return Math.min(1, (cella.count || 0) / max)
}

function coloreGiorno(pieno, count) {
  if (!count) return { bg: '#f2fbf4', bordo: '#dcf0e2' }   // libero
  if (pieno >= 1) return { bg: '#fdeeee', bordo: '#f6d4d4' } // pieno
  return { bg: '#fff8e6', bordo: '#f5e6bf' }                 // in parte occupato
}

export default function BookingCalendarioPage() {
  const router = useRouter()
  const oggi = new Date()
  const { profile } = useAuth()
  const { azienda, activeAziendaId, loading: aziLoading } = useAzienda()
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId

  const [risorse, setRisorse] = useState([])
  const [risorsaId, setRisorsaId] = useState(null)
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const [occupancy, setOccupancy] = useState({})
  const [loading, setLoading] = useState(true)

  const [giornoAperto, setGiornoAperto] = useState(null)
  const [prenotazioniDelGiorno, setPrenotazioni] = useState([])
  const [caricaGiorno, setCaricaGiorno] = useState(false)

  const risorsa = risorse.find(r => r.id === risorsaId) || null
  const caselle = caselleDelMese(anno, mese)
  const primoGiorno = iso(anno, mese, 1)
  const ultimoGiorno = iso(anno, mese, new Date(anno, mese + 1, 0).getDate())

  // ⚠️ Senza l'azienda attiva un super_admin si trova nella tendina le risorse
  // di **tutti** i clienti mescolate, e il selettore in cima alla barra non ha
  // nessun effetto qui. Verificato il 28/08: il calendario apriva sul «Furgone»
  // di un cliente mentre se ne guardava un altro.
  useEffect(() => {
    if (aziLoading) return
    apiFetch(`/api/booking/risorse${aziendaId ? `?azienda_id=${aziendaId}` : ''}`)
      .then(r => {
        const elenco = Array.isArray(r) ? r : []
        setRisorse(elenco)
        // Cambiando azienda la risorsa di prima non esiste più: si riparte dalla
        // prima di quelle nuove, invece di restare su un id che non c'è.
        setRisorsaId(id => (elenco.some(x => x.id === id) ? id : elenco[0]?.id || null))
        setGiornoAperto(null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aziendaId, aziLoading])

  const caricaMese = useCallback(async () => {
    try {
      setOccupancy(await apiFetch(`/api/booking/occupancy?data_da=${primoGiorno}&data_a=${ultimoGiorno}`))
    } catch { setOccupancy({}) }
  }, [primoGiorno, ultimoGiorno])

  useEffect(() => { caricaMese() }, [caricaMese])

  async function apriGiorno(data) {
    setGiornoAperto(data)
    setCaricaGiorno(true)
    try {
      setPrenotazioni(await apiFetch(`/api/booking/prenotazioni?risorsa_id=${risorsaId}&data=${data}`))
    } catch { setPrenotazioni([]) }
    finally { setCaricaGiorno(false) }
  }

  async function cambiaStato(b, stato) {
    await apiFetch(`/api/booking/prenotazioni/${b.id}`, { method: 'PATCH', body: JSON.stringify({ stato }) })
    apriGiorno(giornoAperto)
    caricaMese()
  }

  async function cancella(b) {
    // Cancellare non è annullare: una prenotazione annullata resta nello
    // storico (e il cliente ne ha una copia via email), cancellarla la toglie
    // dai conti per sempre. Sono due gesti diversi, ed è giusto che lo dica.
    if (!confirm(`Eliminare la prenotazione di ${b.cliente_nome}? Sparisce dallo storico. Per liberare il posto tenendone traccia, usa «Annulla».`)) return
    await apiFetch(`/api/booking/prenotazioni/${b.id}`, { method: 'DELETE' })
    apriGiorno(giornoAperto)
    caricaMese()
  }

  function meseIndietro() { if (mese === 0) { setAnno(a => a - 1); setMese(11) } else setMese(m => m - 1) }
  function meseAvanti()   { if (mese === 11) { setAnno(a => a + 1); setMese(0) } else setMese(m => m + 1) }
  function vaiAOggi()     { setAnno(oggi.getFullYear()); setMese(oggi.getMonth()) }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Caricamento…</div>

  if (risorse.length === 0) return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nessuna risorsa da prenotare</div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>Crea la prima: un appartamento, un'auto, un campo, un tavolo.</div>
      <button onClick={() => router.push('/admin/booking/risorse')} style={{ ...btn, background: '#1a1a2e', color: '#fff', padding: '10px 20px' }}>
        Crea risorsa
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Calendario</h1>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Clicca un giorno libero per prenotare, uno occupato per vedere chi c'è.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/admin/booking/risorse')} style={btn}>Risorse</button>
          <button onClick={() => router.push('/admin/booking/prenotazioni')} style={btn}>Tutte le prenotazioni</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={risorsaId || ''} onChange={e => { setRisorsaId(e.target.value); setGiornoAperto(null) }}
          style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', maxWidth: '100%' }}>
          {risorse.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={meseIndietro} style={btn} aria-label="Mese precedente">‹</button>
          <div style={{ fontSize: 15, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>{MESI[mese]} {anno}</div>
          <button onClick={meseAvanti} style={btn} aria-label="Mese successivo">›</button>
          <button onClick={vaiAOggi} style={btn}>Oggi</button>
        </div>
      </div>

      {/* La legenda: senza, tre sfumature di colore sono un indovinello. */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: '#666' }}>
        <Legenda colore="#f2fbf4" bordo="#dcf0e2" testo="Libero" />
        <Legenda colore="#fff8e6" bordo="#f5e6bf" testo="In parte occupato" />
        <Legenda colore="#fdeeee" bordo="#f6d4d4" testo="Pieno" />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', minWidth: 520 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid #eee' }}>
            {GIORNI.map(g => (
              <div key={g} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {caselle.map((giorno, i) => {
              if (!giorno) return <div key={`v${i}`} style={{ minHeight: 84, background: '#fafafa', borderRight: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5' }} />
              const data = iso(anno, mese, giorno)
              const cella = occupancy[risorsaId]?.[data]
              const count = cella?.count || 0
              const pieno = risorsa ? quantoPieno(risorsa, cella) : 0
              const c = coloreGiorno(pieno, count)
              const isOggi = data === isoDi(oggi)
              const aperto = giornoAperto === data
              return (
                // `data-giorno` è l'appiglio per le sonde: cercare «il div che
                // contiene il numero 12» prende quello sbagliato e fa credere a
                // un guasto che non c'è.
                <div key={data} data-giorno={data} onClick={() => apriGiorno(data)}
                  style={{
                    minHeight: 84, padding: 6, boxSizing: 'border-box', cursor: 'pointer',
                    background: c.bg, borderRight: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5',
                    outline: aperto ? '2px solid #1a1a2e' : 'none', outlineOffset: -2,
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOggi ? '#1a1a2e' : 'transparent', color: isOggi ? '#fff' : '#555',
                    fontSize: 12, fontWeight: isOggi ? 700 : 400, marginBottom: 4,
                  }}>{giorno}</div>
                  {count > 0 && (
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 600, overflowWrap: 'anywhere' }}>
                      {risorsa?.modalita === 'coperti'
                        ? `${cella.persone} ${cella.persone === 1 ? 'persona' : 'persone'}`
                        : `${count} ${count === 1 ? 'prenotazione' : 'prenotazioni'}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {giornoAperto && (
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, overflowWrap: 'anywhere' }}>
              {risorsa?.nome} — {new Date(`${giornoAperto}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => setGiornoAperto(null)} style={{ ...btn, padding: '4px 10px' }}>✕</button>
          </div>

          {caricaGiorno ? (
            <div style={{ color: '#999', fontSize: 14 }}>Caricamento…</div>
          ) : prenotazioniDelGiorno.length === 0 ? (
            <div>
              <p style={{ color: '#888', fontSize: 14, margin: '0 0 14px' }}>Nessuna prenotazione in questo giorno.</p>
              <button onClick={() => router.push(`/admin/booking/prenotazioni?nuova=1&risorsa_id=${risorsaId}&data=${giornoAperto}`)}
                style={{ ...btn, background: '#1a1a2e', color: '#fff' }}>
                Prenota per un cliente
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
              {prenotazioniDelGiorno.map(b => (
                <div key={b.id} style={{ padding: '12px 14px', borderRadius: 8, background: '#f8f8f8', borderLeft: `4px solid ${STATI_COLOR[b.stato] || '#ccc'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' }}>{b.cliente_nome}</div>
                      <div style={{ fontSize: 12, color: '#888', overflowWrap: 'anywhere' }}>
                        {b.cliente_email}{b.cliente_telefono ? ` · ${b.cliente_telefono}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
                        {b.data_fine
                          ? `dal ${b.data} al ${b.data_fine}`
                          : b.servizio
                            ? `${b.servizio} · ${b.ora_inizio?.slice(0, 5) || ''}`
                            : `ore ${b.ora_inizio?.slice(0, 5) || '—'}`}
                        {' · '}{b.n_persone} {b.n_persone === 1 ? 'persona' : 'persone'}
                        {b.importo_totale > 0 ? ` · €${b.importo_totale}` : ''}
                      </div>
                      {b.note_cliente && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 3, overflowWrap: 'anywhere' }}>{b.note_cliente}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATI_COLOR[b.stato], textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{b.stato}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {b.stato === 'in_attesa' && (
                      <button onClick={() => cambiaStato(b, 'confermata')} style={{ ...btnPiccolo, background: '#e6f7ee', color: '#137a4a' }}>Conferma</button>
                    )}
                    {b.stato !== 'cancellata' && (
                      <button onClick={() => cambiaStato(b, 'cancellata')} style={{ ...btnPiccolo, background: '#fff4e5', color: '#a15c00' }}>Annulla</button>
                    )}
                    {b.stato !== 'completata' && (
                      <button onClick={() => cambiaStato(b, 'completata')} style={btnPiccolo}>Segna completata</button>
                    )}
                    <button onClick={() => cancella(b)} style={{ ...btnPiccolo, background: '#fff5f5', color: '#c53030' }}>Elimina</button>
                  </div>
                </div>
              ))}
              <button onClick={() => router.push(`/admin/booking/prenotazioni?nuova=1&risorsa_id=${risorsaId}&data=${giornoAperto}`)}
                style={{ ...btn, background: '#1a1a2e', color: '#fff', marginTop: 4, justifySelf: 'start' }}>
                Aggiungi una prenotazione
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Legenda({ colore, bordo, testo }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: colore, border: `1px solid ${bordo}` }} />
      {testo}
    </span>
  )
}

const btn = {
  background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '8px 14px',
  fontSize: 13, cursor: 'pointer', fontWeight: 500,
}
const btnPiccolo = {
  background: '#eef0f4', border: 'none', borderRadius: 8, padding: '6px 12px',
  fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#444',
}
