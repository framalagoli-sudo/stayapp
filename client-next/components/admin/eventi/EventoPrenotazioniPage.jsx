'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { Users, Calendar, Mail, Phone, Package, ArrowLeft, Check, X, Clock, Plus, PhoneCall } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'In attesa',  bg: '#fff3cd', color: '#856404' },
  { value: 'confirmed', label: 'Confermata', bg: '#d4edda', color: '#155724' },
  { value: 'cancelled', label: 'Annullata',  bg: '#f8d7da', color: '#721c24' },
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
  const [evento, setEvento] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [nuova, setNuova] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/eventi/${id}`),
      apiFetch(`/api/eventi/${id}/bookings`),
    ]).then(([ev, bk]) => {
      setEvento(ev)
      setBookings(bk)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

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

  // ⛔ Il primo riquadro contava SOLO le confermate, e mostrava «0 confermati ·
  // €0» a chi aveva nove persone e 375 € di cena prenotata. Il numero era
  // esatto e raccontava il falso: quello che il titolare vuole sapere aprendo
  // questa pagina e' **quanta gente viene**, non in che stato interno sta la
  // riga. I posti presi sono tutti quelli non annullati — la stessa cosa che
  // conta `recomputeEventSeats` per decidere se l'evento e' pieno.
  const vive     = bookings.filter(b => b.status !== 'cancelled')
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
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{fmtDate(evento.date_start)}</p>
        </div>
        {/* Chi chiama al telefono finiva su un quaderno, e i posti nel pannello
            non tornavano più con la realtà: l'evento risultava mezzo vuoto
            mentre era pieno. Adesso si segna qui. */}
        <button onClick={() => setNuova(true)}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#1a1a2e', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff' }}>
          <Plus size={15} strokeWidth={2} /> Segna prenotazione
        </button>
      </div>

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
          { label: 'Persone',    value: vive.length, sub: vive.length === 1 ? 'prenotazione' : 'prenotazioni', icon: Users, color: '#1a1a2e', bg: '#f0f4ff' },
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

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.filter(s => s.value !== b.status).map(s => (
                    <button key={s.value} disabled={updatingId === b.id}
                      onClick={() => updateStatus(b.id, s.value)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: s.bg, color: s.color, opacity: updatingId === b.id ? 0.6 : 1 }}>
                      → {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
