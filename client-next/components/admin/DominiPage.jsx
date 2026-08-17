'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  Globe, Plus, Trash2, CheckCircle, AlertCircle, Copy, ExternalLink, RefreshCw,
  Pencil, X, Check, ArrowRight, ShieldCheck, Loader, ArrowUpRight,
} from 'lucide-react'
import { useProperty } from '@/hooks/useProperty'

const STAYAPP_DOMAIN = process.env.NEXT_PUBLIC_STAYAPP_DOMAIN?.trim() || 'oltrenova.com'

const C = {
  testo: '#1a1a2e', tenue: '#888', bordo: '#eee',
  ok: '#2e7d32', okBg: '#f4fbf5', okBordo: '#c8e6c9',
  attesa: '#e65100', attesaBg: '#fffaf5', attesaBordo: '#ffe0b2',
  errore: '#c62828', erroreBg: '#fff5f5', erroreBordo: '#ffcdd2',
  info: '#1565c0', infoBg: '#f6f9ff', infoBordo: '#dde6ff',
}

// Mentre un dominio è in attesa la pagina si ricontrolla da sola: chi collega un
// dominio non deve restare a premere un pulsante per capire se ha funzionato.
const RICONTROLLO_MS = 45000
const RICONTROLLI_MAX = 20

export default function DominiPage({ entityTipo }) {
  const { id: paramId } = useParams()
  const { property } = useProperty()
  const entityId = paramId || (entityTipo === 'struttura' ? property?.id : null)

  const [domini, setDomini] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiato, setCopiato] = useState('')
  const tentativi = useRef(0)

  useEffect(() => {
    if (entityId) carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId])

  // Ricontrollo automatico finché qualcosa è in attesa.
  useEffect(() => {
    const inAttesa = domini.filter(d => d.stato !== 'attivo')
    if (!inAttesa.length || tentativi.current >= RICONTROLLI_MAX) return
    const t = setTimeout(async () => {
      tentativi.current++
      for (const d of inAttesa) await controlla(d.id, { silenzioso: true })
    }, RICONTROLLO_MS)
    return () => clearTimeout(t)
  }, [domini])

  async function carica() {
    setLoading(true)
    try {
      setDomini(await apiFetch(`/api/domini?entity_tipo=${entityTipo}&entity_id=${entityId}`))
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function aggiungi(dominio) {
    const nuovo = await apiFetch('/api/domini', {
      method: 'POST',
      body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, dominio }),
    })
    tentativi.current = 0
    setDomini(prev => [...prev, nuovo])
  }

  async function controlla(id, { silenzioso = false } = {}) {
    try {
      const agg = await apiFetch(`/api/domini/${id}/verify`, { method: 'POST' })
      setDomini(prev => prev.map(d => d.id === id ? agg : d))
      return agg
    } catch (e) { if (!silenzioso) setError(e.message) }
  }

  async function rimuovi(id, dominio, avviso) {
    if (!confirm(avviso || `Scollegare ${dominio}?\n\nIl sito resterà online sul tuo indirizzo ${STAYAPP_DOMAIN}.`)) return
    try {
      await apiFetch(`/api/domini/${id}`, { method: 'DELETE' })
      setDomini(prev => prev.filter(d => d.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function rinomina(id, slug) {
    const agg = await apiFetch(`/api/domini/${id}`, { method: 'PATCH', body: JSON.stringify({ slug }) })
    setDomini(prev => prev.map(d => d.id === id ? agg : d))
  }

  function copia(valore) {
    navigator.clipboard.writeText(valore)
    setCopiato(valore)
    setTimeout(() => setCopiato(''), 2000)
  }

  const incluso = domini.find(d => d.tipo === 'subdomain')
  const personali = domini.filter(d => d.tipo === 'custom')
  const precedenti = domini.filter(d => d.tipo === 'alias')

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Globe size={22} strokeWidth={1.5} color={C.testo} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Indirizzo del sito</h1>
      </div>
      <p style={{ margin: '0 0 26px', fontSize: 14, color: C.tenue, lineHeight: 1.5 }}>
        Qui decidi a quale indirizzo web si raggiunge il tuo sito. Ne hai già uno incluso e pronto;
        se possiedi un dominio tuo, puoi collegarlo.
      </p>

      {error && (
        <div style={{ display: 'flex', gap: 8, background: C.erroreBg, color: C.errore, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <AlertCircle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ overflowWrap: 'anywhere' }}>{error}</span>
        </div>
      )}

      <Scheda
        titolo="Il tuo indirizzo incluso"
        etichetta="Sempre attivo"
        etichettaColore={C.ok}
        etichettaSfondo={C.okBg}
        descrizione={`Funziona da subito, senza configurare niente. Puoi usarlo per i QR code e per condividere il sito.`}
      >
        {loading
          ? <Attesa testo="Carico…" />
          : incluso
            ? <CardIncluso dom={incluso} onCopia={copia} copiato={copiato} onRinomina={rinomina} onControlla={controlla} />
            : <Attesa testo="Preparo il tuo indirizzo…" />}
        <IndirizziPrecedenti alias={precedenti} onRimuovi={rimuovi} />
      </Scheda>

      <Scheda
        titolo="Il tuo dominio"
        etichetta="Opzionale"
        etichettaColore={C.info}
        etichettaSfondo="#e3f2fd"
        descrizione="Hai già comprato un dominio, ad esempio da Aruba o GoDaddy? Collegalo qui: i visitatori vedranno il tuo nome nella barra del browser."
      >
        {personali.map(dom => (
          <CardDominio
            key={dom.id}
            dom={dom}
            onCopia={copia}
            copiato={copiato}
            onControlla={controlla}
            onRimuovi={rimuovi}
          />
        ))}
        {!loading && <FormAggiunta onAggiungi={aggiungi} primo={personali.length === 0} />}
      </Scheda>
    </div>
  )
}

// ── Contenitori ───────────────────────────────────────────────────────────────

function Scheda({ titolo, etichetta, etichettaColore, etichettaSfondo, descrizione, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.bordo}`, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.testo }}>{titolo}</span>
        <span style={{ fontSize: 11, background: etichettaSfondo, color: etichettaColore, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{etichetta}</span>
      </div>
      <p style={{ fontSize: 13, color: C.tenue, margin: '0 0 18px', lineHeight: 1.5 }}>{descrizione}</p>
      {children}
    </div>
  )
}

function Attesa({ testo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 13, padding: '10px 0' }}>
      <Loader size={14} strokeWidth={1.5} /> {testo}
    </div>
  )
}

function BottoneCopia({ valore, copiato, onCopia, etichetta = 'Copia' }) {
  const attivo = copiato === valore
  return (
    <button
      onClick={() => onCopia(valore)}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: attivo ? C.okBg : '#f5f5f5', color: attivo ? C.ok : '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
    >
      {attivo ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      {attivo ? 'Copiato!' : etichetta}
    </button>
  )
}

function Stato({ stato }) {
  const s = stato === 'attivo'
    ? { testo: 'Online', colore: C.ok, sfondo: C.okBg, icona: ShieldCheck }
    : stato === 'errore'
      ? { testo: 'Da correggere', colore: C.errore, sfondo: C.erroreBg, icona: AlertCircle }
      : { testo: 'In preparazione', colore: C.attesa, sfondo: C.attesaBg, icona: Loader }
  const Icona = s.icona
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: s.colore, background: s.sfondo, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
      <Icona size={13} strokeWidth={1.5} color={s.colore} /> {s.testo}
    </span>
  )
}

// ── Indirizzo incluso ─────────────────────────────────────────────────────────

function CardIncluso({ dom, onCopia, copiato, onRinomina, onControlla }) {
  const url = `https://${dom.dominio}`
  const nomeAttuale = dom.dominio.replace(`.${STAYAPP_DOMAIN}`, '')
  const [modifica, setModifica] = useState(false)
  const [nome, setNome] = useState(nomeAttuale)
  const [salvo, setSalvo] = useState(false)
  const [erroreSalva, setErroreSalva] = useState('')
  const [controllo, setControllo] = useState(false)

  useEffect(() => { setNome(nomeAttuale) }, [nomeAttuale])

  async function salva() {
    const pulito = nome.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    if (!pulito || pulito === nomeAttuale) { setModifica(false); setNome(nomeAttuale); return }
    if (!confirm(`Il tuo indirizzo diventerà:\n${pulito}.${STAYAPP_DOMAIN}\n\nIl precedente continuerà a funzionare e porterà automaticamente al nuovo, quindi i QR già stampati restano validi.`)) return
    setSalvo(true); setErroreSalva('')
    try {
      await onRinomina(dom.id, pulito)
      setModifica(false)
    } catch (e) { setErroreSalva(e.message) }
    setSalvo(false)
  }

  if (modifica) {
    return (
      <div style={{ background: C.infoBg, border: `1px solid ${C.infoBordo}`, borderRadius: 10, padding: '16px 18px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: C.testo }}>Scegli il tuo indirizzo</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${C.testo}`, borderRadius: 8, overflow: 'hidden', flex: 1, minWidth: 240, background: '#fff' }}>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') salva(); if (e.key === 'Escape') { setNome(nomeAttuale); setModifica(false) } }}
              style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: 'none', outline: 'none', fontSize: 15, fontWeight: 700 }}
            />
            <span style={{ padding: '9px 12px', background: '#f5f5f5', fontSize: 13, color: C.tenue, whiteSpace: 'nowrap' }}>.{STAYAPP_DOMAIN}</span>
          </div>
          <button onClick={salva} disabled={salvo} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.testo, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvo ? 0.6 : 1 }}>
            <Check size={14} strokeWidth={2} /> {salvo ? 'Salvo…' : 'Salva'}
          </button>
          <button onClick={() => { setNome(nomeAttuale); setModifica(false) }} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 6 }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        {erroreSalva && <p style={{ margin: '10px 0 0', fontSize: 12, color: C.errore }}>{erroreSalva}</p>}
        <p style={{ margin: '10px 0 0', fontSize: 12, color: C.tenue }}>Solo lettere minuscole, numeri e trattini.</p>
      </div>
    )
  }

  const online = dom.stato === 'attivo'
  return (
    <div style={{ background: online ? C.okBg : C.attesaBg, border: `1px solid ${online ? C.okBordo : C.attesaBordo}`, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 16, color: C.testo, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflowWrap: 'anywhere' }}>
          {dom.dominio}
          <ExternalLink size={14} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
        </a>
        <Stato stato={dom.stato} />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <BottoneCopia valore={url} copiato={copiato} onCopia={onCopia} etichetta="Copia link" />
          <button onClick={() => setModifica(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <Pencil size={13} strokeWidth={1.5} /> Personalizza
          </button>
        </div>
      </div>
      {!online && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 12, color: C.attesa, flex: 1, minWidth: 200 }}>
            {dom.verifica_dettaglio?.messaggio || 'Stiamo attivando il tuo indirizzo, ci vuole meno di un minuto.'}
          </p>
          <button
            onClick={async () => { setControllo(true); await onControlla(dom.id); setControllo(false) }}
            disabled={controllo}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', color: C.attesa, border: `1px solid ${C.attesaBordo}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: controllo ? 0.6 : 1 }}
          >
            <RefreshCw size={13} strokeWidth={1.5} /> {controllo ? 'Controllo…' : 'Controlla'}
          </button>
        </div>
      )}
    </div>
  )
}

// Indirizzi usati in passato: restano attivi e portano a quello nuovo, così i QR
// stampati e i link già in circolazione continuano a funzionare.
function IndirizziPrecedenti({ alias, onRimuovi }) {
  if (!alias.length) return null
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.bordo}` }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.tenue }}>
        Indirizzi precedenti — continuano a funzionare e portano a quello attuale
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6 }}>
        {alias.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa', border: `1px solid ${C.bordo}`, borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#555', overflowWrap: 'anywhere' }}>{a.dominio}</span>
            <ArrowRight size={13} strokeWidth={1.5} color="#bbb" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.testo, fontWeight: 600, overflowWrap: 'anywhere' }}>{a.redirect_a}</span>
            <button
              onClick={() => onRimuovi(a.id, a.dominio, `Rimuovere il vecchio indirizzo ${a.dominio}?\n\nDa quel momento i QR code e i link che lo usano smetteranno di funzionare.`)}
              title="Rimuovi"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, display: 'flex' }}
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Aggiunta dominio ──────────────────────────────────────────────────────────

function FormAggiunta({ onAggiungi, primo }) {
  const [valore, setValore] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!valore.trim()) return
    setInvio(true); setErrore('')
    try {
      await onAggiungi(valore.trim())
      setValore('')
    } catch (e) { setErrore(e.message) }
    setInvio(false)
  }

  return (
    <div style={{ marginTop: primo ? 0 : 18, paddingTop: primo ? 0 : 18, borderTop: primo ? 'none' : `1px solid ${C.bordo}` }}>
      {primo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.infoBg, border: `1px solid ${C.infoBordo}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#555' }}>I visitatori vedranno</span>
          <code style={{ fontWeight: 700, fontSize: 13, color: C.testo, background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '3px 10px' }}>www.iltuosito.it</code>
          <ArrowRight size={14} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#555' }}>invece dell’indirizzo {STAYAPP_DOMAIN}</span>
        </div>
      )}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={valore}
          onChange={e => setValore(e.target.value)}
          placeholder="www.iltuosito.it"
          style={{ flex: 1, minWidth: 220, padding: '11px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={invio || !valore.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.testo, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: invio || !valore.trim() ? 0.5 : 1 }}
        >
          <Plus size={15} strokeWidth={1.5} /> {invio ? 'Collego…' : 'Collega'}
        </button>
      </form>
      {errore && <p style={{ margin: '10px 0 0', fontSize: 13, color: C.errore, overflowWrap: 'anywhere' }}>{errore}</p>}
      <p style={{ margin: '10px 0 0', fontSize: 12, color: C.tenue }}>
        Serve un dominio già acquistato. Non serve spostarlo: resta dove l’hai comprato, cambiano solo due impostazioni.
      </p>
    </div>
  )
}

// ── Dominio personalizzato ────────────────────────────────────────────────────

function CardDominio({ dom, onCopia, copiato, onControlla, onRimuovi }) {
  const [controllo, setControllo] = useState(false)
  const url = `https://${dom.dominio}`
  const d = dom.verifica_dettaglio || {}
  const online = dom.stato === 'attivo'
  const records = dom.dns_istruzioni?.records || d.records || []
  const verificaTxt = dom.dns_istruzioni?.verifica_txt || []

  async function controlla() {
    setControllo(true)
    await onControlla(dom.id)
    setControllo(false)
  }

  const passo = online ? 3 : (d.fase === 'certificato' ? 3 : 2)

  return (
    <div style={{ border: `1px solid ${online ? C.okBordo : C.attesaBordo}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: online ? C.okBg : C.attesaBg, flexWrap: 'wrap' }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 16, color: C.testo, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflowWrap: 'anywhere' }}>
          {dom.dominio}
          <ExternalLink size={14} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
        </a>
        <Stato stato={dom.stato} />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {online && <BottoneCopia valore={url} copiato={copiato} onCopia={onCopia} etichetta="Copia link" />}
          <button onClick={() => onRimuovi(dom.id, dom.dominio)} title="Scollega" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, display: 'flex' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {online ? (
        <>
          <div style={{ padding: '14px 18px', background: '#fff', fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ShieldCheck size={15} strokeWidth={1.5} color={C.ok} style={{ flexShrink: 0 }} />
            Il dominio è collegato e protetto da certificato di sicurezza.
            {d.gemello?.raggiungibile && <span style={{ color: C.tenue }}>Funziona anche <strong>{d.gemello.dominio}</strong>.</span>}
          </div>
          <Gemello gemello={d.gemello} provider={d.provider} onCopia={onCopia} copiato={copiato} />
        </>
      ) : (
        <>
          <Passi passo={passo} />
          <Diagnosi d={d} records={records} />
          <IstruzioniDns fase={d.fase} records={records} verificaTxt={verificaTxt} provider={d.provider} onCopia={onCopia} copiato={copiato} />
          <div style={{ padding: '14px 18px', background: C.attesaBg, borderTop: `1px solid ${C.attesaBordo}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 12, color: C.tenue, flex: 1, minWidth: 200 }}>
              Controlliamo da soli ogni minuto: puoi anche chiudere questa pagina e tornare più tardi.
            </p>
            <button
              onClick={controlla}
              disabled={controllo}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.attesa, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0, opacity: controllo ? 0.6 : 1 }}
            >
              <RefreshCw size={14} strokeWidth={1.5} /> {controllo ? 'Controllo…' : 'Controlla adesso'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Il dominio principale può funzionare mentre l'altra sua forma (con o senza www)
// è spenta: chi digita l'indirizzo a mano non arriva. Va detto anche quando tutto
// il resto è verde, altrimenti il problema resta invisibile.
function Gemello({ gemello, provider, onCopia, copiato }) {
  if (!gemello || gemello.raggiungibile) return null
  return (
    <div style={{ padding: '14px 18px', background: C.attesaBg, borderTop: `1px solid ${C.attesaBordo}` }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 10 }}>
        <AlertCircle size={16} strokeWidth={1.5} color={C.attesa} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.testo }}>
            Manca l’indirizzo {gemello.senza_www ? 'senza «www»' : 'con «www»'}: <strong>{gemello.dominio}</strong>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            Chi lo digita così trova un errore del browser. Succede spesso a chi legge l’indirizzo
            su un volantino o su un biglietto da visita. Si risolve aggiungendo un record
            {provider?.nome ? <> su <strong>{provider.nome}</strong></> : ' dal tuo provider'}.
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
        {gemello.records.map((r, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.attesaBordo}` }}>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: '#fff', background: C.testo, padding: '2px 8px', borderRadius: 4 }}>{r.tipo}</span>
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>TTL: {r.ttl || 'Auto'}</span>
            </div>
            <CampoRecord etichetta="Nome" valore={r.nome} onCopia={onCopia} copiato={copiato} />
            <CampoRecord etichetta="Valore" valore={r.valore} onCopia={onCopia} copiato={copiato} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Passi({ passo }) {
  const etichette = ['Dominio aggiunto', 'Imposta i DNS', 'Sito online']
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', background: '#fffdf9', borderTop: `1px solid ${C.attesaBordo}` }}>
      {etichette.map((label, i) => {
        const n = i + 1
        const fatto = n < passo
        const corrente = n === passo
        return (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <div style={{ flex: 1, height: 2, background: fatto ? C.ok : C.attesaBordo, margin: '0 8px', minWidth: 12 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: fatto ? C.ok : corrente ? C.attesa : '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {fatto
                  ? <Check size={12} strokeWidth={2.5} color="#fff" />
                  : <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{n}</span>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: fatto ? C.ok : corrente ? C.attesa : '#aaa', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Il punto in cui di solito ci si blocca: capire se i DNS sono giusti. Invece di
// un generico "in attesa", mostriamo dove punta il dominio adesso e dove dovrebbe.
function Diagnosi({ d, records }) {
  if (!d.messaggio) return null
  const attuali = [...(d.dns_attuale?.a || []), ...(d.dns_attuale?.cname || [])]
  const attesi = records.map(r => r.valore)
  // Il confronto si mostra solo quando i DNS sono davvero da sistemare. Vercel
  // accetta più valori equivalenti (es. il CNAME generico oltre a quello del
  // nostro account): segnalare "punta altrove" quando funziona già spingerebbe
  // il cliente a cambiare una configurazione corretta.
  const daCorreggere = d.fase === 'dns_errato' || d.fase === 'dns_mancante'
  const puntaAltrove = daCorreggere && attuali.length > 0
  const inEmissione = d.fase === 'certificato'

  return (
    <div style={{ padding: '14px 18px', background: inEmissione ? C.okBg : '#fff', borderTop: `1px solid ${C.attesaBordo}` }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        {inEmissione
          ? <Loader size={16} strokeWidth={1.5} color={C.ok} style={{ flexShrink: 0, marginTop: 1 }} />
          : <AlertCircle size={16} strokeWidth={1.5} color={C.attesa} style={{ flexShrink: 0, marginTop: 1 }} />}
        <p style={{ margin: 0, fontSize: 13, color: C.testo, fontWeight: 600, lineHeight: 1.5 }}>{d.messaggio}</p>
      </div>
      {puntaAltrove && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: C.tenue, minWidth: 96 }}>Adesso punta a</span>
            <code style={{ background: C.erroreBg, color: C.errore, border: `1px solid ${C.erroreBordo}`, padding: '2px 8px', borderRadius: 4, overflowWrap: 'anywhere' }}>{attuali.join(', ')}</code>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: C.tenue, minWidth: 96 }}>Deve puntare a</span>
            <code style={{ background: C.okBg, color: C.ok, border: `1px solid ${C.okBordo}`, padding: '2px 8px', borderRadius: 4, overflowWrap: 'anywhere' }}>{attesi.join(', ')}</code>
          </div>
        </div>
      )}
    </div>
  )
}

function IstruzioniDns({ fase, records, verificaTxt, provider, onCopia, copiato }) {
  if (!records.length) return null

  // A DNS già corretti non c'è più niente da fare: mostrare comunque i record
  // inviterebbe a rimettere le mani dove funziona.
  if (fase === 'certificato') {
    return (
      <div style={{ padding: '14px 18px', background: '#fff', borderTop: `1px solid ${C.attesaBordo}`, fontSize: 13, color: '#555', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <CheckCircle size={16} strokeWidth={1.5} color={C.ok} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Hai già fatto la tua parte: i DNS sono impostati correttamente. Non devi toccare altro, ci pensiamo noi.</span>
      </div>
    )
  }

  const soloVerifica = fase === 'proprieta'
  return (
    <div style={{ padding: '16px 18px', background: '#fff', borderTop: `1px solid ${C.attesaBordo}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: C.testo }}>
        {soloVerifica
          ? 'Cosa devi fare: aggiungere il record di verifica qui sotto'
          : `Cosa devi fare: aggiungere ${records.length === 1 ? 'questo record' : 'questi record'} dove hai comprato il dominio`}
      </p>

      {provider && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.infoBg, border: `1px solid ${C.infoBordo}`, borderRadius: 8, padding: '10px 12px', margin: '10px 0 14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#555' }}>
            Il tuo dominio è gestito da <strong>{provider.nome}</strong>{provider.nota ? ` — ${provider.nota}` : ''}
          </span>
          {provider.url && (
            <a href={provider.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: C.info, textDecoration: 'none', flexShrink: 0 }}>
              Apri il pannello <ArrowUpRight size={13} strokeWidth={1.5} />
            </a>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
        {records.map((r, i) => (
          <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.bordo}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: '#fff', background: C.testo, padding: '2px 8px', borderRadius: 4 }}>{r.tipo}</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>TTL: {r.ttl || 'Auto'}</span>
            </div>
            <CampoRecord etichetta="Nome" valore={r.nome} onCopia={onCopia} copiato={copiato} />
            <CampoRecord etichetta="Valore" valore={r.valore} onCopia={onCopia} copiato={copiato} />
          </div>
        ))}
      </div>

      {verificaTxt.length > 0 && (
        <>
          <p style={{ margin: '14px 0 8px', fontSize: 12, color: C.tenue, fontWeight: 600 }}>
            Serve anche questo record, per confermare che il dominio è tuo:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
            {verificaTxt.map((r, i) => (
              <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.bordo}` }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: '#fff', background: C.testo, padding: '2px 8px', borderRadius: 4 }}>{r.tipo}</span>
                </div>
                <CampoRecord etichetta="Nome" valore={r.nome} onCopia={onCopia} copiato={copiato} />
                <CampoRecord etichetta="Valore" valore={r.valore} onCopia={onCopia} copiato={copiato} />
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 12, color: C.tenue, lineHeight: 1.5 }}>
        Dopo il salvataggio la modifica impiega di solito pochi minuti a propagarsi (in rari casi fino a 24 ore).
        Nel frattempo il sito resta raggiungibile dal tuo indirizzo {STAYAPP_DOMAIN}.
      </p>
    </div>
  )
}

function CampoRecord({ etichetta, valore, onCopia, copiato }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
      <span style={{ color: C.tenue, fontWeight: 600, fontSize: 12, minWidth: 52 }}>{etichetta}</span>
      <code style={{ flex: 1, minWidth: 140, background: '#fff', border: '1px solid #e8e8e8', padding: '5px 10px', borderRadius: 4, fontSize: 12, overflowWrap: 'anywhere' }}>{valore}</code>
      <BottoneCopia valore={valore} copiato={copiato} onCopia={onCopia} />
    </div>
  )
}
