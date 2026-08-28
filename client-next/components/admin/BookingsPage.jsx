'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { CalendarCheck, Search } from 'lucide-react'

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
// ⚠️ Gli eventi restano fuori per scelta: hanno la loro voce e le loro
// prenotazioni. Vedi `CLAUDE.md`, decisioni prese.

const STATI = {
  confermata: { label: 'Confermata', colore: '#137a4a', sfondo: '#e6f7ee' },
  in_attesa:  { label: 'Da confermare', colore: '#a15c00', sfondo: '#fff4e5' },
  cancellata: { label: 'Annullata', colore: '#888', sfondo: '#f0f0f0' },
  completata: { label: 'Completata', colore: '#1565c0', sfondo: '#e8f0fe' },
  no_show:    { label: 'Non presentato', colore: '#b71c1c', sfondo: '#fdeeee' },
}

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

  useEffect(() => {
    if (aziLoading) return
    apiFetch(`/api/booking/prenotazioni${aziendaId ? `?azienda_id=${aziendaId}` : ''}`)
      .then(d => setPrenotazioni(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
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

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Prenotazioni</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>
          Tutto quello che i tuoi clienti hanno preso. Gli eventi hanno la loro sezione.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
          {[['tutte', 'Tutte'], ['offerte', 'Offerte'], ['risorse', 'Risorse']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                fontWeight: filtro === k ? 600 : 400, background: filtro === k ? '#fff' : 'transparent',
                color: filtro === k ? '#1a1a2e' : '#888' }}>{l}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <Search size={15} strokeWidth={1.5} color="#aaa" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="Cerca per nome o cosa"
            style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      </div>

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
            const s = STATI[p.stato] || STATI.confermata
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
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {p.stato === 'in_attesa' && (
                    <button onClick={() => cambiaStato(p, 'confermata')} style={{ ...azione, background: '#e6f7ee', color: '#137a4a' }}>Conferma</button>
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
  )
}

const azione = {
  background: '#eef0f4', border: 'none', borderRadius: 8, padding: '6px 12px',
  fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#444',
}
