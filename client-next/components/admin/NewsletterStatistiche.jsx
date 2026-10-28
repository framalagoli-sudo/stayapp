'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { MousePointerClick, MailOpen, Mail, AlertCircle } from 'lucide-react'

// Com'è andata una newsletter inviata. I numeri arrivano da Resend nelle ore
// dopo l'invio (GET /api/newsletter/[id]/statistiche).

const FILTRI = [
  { k: 'tutti',     label: 'Tutti',            f: () => true },
  { k: 'cliccato',  label: 'Hanno cliccato',   f: p => p.cliccata },
  { k: 'aperta',    label: 'L’hanno aperta',   f: p => p.aperta },
  { k: 'nonaperta', label: 'Non aperta',       f: p => !p.aperta && !p.rimbalzata },
  { k: 'problemi',  label: 'Non arrivata',     f: p => p.rimbalzata || p.spam },
]

const perc = (n, su) => su > 0 ? `${Math.round((n / su) * 100)}%` : '—'

function Numero({ valore, label, sotto, colore = '#1a1a2e' }) {
  return (
    <div style={{ background: '#f8f8fa', borderRadius: 10, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: colore }}>{valore}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginTop: 2 }}>{label}</div>
      {sotto && <div style={{ fontSize: 11, color: '#6b6b76', marginTop: 2 }}>{sotto}</div>}
    </div>
  )
}

function linkLeggibile(link) {
  try { const u = new URL(link); return (u.host + u.pathname).replace(/\/$/, '') } catch { return link }
}

export default function NewsletterStatistiche({ id }) {
  const [s, setS] = useState(null)
  const [errore, setErrore] = useState('')
  const [filtro, setFiltro] = useState('tutti')
  const [tutti, setTutti] = useState(false)

  useEffect(() => {
    apiFetch(`/api/newsletter/${id}/statistiche`).then(setS).catch(e => setErrore(e.message))
  }, [id])

  const box = { background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
  const titolo = <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>Com’è andata</div>

  if (errore) return <div style={box}>{titolo}<div style={{ fontSize: 13, color: '#c53030' }}>{errore}</div></div>
  if (!s) return <div style={box}>{titolo}<div style={{ fontSize: 13, color: '#6b6b76' }}>Carico i numeri…</div></div>

  if (!s.tracciata) return (
    <div data-statistiche style={box}>{titolo}
      <div style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>
        Inviata a <strong>{s.inviate}</strong> persone. Questa newsletter è partita prima che misurassimo aperture e clic:
        dalla prossima ogni invio avrà qui il suo resoconto.
      </div>
    </div>
  )

  const base = s.consegnate || s.inviate
  const persone = s.persone || []
  const filtrate = persone.filter(FILTRI.find(x => x.k === filtro).f)
    .sort((a, b) => (b.cliccata - a.cliccata) || (b.aperta - a.aperta) || a.nome.localeCompare(b.nome))
  const visibili = tutti ? filtrate : filtrate.slice(0, 25)

  return (
    <div data-statistiche style={box}>
      {titolo}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Numero valore={s.inviate} label="Inviate" sotto={s.consegnate ? `${s.consegnate} consegnate` : null} />
        <Numero valore={s.cliccate} label="Hanno cliccato" sotto={perc(s.cliccate, base)} colore="#276749" />
        <Numero valore={s.aperte} label="L’hanno aperta" sotto={`${perc(s.aperte, base)} · stima`} />
        <Numero valore={s.rimbalzate + s.spam} label="Non arrivate" sotto={s.spam ? `${s.spam} segnalate come spam` : 'indirizzo inesistente'} colore={s.rimbalzate + s.spam ? '#c53030' : '#1a1a2e'} />
        <Numero valore={s.disiscritti} label="Disiscritti" />
      </div>
      <div style={{ fontSize: 12, color: '#6b6b76', marginTop: 10, lineHeight: 1.5 }}>
        Il numero che conta sono i <strong>clic</strong>: sono persone che hanno fatto qualcosa.
        Le aperture sono una stima, perché Apple Mail apre da sola le email di chi lo usa, e altri programmi non lo dicono.
        I numeri arrivano nelle ore e nei giorni dopo l’invio.
      </div>

      {s.link.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Cosa hanno premuto</div>
          {s.link.map(l => (
            <div key={l.link} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f0f0f0', fontSize: 13 }}>
              <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{linkLeggibile(l.link)}</a>
              <span style={{ flexShrink: 0, fontWeight: 700 }}>{l.persone} {l.persone === 1 ? 'persona' : 'persone'}</span>
            </div>
          ))}
        </div>
      )}

      {persone.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Chi</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {FILTRI.map(x => {
              const n = persone.filter(x.f).length
              const on = filtro === x.k
              return (
                <button key={x.k} data-filtro={x.k} onClick={() => { setFiltro(x.k); setTutti(false) }} style={{
                  padding: '5px 11px', borderRadius: 16, border: '1px solid ' + (on ? '#1a1a2e' : '#e0e0e0'),
                  background: on ? '#1a1a2e' : '#fff', color: on ? '#fff' : '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{x.label} · {n}</button>
              )
            })}
          </div>
          {visibili.length === 0 && <div style={{ fontSize: 13, color: '#6b6b76' }}>Nessuno, per ora.</div>}
          {visibili.map(p => (
            <div key={p.contatto_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{p.nome || p.email || 'Contatto anonimo'}</div>
                {p.nome && p.email && <div style={{ fontSize: 12, color: '#6b6b76', overflowWrap: 'anywhere' }}>{p.email}</div>}
                {p.link.length > 0 && <div style={{ fontSize: 11, color: '#276749', overflowWrap: 'anywhere' }}>Ha premuto: {p.link.map(linkLeggibile).join(' · ')}</div>}
              </div>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                color: p.rimbalzata || p.spam ? '#c53030' : p.cliccata ? '#276749' : p.aperta ? '#1a1a2e' : '#6b6b76' }}>
                {p.rimbalzata || p.spam ? <><AlertCircle size={13} strokeWidth={1.5} /> {p.spam ? 'Spam' : 'Non arrivata'}</>
                  : p.cliccata ? <><MousePointerClick size={13} strokeWidth={1.5} /> Cliccato</>
                  : p.aperta ? <><MailOpen size={13} strokeWidth={1.5} /> Aperta</>
                  : <><Mail size={13} strokeWidth={1.5} /> Non aperta</>}
              </span>
            </div>
          ))}
          {!tutti && filtrate.length > 25 && (
            <button onClick={() => setTutti(true)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
              Mostra tutte le {filtrate.length} persone
            </button>
          )}
        </div>
      )}
    </div>
  )
}
