'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Globe, ChevronRight, ChevronLeft, Check, Wand2, Target, Tag, Star, Calendar, Briefcase, Users, Home, Utensils, Activity, ShoppingCart, Heart, ExternalLink, Eye, FileText } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { SITE_TEMPLATES } from '@/lib/siteTemplates'

// AI Site Builder — un unico flusso lineare "per dummies":
//   Sito → Obiettivo → Il tuo business → Design (scegli un modello)
// e poi l'AI riempie il modello scelto coi dati raccolti (endpoint ai-fill).
// Niente più bivio template/da-zero: il modello è semplicemente lo step "design".

const TOTAL_STEPS = 4

const LOADING_MSGS = [
  'Analizzando il tuo business…',
  'Scegliendo le foto giuste…',
  'Scrivendo i contenuti sul tuo business…',
  'Adattando il modello scelto…',
  'Finalizzando la home…',
]

const TONI   = ['Professionale', 'Amichevole', 'Formale', 'Lusso', 'Minimal', 'Energico']
const TARGET = ['Tutti', 'Famiglie', 'Business', 'Giovani', 'Luxury', 'Professionisti']

const OBIETTIVI = [
  { id: 'lead_gen',     icon: Target,     label: 'Lead Generation',  desc: 'Cattura contatti e genera richieste qualificate' },
  { id: 'vendita',      icon: Tag,        label: 'Vendita',          desc: 'Mostra prezzi e offerte per convertire all\'acquisto' },
  { id: 'vetrina',      icon: Star,       label: 'Vetrina / Brand',  desc: 'Racconta chi sei e crea una presenza memorabile' },
  { id: 'prenotazioni', icon: Calendar,   label: 'Prenotazioni',     desc: 'Guida l\'utente a prenotare con un processo chiaro' },
  { id: 'portfolio',    icon: Briefcase,  label: 'Portfolio',        desc: 'Mostra lavori e competenze, costruisci credibilità' },
  { id: 'evento',       icon: Users,      label: 'Evento',           desc: 'Presenta un evento con programma e iscrizioni' },
]

const PRESETS = [
  { label: 'Hotel / Resort',        icon: Home,       settore: 'Hotel boutique',                        servizi: 'Camere Superior\nSpa e centro benessere\nRistorante gourmet\nPiscina',       cta_text: 'Prenota ora' },
  { label: 'Ristorante',            icon: Utensils,   settore: 'Ristorante italiano',                   servizi: 'Cucina tradizionale\nMenu degustazione\nVini selezionati\nPrivate dining',  cta_text: 'Prenota un tavolo' },
  { label: 'Studio Professionale',  icon: Briefcase,  settore: 'Studio professionale',                  servizi: 'Consulenza specializzata\nAssistenza continuativa\nFormazione',              cta_text: 'Richiedi una consulenza' },
  { label: 'Palestra / Fitness',    icon: Activity,   settore: 'Centro fitness e benessere',            servizi: 'Sala pesi\nCorsi di gruppo\nPersonal trainer\nYoga e pilates',              cta_text: 'Inizia ora' },
  { label: 'Agenzia Digitale',      icon: Globe,      settore: 'Agenzia di marketing digitale',         servizi: 'Strategia digitale\nWeb design\nSviluppo software\nSocial marketing',       cta_text: 'Parliamoci' },
  { label: 'E-commerce',            icon: ShoppingCart, settore: 'Negozio online',                      servizi: 'Prodotti di qualità\nSpedizione rapida\nReso facile entro 30gg',            cta_text: 'Acquista ora' },
  { label: 'Medico / Clinica',      icon: Heart,      settore: 'Studio medico e clinica specialistica', servizi: 'Visite specialistiche\nDiagnostica avanzata\nCheck-up preventivo',          cta_text: 'Prenota una visita' },
  { label: 'Beauty / SPA',          icon: Sparkles,   settore: 'Centro estetico e spa',                 servizi: 'Trattamenti viso\nMassaggi terapeutici\nUnghie e manicure',                cta_text: 'Prenota ora' },
]

// Modelli suggeriti in base al tipo di entità (ordinati per primi nello step Design).
const TIPO_HINT = { struttura: ['hotel'], ristorante: ['ristorante'], attivita: ['esperienze', 'fitness', 'beauty', 'professionista', 'servizi'] }

// ── Header ──────────────────────────────────────────────────────────────────────
function BuilderHeader({ onBack }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {onBack && (
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={15} strokeWidth={1.5} /> Cambia
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} strokeWidth={1.5} color="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>AI Site Builder</h1>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: '#6366f1', padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5 }}>BETA</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#999' }}>Crea il tuo sito con l'intelligenza artificiale</p>
        </div>
      </div>
    </div>
  )
}

function StepDots({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8, borderRadius: 4,
          background: i < current ? '#38a169' : i === current ? '#1a1a2e' : '#e0e0e0',
          transition: 'all 0.25s',
        }} />
      ))}
    </div>
  )
}

function StepLabel({ n, label }) {
  return (
    <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginBottom: 20, letterSpacing: 0.4 }}>
      STEP {n} DI {TOTAL_STEPS} — {label.toUpperCase()}
    </p>
  )
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────
function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = value === opt
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '7px 16px', borderRadius: 20,
            border: `1.5px solid ${active ? '#1a1a2e' : '#e0e0e0'}`,
            background: active ? '#1a1a2e' : '#fff',
            color: active ? '#fff' : '#555',
            fontSize: 13, fontWeight: active ? 700 : 400,
            cursor: 'pointer', transition: 'all 0.12s',
          }}>{opt}</button>
        )
      })}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: hint ? 2 : 6 }}>{label}</label>
      {hint && <p style={{ fontSize: 12, color: '#999', margin: '0 0 6px' }}>{hint}</p>}
      {children}
    </div>
  )
}

const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }
const ta  = { ...inp, resize: 'vertical', minHeight: 88, lineHeight: 1.5 }

// ── EntitySelector ─────────────────────────────────────────────────────────────
function EntitySelector({ onSelect, selectedId }) {
  const [strutture,  setStrutture]  = useState(null)
  const [ristoranti, setRistoranti] = useState(null)
  const [attivita,   setAttivita]   = useState(null)
  const [loadingEnt, setLoadingEnt] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingEnt(true)
      try {
        const [s, r, a] = await Promise.all([
          apiFetch('/api/properties'),
          apiFetch('/api/ristoranti'),
          apiFetch('/api/attivita'),
        ])
        if (cancelled) return
        setStrutture(Array.isArray(s) ? s : (s.properties || []))
        setRistoranti(Array.isArray(r) ? r : (r.ristoranti || []))
        setAttivita(Array.isArray(a) ? a : (a.attivita || []))
      } catch { /* ignore */ }
      if (!cancelled) setLoadingEnt(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loadingEnt) return <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Caricamento entità…</p>

  const items = [
    ...(strutture  || []).map(e => ({ id: e.id, name: e.name, slug: e.slug, tipo: 'struttura',  label: 'Struttura'  })),
    ...(ristoranti || []).map(e => ({ id: e.id, name: e.name, slug: e.slug, tipo: 'ristorante', label: 'Ristorante' })),
    ...(attivita   || []).map(e => ({ id: e.id, name: e.name, slug: e.slug, tipo: 'attivita',   label: 'Attività'   })),
  ]

  if (!items.length) {
    return <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Nessuna entità trovata. Crea prima una struttura o un ristorante.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(e => (
        <div key={e.id} onClick={() => onSelect(e.tipo, e.id, e.name, e.slug)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            border: `2px solid ${e.id === selectedId ? '#1a1a2e' : '#e8e8e8'}`,
            background: e.id === selectedId ? '#f0f4ff' : '#fff',
            transition: 'all 0.12s',
          }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {e.tipo === 'ristorante'
              ? <Utensils size={17} strokeWidth={1.5} color="#888" />
              : e.tipo === 'attivita'
              ? <Activity size={17} strokeWidth={1.5} color="#888" />
              : <Home size={17} strokeWidth={1.5} color="#888" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{e.name}</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{e.label}</div>
          </div>
          {e.id === selectedId && <Check size={18} strokeWidth={1.5} color="#1a1a2e" />}
        </div>
      ))}
    </div>
  )
}

// ── TemplateCard: anteprima reale (iframe scalato) + selezione ──────────────────
function TemplateCard({ tpl, selected, recommended, onSelect }) {
  const W = 1180, scale = 0.19
  return (
    <div onClick={() => onSelect(tpl.id)} style={{
      border: `2px solid ${selected ? '#1a1a2e' : '#e8e8e8'}`, borderRadius: 12, padding: 10,
      background: selected ? '#f0f4ff' : '#fff', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.12s',
    }}>
      <div style={{ position: 'relative', width: '100%', height: 150, overflow: 'hidden', borderRadius: 8, border: '1px solid #eee', background: '#fff' }}>
        <iframe src={`/template-preview/${tpl.id}`} title={tpl.nome} loading="lazy" scrolling="no"
          style={{ width: W, height: W * 1.25, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }} />
        {recommended && (
          <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 800, color: '#1a7a4a', background: '#e8f9f0', padding: '3px 7px', borderRadius: 6, letterSpacing: 0.3 }}>CONSIGLIATO</span>
        )}
        {selected && (
          <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={13} color="#fff" strokeWidth={2} />
          </div>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1a2e' }}>{tpl.nome}</div>
          <a href={`/template-preview/${tpl.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#5b6af8', textDecoration: 'none', flexShrink: 0 }}>
            <Eye size={12} strokeWidth={1.5} /> Anteprima
          </a>
        </div>
        <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.4, marginTop: 2 }}>{tpl.descrizione}</div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AiSiteBuilderPage() {
  const router = useRouter()

  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState(0)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  // Step 0: entità
  const [entityTipo,  setEntityTipo]  = useState('struttura')
  const [entityId,    setEntityId]    = useState('')
  const [entityName,  setEntityName]  = useState('')
  const [entitySlug,  setEntitySlug]  = useState('')
  // Step 1: obiettivo
  const [obiettivo,   setObiettivo]   = useState('')
  // Step 2: business
  const [settore,     setSettore]     = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [servizi,     setServizi]     = useState('')
  const [puntiForza,  setPuntiForza]  = useState('')
  const [ctaText,     setCtaText]     = useState('Contattaci')
  const [tono,        setTono]        = useState('Professionale')
  const [target,      setTarget]      = useState('Tutti')
  // Step 3: design
  const [template,    setTemplate]    = useState('')

  // Modalità "ho già i contenuti": incolla un documento → l'AI costruisce i blocchi
  const [srcMode,     setSrcMode]     = useState(null)      // null = scelta, 'guided' | 'document'
  const [documento,   setDocumento]   = useState('')
  const [docMulti,    setDocMulti]    = useState(false)     // false = one-page, true = più pagine

  const canNext = [
    !!entityId,
    !!obiettivo,
    !!settore.trim() && !!servizi.trim(),
    !!template,
  ][step] ?? false

  function selectEntity(tipo, id, name, slug) {
    setEntityTipo(tipo)
    setEntityId(id)
    setEntityName(name)
    setEntitySlug(slug || '')
  }

  function applyPreset(preset) {
    setSettore(preset.settore)
    setServizi(preset.servizi)
    setCtaText(preset.cta_text)
  }

  async function generate() {
    setLoading(true)
    setError(null)
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length
      setLoadMsg(msgIdx)
    }, 2200)
    try {
      const data = await apiFetch('/api/site-templates/ai-fill', {
        method: 'POST',
        body: JSON.stringify({
          entity_tipo: entityTipo,
          entity_id:   entityId,
          template_id: template,
          modalita:    'uguale',
          answers: {
            obiettivo: OBIETTIVI.find(o => o.id === obiettivo)?.label || obiettivo,
            settore, descrizione, servizi,
            punti_forza: puntiForza,
            cta_text: ctaText, tono, target,
          },
        }),
      })
      setResult(data || { ok: true })
    } catch (e) {
      setError(e.message || 'Errore durante la generazione')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  async function generateFromDoc() {
    setLoading(true)
    setError(null)
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length
      setLoadMsg(msgIdx)
    }, 2200)
    try {
      const data = await apiFetch('/api/ai/from-document', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, documento, template_id: template, multipagina: docMulti }),
      })
      setResult(data || { ok: true })
    } catch (e) {
      setError(e.message || 'Errore durante la generazione')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function entitySitoUrl() {
    if (entityTipo === 'struttura')  return `/admin/struttura/${entityId}/sito`
    if (entityTipo === 'ristorante') return `/admin/ristoranti/${entityId}/sito`
    if (entityTipo === 'attivita')   return `/admin/attivita/${entityId}/sito`
    return '/admin'
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 24 }}>
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f0f0f0', borderTop: '3px solid #1a1a2e', animation: 'spin 1s linear infinite' }} />
          <Wand2 size={28} strokeWidth={1.5} color="#1a1a2e" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>AI al lavoro…</div>
          <div style={{ fontSize: 14, color: '#888', minHeight: 20 }}>{LOADING_MSGS[loadMsg]}</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  if (result) {
    const prefix = { struttura: 's', ristorante: 'r', attivita: 'a' }[entityTipo] || entityTipo
    const liveSiteUrl = entitySlug ? `/${prefix}/${entitySlug}` : null

    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>Sito creato!</h2>
          <p style={{ color: '#666', fontSize: 15, margin: 0 }}>
            La home è pubblicata e già online. Ora rifiniscila come vuoi nell'editor.
          </p>
        </div>

        {liveSiteUrl && (
          <a href={liveSiteUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginBottom: 16, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            <ExternalLink size={15} strokeWidth={1.5} /> Vedi il sito live
          </a>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push(entitySitoUrl())} style={{ flex: 1, padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Vai all'editor
          </button>
          <button onClick={() => { setResult(null); setStep(0); setTemplate('') }} style={{ padding: '12px 20px', background: '#fff', color: '#666', border: '1px solid #e0e0e0', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            Crea un altro
          </button>
        </div>
      </div>
    )
  }

  // ── Design step: modelli ordinati (consigliati per tipo/obiettivo in cima) ──────
  const isRecommended = (t) =>
    (TIPO_HINT[entityTipo] || []).includes(t.id) || (obiettivo && (t.obiettivi || []).includes(obiettivo))
  const orderedTemplates = [...SITE_TEMPLATES].sort((a, b) => (isRecommended(b) ? 1 : 0) - (isRecommended(a) ? 1 : 0))

  // ── Scelta iniziale: creiamolo insieme oppure ho già un documento ───────────────
  if (!srcMode) {
    const card = {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
      padding: '24px 22px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
      border: '2px solid #e8e8e8', background: '#fff', transition: 'all 0.12s', width: '100%',
    }
    return (
      <div style={{ maxWidth: 680 }}>
        <BuilderHeader />
        <p style={{ fontSize: 15, color: '#444', margin: '0 0 22px', lineHeight: 1.6 }}>
          Come vuoi creare il sito?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button onClick={() => { setSrcMode('guided'); setStep(0) }} style={card}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wand2 size={22} strokeWidth={1.5} color="#fff" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>Creiamolo insieme</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>Rispondi a qualche domanda e l'AI costruisce il sito da zero, con un modello a scelta.</div>
          </button>
          <button onClick={() => { setSrcMode('document'); setError(null) }} style={card}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} strokeWidth={1.5} color="#5b6af8" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>Ho già un documento</div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#1a7a4a', background: '#e8f9f0', padding: '3px 7px', borderRadius: 6 }}>NOVITÀ</span>
            </div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>Hai già un progetto o un documento coi contenuti (es. fatto con ChatGPT)? Incollalo e l'AI lo trasforma in sito.</div>
          </button>
        </div>
      </div>
    )
  }

  // ── Modalità "ho già i contenuti": incolla un documento ─────────────────────────
  if (srcMode === 'document') {
    const canGen = !!entityId && documento.trim().length >= 40 && !!template
    return (
      <div style={{ maxWidth: 900 }}>
        <BuilderHeader onBack={() => { setSrcMode(null); setError(null) }} />
        <p style={{ fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
          Hai già i contenuti pronti (es. un documento generato con ChatGPT)? <strong>Incollalo qui</strong>: l'AI costruisce la home rispettando le tue sezioni. Poi scegli un design e rifinisci nell'editor.
        </p>
        <Field label="Per quale sito?" hint="La home verrà associata a questa entità">
          <EntitySelector onSelect={selectEntity} selectedId={entityId} />
        </Field>
        <Field label="Il tuo documento *" hint="Incolla il testo completo: titoli e testi di ogni sezione. Più è strutturato, meglio è.">
          <textarea value={documento} onChange={e => setDocumento(e.target.value)}
            placeholder={'Incolla qui il documento con tutte le sezioni del sito…'} style={{ ...ta, minHeight: 220 }} maxLength={12000} />
          <div style={{ fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 4 }}>{documento.length}/12000</div>
        </Field>
        <Field label="Struttura del sito" hint="Una pagina è più semplice; scegli più pagine se il documento ha sezioni distinte da separare">
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { v: false, label: 'Una pagina sola', desc: 'Consigliato · tutto in uno scroll' },
              { v: true,  label: 'Più pagine',       desc: 'Home + pagine seguendo il documento' },
            ].map(o => (
              <div key={String(o.v)} onClick={() => setDocMulti(o.v)} style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${docMulti === o.v ? '#1a1a2e' : '#e8e8e8'}`,
                background: docMulti === o.v ? '#f0f4ff' : '#fff', transition: 'all 0.12s',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>{o.label}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{o.desc}</div>
              </div>
            ))}
          </div>
        </Field>
        <Field label="Scegli il design (colori e stile) *" hint="La struttura viene dal tuo documento; da qui prendiamo solo il look">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
            {orderedTemplates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} selected={template === tpl.id} recommended={isRecommended(tpl)} onSelect={setTemplate} />
            ))}
          </div>
        </Field>
        {error && (
          <div style={{ marginTop: 8, marginBottom: 14, padding: '12px 16px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>❌ {error}</div>
        )}
        <button onClick={generateFromDoc} disabled={!canGen}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', background: canGen ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e0e0e0', color: canGen ? '#fff' : '#aaa', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: canGen ? 'pointer' : 'default' }}>
          <Wand2 size={16} strokeWidth={1.5} /> Crea il sito dal documento
        </button>
      </div>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: step === 3 ? 900 : 620 }}>
      <BuilderHeader onBack={() => setSrcMode(null)} />
      <StepDots current={step} />

      {/* ── Step 0: Sito (entità) ── */}
      {step === 0 && (
        <div>
          <StepLabel n={1} label="Sito" />
          <p style={{ fontSize: 14, color: '#555', marginBottom: 18, lineHeight: 1.6 }}>
            Per quale <strong>attività</strong> vuoi creare il sito? La home verrà associata a questa entità.
          </p>
          <EntitySelector onSelect={selectEntity} selectedId={entityId} />
        </div>
      )}

      {/* ── Step 1: Obiettivo ── */}
      {step === 1 && (
        <div>
          <StepLabel n={2} label="Obiettivo" />
          <p style={{ fontSize: 14, color: '#555', marginBottom: 18, lineHeight: 1.6 }}>
            Qual è il <strong>risultato principale</strong> che vuoi ottenere con questo sito?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {OBIETTIVI.map(obj => {
              const ObjIcon = obj.icon
              const active = obiettivo === obj.id
              return (
                <div key={obj.id} onClick={() => setObiettivo(obj.id)} style={{
                  padding: '16px 14px', borderRadius: 12, cursor: 'pointer', position: 'relative',
                  border: `2px solid ${active ? '#1a1a2e' : '#e8e8e8'}`,
                  background: active ? '#f0f4ff' : '#fff',
                  transition: 'all 0.12s',
                }}>
                  <ObjIcon size={20} strokeWidth={1.5} color={active ? '#1a1a2e' : '#aaa'} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e', marginBottom: 3 }}>{obj.label}</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{obj.desc}</div>
                  {active && (
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <Check size={14} strokeWidth={1.5} color="#1a1a2e" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Il tuo business ── */}
      {step === 2 && (
        <div>
          <StepLabel n={3} label="Il tuo business" />
          <Field label="Preset settore" hint="Clicca per pre-compilare i campi — puoi modificarli">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.map(p => {
                const PresetIcon = p.icon
                return (
                  <button key={p.label} onClick={() => applyPreset(p)} style={{
                    padding: '6px 13px', borderRadius: 20, border: '1px solid #e0e0e0',
                    background: '#fff', color: '#555', fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'border-color 0.12s',
                  }}>
                    <PresetIcon size={13} strokeWidth={1.5} color="#888" /> {p.label}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Settore / tipo di attività *" hint="In breve, che attività è">
            <input value={settore} onChange={e => setSettore(e.target.value)} placeholder="es. Hotel boutique 4 stelle sul Lago di Garda" style={inp} maxLength={150} />
          </Field>
          <Field label="Descrizione" hint="Cosa ti rende unico? La tua storia, il tuo approccio. (opzionale)">
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="Racconta cosa ti distingue dalla concorrenza, la tua filosofia, la tua storia…" style={{ ...ta, minHeight: 80 }} maxLength={600} />
          </Field>
          <Field label="Servizi / prodotti principali *" hint="Un servizio per riga — più dettagli = testi migliori">
            <textarea value={servizi} onChange={e => setServizi(e.target.value)} placeholder={'Piscina infinity\nSpa e centro benessere\nRistorante con vista lago'} style={ta} maxLength={500} />
          </Field>
          <Field label="Punti di forza / cosa ti distingue" hint="Opzionale ma migliora molto la qualità dei testi">
            <textarea value={puntiForza} onChange={e => setPuntiForza(e.target.value)} placeholder={'Vista panoramica unica\nChef stellato Michelin\nPersonale pluripremiato'} style={{ ...ta, minHeight: 70 }} maxLength={400} />
          </Field>
          <Field label="Testo del bottone principale (CTA)">
            <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Contattaci, Prenota ora, Scopri di più…" style={inp} maxLength={80} />
          </Field>
          <Field label="Tono di comunicazione">
            <ChipGroup options={TONI} value={tono} onChange={setTono} />
          </Field>
          <Field label="Target principale">
            <ChipGroup options={TARGET} value={target} onChange={setTarget} />
          </Field>
        </div>
      )}

      {/* ── Step 3: Design (scegli il modello) ── */}
      {step === 3 && (
        <div>
          <StepLabel n={4} label="Design" />
          <p style={{ fontSize: 14, color: '#555', marginBottom: 18, lineHeight: 1.6 }}>
            Scegli il <strong>look</strong>: l'AI riempirà questo modello coi dati del tuo business. Potrai cambiare tutto nell'editor.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
            {orderedTemplates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} selected={template === tpl.id} recommended={isRecommended(tpl)} onSelect={setTemplate} />
            ))}
          </div>
          {error && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              ❌ {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, color: step === 0 ? '#ccc' : '#555', cursor: step === 0 ? 'default' : 'pointer' }}
        >
          <ChevronLeft size={15} strokeWidth={1.5} /> Indietro
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: canNext ? '#1a1a2e' : '#e0e0e0', color: canNext ? '#fff' : '#aaa', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: canNext ? 'pointer' : 'default', transition: 'all 0.12s' }}
          >
            Avanti <ChevronRight size={15} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={!canNext}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px', background: canNext ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e0e0e0', color: canNext ? '#fff' : '#aaa', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: canNext ? 'pointer' : 'default', transition: 'all 0.12s' }}
          >
            <Wand2 size={16} strokeWidth={1.5} /> Crea il sito con l'AI
          </button>
        )}
      </div>
    </div>
  )
}
