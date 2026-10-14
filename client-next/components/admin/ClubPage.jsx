'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, ChevronRight, Sparkles, Trash2, Eye, MousePointerClick, ChevronDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { ricco } from '@/lib/testo-ricco'
import { TIPI, AZIONI, oggiIso } from '@/lib/club-regole'
import { COLORE_TIPO, segnaGesto } from '@/components/admin/ClubOggi'
import RegiaConsigli from '@/components/admin/RegiaConsigli'

// Il Club: per il cliente l'archivio di occasioni, focus e strategie; per il
// super_admin anche la regia, dove i contenuti si preparano (con l'AI), si
// programmano e si vede quante aziende li hanno letti.
export default function ClubPage() {
  const { profile } = useAuth()
  const superAdmin = profile?.role === 'super_admin'
  const [scheda, setScheda] = useState('club')
  if (!profile) return null
  if (!['admin_azienda', 'super_admin'].includes(profile.role)) return <p style={{ color: '#888' }}>Il Club è riservato al titolare dell'attività.</p>
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Compass size={24} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Club OltreNova</h1>
      </div>
      <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px' }}>Occasioni da non perdere e strategie di marketing scelte per la tua attività.</p>
      {superAdmin && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
          {[['club', 'Come lo vede un cliente'], ['regia', 'Regia: contenuti'], ['consigli', 'Regia: consigli personali']].map(([k, n]) => (
            <button key={k} type="button" data-scheda={k} onClick={() => setScheda(k)}
              style={{ flexShrink: 0, whiteSpace: 'nowrap', border: '1px solid #ddd', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: scheda === k ? '#1a1a2e' : '#fff', color: scheda === k ? '#fff' : '#1a1a2e' }}>{n}</button>
          ))}
        </div>
      )}
      {superAdmin && scheda === 'regia' ? <Regia /> : superAdmin && scheda === 'consigli' ? <RegiaConsigli /> : <Archivio />}
    </div>
  )
}

// ── Quello che legge il cliente ─────────────────────────────────────────────
function Archivio() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda()
  const aziendaId = profile?.role === 'super_admin' ? (azienda?.id || activeAziendaId) : null
  const [dati, setDati] = useState(null)
  const [aperto, setAperto] = useState(null)

  useEffect(() => {
    try { setAperto(new URLSearchParams(window.location.search).get('apri')) } catch {}
    apiFetch(`/api/club${aziendaId ? `?azienda_id=${aziendaId}` : ''}`).then(setDati).catch(() => setDati({ oggi: [], archivio: [] }))
  }, [aziendaId])

  useEffect(() => {
    if (!aperto || !dati) return
    segnaGesto(aperto, 'visto')
    document.querySelector(`[data-club-voce="${aperto}"]`)?.scrollIntoView({ block: 'start' })
  }, [aperto, dati])

  if (!dati) return <p style={{ color: '#888' }}>Carico il Club…</p>
  if (!dati.archivio.length) return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 28, textAlign: 'center', color: '#666', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      I primi contenuti del Club arrivano a breve.
    </div>
  )

  const oggi = oggiIso()
  const gruppi = [
    ['Occasioni in arrivo', dati.archivio.filter(c => c.tipo === 'occasione' && c.data_occasione >= oggi).sort((a, b) => a.data_occasione.localeCompare(b.data_occasione))],
    ['Il focus', dati.archivio.filter(c => c.tipo === 'focus')],
    ['Strategie', dati.archivio.filter(c => c.tipo === 'strategia')],
    ['Occasioni passate', dati.archivio.filter(c => c.tipo === 'occasione' && c.data_occasione < oggi)],
  ].filter(([, v]) => v.length)

  return gruppi.map(([titolo, voci]) => (
    <section key={titolo} style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>{titolo}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
        {voci.map(c => {
          const espanso = aperto === c.id
          return (
            <article key={c.id} data-club-voce={c.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px 18px', scrollMarginTop: 80 }}>
              <button type="button" onClick={() => { setAperto(espanso ? null : c.id); if (!espanso) segnaGesto(c.id, 'visto') }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: COLORE_TIPO[c.tipo], textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {TIPI[c.tipo]?.nome}{c.quando ? ` · ${c.quando}` : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginTop: 3, overflowWrap: 'anywhere' }}>{c.titolo}</span>
                </span>
                <ChevronDown size={18} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0, transform: espanso ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {espanso && (
                <>
                  <div data-club-testo style={{ fontSize: 14.5, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-line', marginTop: 12, overflowWrap: 'anywhere' }} {...ricco(c.testo)} />
                  {c.azione && (
                    <button type="button" data-azione onClick={() => { segnaGesto(c.id, 'clic'); router.push(c.azione.link) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                      {c.azione.testo} <ChevronRight size={15} strokeWidth={1.5} color="#fff" />
                    </button>
                  )}
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  ))
}

// ── La regia (solo super_admin) ─────────────────────────────────────────────
const VUOTO = { tipo: 'strategia', titolo: '', testo: '', mestieri: [], data_occasione: '', visibile_dal: '', visibile_al: '', azione: '', stato: 'bozza' }
const meno = (iso, giorni) => new Date(new Date(iso + 'T00:00:00Z').getTime() - giorni * 864e5).toISOString().slice(0, 10)
const campo = { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 8, padding: '9px 11px', fontSize: 14, fontFamily: 'inherit' }
const etichetta = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#444', margin: '12px 0 5px' }

function Regia() {
  const [dati, setDati] = useState(null)
  const [modulo, setModulo] = useState(null)   // null = elenco; oggetto = in modifica
  const [idea, setIdea] = useState('')
  const [lavoro, setLavoro] = useState('')
  const [errore, setErrore] = useState('')

  const carica = () => apiFetch('/api/club/regia').then(setDati).catch(e => setErrore(e.message))
  useEffect(() => { carica() }, [])

  function nuovo(base = {}) { setErrore(''); setIdea(base.idea || ''); setModulo({ ...VUOTO, visibile_dal: oggiIso(), ...base }) }
  const cambia = (k, v) => setModulo(m => ({ ...m, [k]: v }))

  async function bozzaAI() {
    setErrore(''); setLavoro('ai')
    try {
      const nomi = (dati?.mestieri || []).filter(m => modulo.mestieri.includes(m.chiave)).map(m => m.nome)
      const r = await apiFetch('/api/club/regia/bozza', { method: 'POST', body: JSON.stringify({ tipo: modulo.tipo, idea, mestieri: nomi, data_occasione: modulo.data_occasione || null }) })
      setModulo(m => ({ ...m, titolo: r.titolo || m.titolo, testo: r.testo || m.testo, azione: r.azione || m.azione }))
    } catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }

  async function salva(stato) {
    setErrore(''); setLavoro('salva')
    const corpo = JSON.stringify({ ...modulo, stato, mestieri: modulo.mestieri.length ? modulo.mestieri : null })
    try {
      if (modulo.id) await apiFetch(`/api/club/regia/${modulo.id}`, { method: 'PATCH', body: corpo })
      else await apiFetch('/api/club/regia', { method: 'POST', body: corpo })
      setModulo(null); await carica()
    } catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }

  async function elimina() {
    if (!window.confirm(`Eliminare «${modulo.titolo}»? Sparisce dal Club di tutti i clienti.`)) return
    setLavoro('salva')
    try { await apiFetch(`/api/club/regia/${modulo.id}`, { method: 'DELETE' }); setModulo(null); await carica() }
    catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }

  if (!dati) return <p style={{ color: errore ? '#c53030' : '#888' }}>{errore || 'Carico la regia…'}</p>

  if (modulo) return (
    <div data-regia-modulo style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '18px 20px' }}>
      <button type="button" onClick={() => setModulo(null)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>← Torna all'elenco</button>

      <label style={etichetta}>Tipo</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(TIPI).map(([k, t]) => (
          <button key={k} type="button" data-tipo={k} onClick={() => cambia('tipo', k)}
            style={{ border: `1px solid ${modulo.tipo === k ? COLORE_TIPO[k] : '#ddd'}`, background: modulo.tipo === k ? COLORE_TIPO[k] : '#fff', color: modulo.tipo === k ? '#fff' : '#1a1a2e', borderRadius: 20, padding: '6px 13px', fontSize: 13, cursor: 'pointer' }}>{t.nome}</button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: '#666', marginTop: 5 }}>{TIPI[modulo.tipo].descrizione}</div>

      <label style={etichetta}>Per chi</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => cambia('mestieri', [])}
          style={{ border: '1px solid #ddd', borderRadius: 20, padding: '6px 13px', fontSize: 13, cursor: 'pointer', background: modulo.mestieri.length ? '#fff' : '#1a1a2e', color: modulo.mestieri.length ? '#1a1a2e' : '#fff' }}>Tutti</button>
        {dati.mestieri.map(m => {
          const su = modulo.mestieri.includes(m.chiave)
          return (
            <button key={m.chiave} type="button" onClick={() => cambia('mestieri', su ? modulo.mestieri.filter(x => x !== m.chiave) : [...modulo.mestieri, m.chiave])}
              style={{ border: '1px solid #ddd', borderRadius: 20, padding: '6px 13px', fontSize: 13, cursor: 'pointer', background: su ? '#1a1a2e' : '#fff', color: su ? '#fff' : '#1a1a2e' }}>{m.nome}</button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0 12px' }}>
        {modulo.tipo === 'occasione' && (
          <div><label style={etichetta}>Giorno dell'occasione</label>
            <input type="date" data-campo="data_occasione" value={modulo.data_occasione || ''} onChange={e => cambia('data_occasione', e.target.value)} style={campo} /></div>
        )}
        <div><label style={etichetta}>In vetrina dal</label>
          <input type="date" value={modulo.visibile_dal || ''} onChange={e => cambia('visibile_dal', e.target.value)} style={campo} /></div>
        <div><label style={etichetta}>Fino al (facoltativo)</label>
          <input type="date" value={modulo.visibile_al || ''} onChange={e => cambia('visibile_al', e.target.value)} style={campo} /></div>
      </div>

      <div style={{ background: '#f6f7fb', borderRadius: 10, padding: '12px 14px', marginTop: 16 }}>
        <label style={{ ...etichetta, marginTop: 0 }}>L'idea in due righe — l'AI la sviluppa</label>
        <textarea data-idea value={idea} onChange={e => setIdea(e.target.value)} rows={3} style={campo}
          placeholder="Es. per Halloween un locale può fare una serata a tema: come annunciarla, a chi scrivere, quando" />
        <button type="button" data-scrivi-ai onClick={bozzaAI} disabled={!idea.trim() || !!lavoro}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !idea.trim() || lavoro ? 0.6 : 1 }}>
          <Sparkles size={15} strokeWidth={1.5} color="#fff" /> {lavoro === 'ai' ? 'Sto scrivendo…' : 'Scrivi la bozza con l\'AI'}
        </button>
      </div>

      <label style={etichetta}>Titolo</label>
      <input data-campo="titolo" value={modulo.titolo} onChange={e => cambia('titolo', e.target.value)} maxLength={160} style={campo} />
      <label style={etichetta}>Testo</label>
      <textarea data-campo="testo" value={modulo.testo} onChange={e => cambia('testo', e.target.value)} rows={12} style={{ ...campo, lineHeight: 1.5 }} />
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Paragrafi separati da una riga vuota. Per il grassetto: &lt;b&gt;parola&lt;/b&gt;.</div>
      <label style={etichetta}>Pulsante</label>
      <select data-campo="azione" value={modulo.azione || ''} onChange={e => cambia('azione', e.target.value)} style={campo}>
        <option value="">Nessun pulsante</option>
        {Object.entries(AZIONI).map(([k, a]) => <option key={k} value={k}>{a.testo}</option>)}
      </select>

      {errore && <div style={{ color: '#c53030', fontSize: 13, marginTop: 12 }}>{errore}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="button" data-pubblica onClick={() => salva('pubblicato')} disabled={!!lavoro}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Pubblica</button>
        <button type="button" data-salva-bozza onClick={() => salva('bozza')} disabled={!!lavoro}
          style={{ background: '#fff', color: '#1a1a2e', border: '1px solid #ccc', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Salva come bozza</button>
        {modulo.id && (
          <button type="button" onClick={elimina} disabled={!!lavoro}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', color: '#c53030', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={14} strokeWidth={1.5} color="#c53030" /> Elimina
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>«Pubblica»: i clienti lo vedono dal giorno «In vetrina dal». Una bozza non la vede nessuno.</div>
    </div>
  )

  return (
    <div>
      <button type="button" data-nuovo onClick={() => nuovo()}
        style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 18 }}>+ Nuovo contenuto</button>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Occasioni in arrivo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 24 }}>
        {dati.occasioni.map(o => {
          const fatta = dati.contenuti.some(c => c.tipo === 'occasione' && c.data_occasione === o.data)
          return (
            <button key={o.data} type="button" data-occasione={o.data}
              onClick={() => nuovo({ tipo: 'occasione', data_occasione: o.data, visibile_dal: [meno(o.data, 14), oggiIso()].sort()[1], visibile_al: o.data, idea: `${o.nome}: come può sfruttarla un'attività` })}
              style={{ textAlign: 'left', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
              <span style={{ display: 'block', fontSize: 12, color: '#666' }}>{new Date(o.data + 'T00:00:00Z').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{o.nome}</span>
              <span style={{ display: 'block', fontSize: 12, color: fatta ? '#2e7d32' : '#6b21a8', marginTop: 3 }}>{fatta ? 'Già preparata' : 'Prepara →'}</span>
            </button>
          )
        })}
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Tutti i contenuti</h2>
      {!dati.contenuti.length && <p style={{ color: '#666', fontSize: 14 }}>Ancora nessuno. Parti da un'occasione qui sopra o da «Nuovo contenuto».</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
        {dati.contenuti.map(c => (
          <button key={c.id} type="button" data-regia-voce={c.id}
            onClick={() => nuovo({ ...c, mestieri: c.mestieri || [], data_occasione: c.data_occasione || '', visibile_al: c.visibile_al || '', azione: c.azione || '' })}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '11px 14px', cursor: 'pointer', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 240px', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: COLORE_TIPO[c.tipo], textTransform: 'uppercase' }}>
                {TIPI[c.tipo]?.nome} · {c.stato === 'pubblicato' ? `in vetrina dal ${c.visibile_dal}` : 'bozza'}
              </span>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.titolo}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#666' }}>
                {c.mestieri?.length ? dati.mestieri.filter(m => c.mestieri.includes(m.chiave)).map(m => m.nome).join(', ') : 'Per tutti'}
              </span>
            </span>
            <span style={{ display: 'flex', gap: 12, fontSize: 12.5, color: '#444', flexShrink: 0 }} title="Aziende che l'hanno visto · che hanno premuto il pulsante">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={14} strokeWidth={1.5} /> {c.letture.visto}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MousePointerClick size={14} strokeWidth={1.5} /> {c.letture.clic}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
