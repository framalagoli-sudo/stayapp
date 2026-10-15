'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Users, CalendarCheck, Wallet, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { SCELTE_RESOCONTI } from '@/lib/resoconti-regole'

// «Cosa succede»: i numeri dell'attività in un colpo d'occhio, confrontati col
// periodo prima, leggibili dal telefono. I conti li fa lib/cruscotto.js; qui si
// disegnano e basta. Ogni riquadro porta alla pagina da cui il numero viene.
// Gli eventi in arrivo non stanno qui: hanno il loro riquadro «In programma».
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
    { chiave: 'visite', icona: Eye, colore: '#0f766e', titolo: 'Visite ai tuoi siti', valore: intero(dati.visite.ora), ora: dati.visite.ora, prima: dati.visite.prima, fmt: intero, link: '/admin/analytics' },
    { chiave: 'contatti', icona: Users, colore: '#6b46c1', titolo: 'Contatti nuovi', valore: intero(dati.contatti.ora), ora: dati.contatti.ora, prima: dati.contatti.prima, fmt: intero, link: '/admin/contatti',
      nota: dati.contatti.invitabili === 1 ? '1 persona può ricevere le tue promozioni' : `${intero(dati.contatti.invitabili)} persone possono ricevere le tue promozioni` },
    dati.prenotazioni && { chiave: 'prenotazioni', icona: CalendarCheck, colore: '#2e7d32', titolo: 'Prenotazioni ricevute', valore: intero(dati.prenotazioni.ora), ora: dati.prenotazioni.ora, prima: dati.prenotazioni.prima, fmt: intero, link: '/admin/prenotazioni' },
    dati.incassi && { chiave: 'incassi', icona: Wallet, colore: '#b45309', titolo: 'Incassato online', valore: euro(dati.incassi.ora), ora: dati.incassi.ora, prima: dati.incassi.prima, fmt: euro, link: '/admin/pagamenti' },
    dati.recensioni && { chiave: 'recensioni', icona: Star, colore: '#d97706', titolo: 'Le tue recensioni', valore: `${String(dati.recensioni.media).replace('.', ',')} ★`, link: '/admin/recensioni',
      nota: `${intero(dati.recensioni.totale)} in tutto · ${dati.recensioni.ora} ${dati.recensioni.ora === 1 ? 'nuova' : 'nuove'} in ${giorni} giorni` },
  ].filter(Boolean) : []

  return (
    <section data-cruscotto style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>Cosa succede</h3>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Ultimi {giorni} giorni, confrontati con i {giorni} prima.</div>
        </div>
        <div role="group" aria-label="Periodo" style={{ display: 'flex', background: '#e9e9ee', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {[7, 30].map(g => (
            <button key={g} type="button" data-periodo={g} aria-pressed={giorni === g} onClick={() => setGiorni(g)}
              style={{ border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: giorni === g ? '#fff' : 'transparent', color: giorni === g ? '#1a1a2e' : '#555',
                boxShadow: giorni === g ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>
              {g} giorni
            </button>
          ))}
        </div>
      </div>

      {errore && <div style={{ fontSize: 13, color: '#c53030' }}>Non riesco a leggere i numeri: {errore}</div>}
      {!dati && !errore && <div style={{ fontSize: 13, color: '#888' }}>Sto contando…</div>}

      {dati && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {riquadri.map(r => <Riquadro key={r.chiave} r={r} giorni={giorni} onApri={() => router.push(r.link)} />)}
        </div>
      )}

      {profile.role === 'super_admin' && <RiceviPerEmail key={aziendaId} aziendaId={aziendaId} />}
    </section>
  )
}

// Ogni quanto questa azienda riceve il resoconto per email (lib/resoconti.js).
// Lo decide OltreNova, quindi lo vede solo il super_admin che guarda l'azienda:
// il titolare non ha niente da scegliere (decisione di Francesco, 15/10/2026).
function RiceviPerEmail({ aziendaId }) {
  const [stato, setStato] = useState(null)
  const [salvato, setSalvato] = useState(false)
  const [errore, setErrore] = useState('')
  useEffect(() => {
    apiFetch(`/api/resoconti?azienda_id=${aziendaId}`).then(setStato).catch(e => setErrore(e.message))
  }, [aziendaId])
  if (!stato) return errore ? <div style={{ marginTop: 12, fontSize: 13, color: '#c53030' }}>Resoconto per email: {errore}</div> : null

  async function scegli(scelta) {
    const prima = stato.scelta
    setStato(s => ({ ...s, scelta })); setErrore(''); setSalvato(false)
    try {
      await apiFetch('/api/resoconti', { method: 'PATCH', body: JSON.stringify({ azienda_id: aziendaId, scelta }) })
      setSalvato(true); setTimeout(() => setSalvato(false), 2500)
    } catch (e) { setErrore(e.message); setStato(s => ({ ...s, scelta: prima })) }
  }

  return (
    <div id="resoconti" data-resoconti style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
      <label htmlFor="scelta-resoconti">Resoconto per email ai titolari:</label>
      <select id="scelta-resoconti" value={stato.scelta || 'mensile'} onChange={e => scegli(e.target.value)}
        style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', maxWidth: '100%' }}>
        {SCELTE_RESOCONTI.map(s => <option key={s.chiave} value={s.chiave}>{s.etichetta}</option>)}
      </select>
      {!stato.attivi && <span style={{ color: '#8a5a12' }}>· i resoconti sono spenti per tutti (Impostazioni): la scelta vale da quando li accendi</span>}
      {salvato && <span style={{ color: '#276749', fontWeight: 600 }}>Salvato</span>}
      {errore && <span style={{ color: '#c53030' }}>{errore}</span>}
    </div>
  )
}

function Riquadro({ r, giorni, onApri }) {
  const Icona = r.icona
  const confronta = r.prima != null
  const diff = confronta ? r.ora - r.prima : 0
  const coloreDiff = diff > 0 ? '#2e7d32' : diff < 0 ? '#b45309' : '#666'
  const Freccia = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  return (
    <button type="button" data-riquadro={r.chiave} onClick={onApri}
      style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', border: 'none', background: '#fff', borderRadius: 16, padding: '16px 16px 14px',
        cursor: 'pointer', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 2px 10px rgba(16,24,40,0.07)' }}>
      <span aria-hidden style={{ position: 'absolute', inset: '0 0 auto 0', height: 4, background: r.colore }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#555' }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: r.colore + '16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icona size={16} strokeWidth={1.5} color={r.colore} />
        </span>
        <span style={{ minWidth: 0, fontWeight: 600 }}>{r.titolo}</span>
      </span>
      <span data-valore style={{ fontSize: 30, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1, overflowWrap: 'anywhere', letterSpacing: -0.5 }}>{r.valore}</span>
      {confronta && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: coloreDiff }}>
          <Freccia size={14} strokeWidth={1.5} color={coloreDiff} style={{ flexShrink: 0 }} />
          {diff === 0 ? `Come i ${giorni} giorni prima` : `${giorni} giorni prima: ${r.fmt(r.prima)}`}
        </span>
      )}
      {r.nota && <span style={{ fontSize: 12, color: '#666' }}>{r.nota}</span>}
    </button>
  )
}
