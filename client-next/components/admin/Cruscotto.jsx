'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Users, CalendarCheck, Wallet, CalendarDays, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'

// «Cosa succede»: i numeri dell'attività in un colpo d'occhio, confrontati col
// periodo prima, leggibili dal telefono. I conti li fa lib/cruscotto.js; qui si
// disegnano e basta. Ogni riquadro porta alla pagina da cui il numero viene.
const euro = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0)
const intero = n => new Intl.NumberFormat('it-IT').format(n || 0)

export default function Cruscotto() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda()
  const aziendaId = profile?.role === 'super_admin' ? (azienda?.id || activeAziendaId) : profile?.azienda_id
  const [giorni, setGiorni] = useState(7)
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (!aziendaId) return
    setErrore('')
    const az = profile?.role === 'super_admin' ? `&azienda_id=${aziendaId}` : ''
    apiFetch(`/api/cruscotto?giorni=${giorni}${az}`)
      .then(d => setDati(d)).catch(e => setErrore(e.message))
  }, [aziendaId, giorni]) // eslint-disable-line

  if (!profile || !['admin_azienda', 'super_admin'].includes(profile.role) || !aziendaId) return null

  const riquadri = dati ? [
    { chiave: 'visite', icona: Eye, colore: '#1a1a2e', titolo: 'Visite ai tuoi siti', valore: intero(dati.visite.ora), ora: dati.visite.ora, prima: dati.visite.prima, fmt: intero, link: '/admin/analytics' },
    { chiave: 'contatti', icona: Users, colore: '#6b46c1', titolo: 'Contatti nuovi', valore: intero(dati.contatti.ora), ora: dati.contatti.ora, prima: dati.contatti.prima, fmt: intero, link: '/admin/contatti',
      nota: dati.contatti.invitabili === 1 ? '1 persona può ricevere le tue promozioni' : `${intero(dati.contatti.invitabili)} persone possono ricevere le tue promozioni` },
    dati.prenotazioni && { chiave: 'prenotazioni', icona: CalendarCheck, colore: '#2e7d32', titolo: 'Prenotazioni ricevute', valore: intero(dati.prenotazioni.ora), ora: dati.prenotazioni.ora, prima: dati.prenotazioni.prima, fmt: intero, link: '/admin/prenotazioni' },
    dati.incassi && { chiave: 'incassi', icona: Wallet, colore: '#b45309', titolo: 'Incassato online', valore: euro(dati.incassi.ora), ora: dati.incassi.ora, prima: dati.incassi.prima, fmt: euro, link: '/admin/pagamenti' },
  ].filter(Boolean) : []

  return (
    <section data-cruscotto style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '18px 20px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>Cosa succede</h3>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            Negli ultimi {giorni} giorni, confrontati con i {giorni} prima.
          </div>
        </div>
        <div role="group" aria-label="Periodo" style={{ display: 'flex', background: '#f2f2f4', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {[7, 30].map(g => (
            <button key={g} type="button" data-periodo={g} aria-pressed={giorni === g} onClick={() => setGiorni(g)}
              style={{ border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: giorni === g ? '#fff' : 'transparent', color: giorni === g ? '#1a1a2e' : '#666',
                boxShadow: giorni === g ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {g} giorni
            </button>
          ))}
        </div>
      </div>

      {errore && <div style={{ fontSize: 13, color: '#c53030' }}>Non riesco a leggere i numeri: {errore}</div>}
      {!dati && !errore && <div style={{ fontSize: 13, color: '#888' }}>Sto contando…</div>}

      {dati && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {riquadri.map(r => <Riquadro key={r.chiave} r={r} giorni={giorni} onApri={() => router.push(r.link)} />)}
        </div>
      )}

      {dati?.prossimoEvento && (
        <ProssimoEvento ev={dati.prossimoEvento} fuso={dati.fuso} onApri={() => router.push(`/admin/eventi/${dati.prossimoEvento.id}`)} />
      )}
    </section>
  )
}

function Riquadro({ r, giorni, onApri }) {
  const Icona = r.icona
  const diff = r.ora - r.prima
  const coloreDiff = diff > 0 ? '#2e7d32' : diff < 0 ? '#b45309' : '#666'
  return (
    <button type="button" data-riquadro={r.chiave} onClick={onApri}
      style={{ textAlign: 'left', border: '1px solid #eee', background: '#fafafa', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#555' }}>
        <Icona size={15} strokeWidth={1.5} color={r.colore} style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0 }}>{r.titolo}</span>
      </span>
      <span data-valore style={{ fontSize: 26, fontWeight: 700, color: r.colore, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{r.valore}</span>
      <span style={{ fontSize: 12, color: coloreDiff }}>
        {diff === 0 ? `Come i ${giorni} giorni prima` : `${diff > 0 ? '▲' : '▼'} ${giorni} giorni prima: ${r.fmt(r.prima)}`}
      </span>
      {r.nota && <span style={{ fontSize: 12, color: '#666' }}>{r.nota}</span>}
    </button>
  )
}

function ProssimoEvento({ ev, fuso, onApri }) {
  const data = new Date(ev.quando)
  const opz = fuso ? { timeZone: fuso } : {}
  const giorno = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', ...opz })
  const ora = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', ...opz })
  const pieno = ev.capienza ? Math.min(100, Math.round(ev.prenotati / ev.capienza * 100)) : null
  return (
    <button type="button" data-prossimo-evento onClick={onApri}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', marginTop: 10, border: '1px solid #eee', background: '#fafafa', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
      <CalendarDays size={18} strokeWidth={1.5} color="#0284c7" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, color: '#555' }}>Prossimo evento · {giorno}, {ora}</span>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{ev.titolo}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#444', marginTop: 2 }}>
          {ev.capienza ? `${ev.prenotati} posti prenotati su ${ev.capienza}` : `${ev.prenotati} posti prenotati`}
        </span>
        {pieno != null && (
          <span style={{ display: 'block', height: 6, borderRadius: 3, background: '#e6e6e6', overflow: 'hidden', marginTop: 6 }}>
            <span style={{ display: 'block', width: `${pieno}%`, height: '100%', background: pieno >= 90 ? '#b45309' : '#0284c7' }} />
          </span>
        )}
      </span>
      <ChevronRight size={18} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0 }} />
    </button>
  )
}
