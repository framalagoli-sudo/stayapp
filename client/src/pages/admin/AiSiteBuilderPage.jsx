import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Globe, FileText, ChevronRight, ChevronLeft, Check, Wand2, Target, Tag, Star, Calendar, Briefcase, Users, Home, Utensils, Activity, ShoppingCart, Heart } from 'lucide-react'
import { apiFetch } from '../../lib/api'

const TOTAL_STEPS = 5

const LOADING_MSGS = [
  'Analizzando il tuo business…',
  'Progettando la struttura delle pagine…',
  'Scrivendo i contenuti…',
  'Creando titoli e descrizioni…',
  'Ottimizzando per l\'obiettivo scelto…',
  'Finalizzando le pagine…',
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

const WIRE_BLOCKS = {
  hero:          { bg: '#1a1a2e', h: 38, label: 'HERO',          dark: true },
  highlights:    { bg: '#eef2ff', h: 15, label: 'HIGHLIGHTS',    dark: false },
  stats:         { bg: '#374151', h: 15, label: 'STATS',         dark: true },
  about:         { bg: '#f9fafb', h: 18, label: 'CHI SIAMO',     dark: false },
  foto_testo:    { bg: '#fff',    h: 20, label: 'FOTO + TESTO',  dark: false, border: true },
  testimonianze: { bg: '#f0fdf4', h: 16, label: 'RECENSIONI',    dark: false },
  faq:           { bg: '#fffbeb', h: 13, label: 'FAQ',           dark: false },
  cta_banner:    { bg: '#6366f1', h: 18, label: 'CTA',          dark: true },
  gallery:       { bg: '#fdf2f8', h: 16, label: 'GALLERY',       dark: false },
  team:          { bg: '#ecfdf5', h: 16, label: 'TEAM',          dark: false },
  steps:         { bg: '#eff6ff', h: 16, label: 'COME FUNZIONA', dark: false },
  pacchetti:     { bg: '#fef9c3', h: 18, label: 'PREZZI',        dark: false },
  contatti:      { bg: '#f5f5f5', h: 16, label: 'CONTATTI',      dark: false },
  newsletter:    { bg: '#fdf4ff', h: 13, label: 'NEWSLETTER',    dark: false },
  paragrafi:     { bg: '#f0f9ff', h: 16, label: 'SERVIZI',       dark: false },
}

const TEMPLATES = [
  {
    id:      'essential',
    name:    'Essenziale',
    desc:    'Diretto e pulito. Pochi blocchi, messaggio chiaro.',
    hint:    '5-6 blocchi · testi brevi e incisivi',
    preview: ['hero', 'highlights', 'about', 'cta_banner', 'contatti'],
  },
  {
    id:      'complete',
    name:    'Completo',
    desc:    'Struttura professionale con tutto il necessario.',
    hint:    '7-9 blocchi · ottimizzato per l\'obiettivo',
    preview: ['hero', 'highlights', 'foto_testo', 'stats', 'testimonianze', 'faq', 'cta_banner', 'contatti'],
  },
  {
    id:      'narrative',
    name:    'Narrativo',
    desc:    'Storia e coinvolgimento emotivo.',
    hint:    'foto+testo alternati · percorso empatico',
    preview: ['hero', 'about', 'foto_testo', 'foto_testo', 'testimonianze', 'cta_banner', 'contatti'],
  },
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

// ── Mini wireframe visual preview ─────────────────────────────────────────────
function MiniWireframe({ blocks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0', background: '#fff' }}>
      {blocks.map((b, i) => {
        const w = WIRE_BLOCKS[b] || { bg: '#f0f0f0', h: 13, label: b.toUpperCase(), dark: false }
        return (
          <div key={i} style={{
            height: w.h, background: w.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 6.5, fontWeight: 800, letterSpacing: 0.6,
            color: w.dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.28)',
            borderTop: w.border ? '1px solid #e8e8e8' : 'none',
          }}>
            {w.label}
          </div>
        )
      })}
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
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
    ...(strutture  || []).map(e => ({ id: e.id, name: e.name, tipo: 'struttura',  label: 'Struttura'  })),
    ...(ristoranti || []).map(e => ({ id: e.id, name: e.name, tipo: 'ristorante', label: 'Ristorante' })),
    ...(attivita   || []).map(e => ({ id: e.id, name: e.name, tipo: 'attivita',   label: 'Attività'   })),
  ]

  if (!items.length) {
    return <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Nessuna entità trovata. Crea prima una struttura o un ristorante.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(e => (
        <div key={e.id} onClick={() => onSelect(e.tipo, e.id, e.name)}
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function AiSiteBuilderPage() {
  const navigate = useNavigate()

  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState(0)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  // Step 0: obiettivo
  const [obiettivo,   setObiettivo]   = useState('')
  // Step 1: template
  const [template,    setTemplate]    = useState('')
  // Step 2: tipo + entità
  const [mode,        setMode]        = useState('landing')
  const [entityTipo,  setEntityTipo]  = useState('struttura')
  const [entityId,    setEntityId]    = useState('')
  const [entityName,  setEntityName]  = useState('')
  // Step 3: business
  const [nome,        setNome]        = useState('')
  const [settore,     setSettore]     = useState('')
  const [descrizione, setDescrizione] = useState('')
  // Step 4: contenuto + stile
  const [servizi,    setServizi]    = useState('')
  const [puntiForza, setPuntiForza] = useState('')
  const [ctaText,    setCtaText]    = useState('Contattaci')
  const [tono,       setTono]       = useState('Professionale')
  const [target,     setTarget]     = useState('Tutti')

  const canNext = [
    !!obiettivo,
    !!template,
    !!entityId,
    !!nome.trim() && !!settore.trim(),
    !!servizi.trim(),
  ][step] ?? false

  function selectEntity(tipo, id, name) {
    setEntityTipo(tipo)
    setEntityId(id)
    setEntityName(name)
    if (!nome) setNome(name)
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
      const data = await apiFetch('/api/ai/generate-site', {
        method: 'POST',
        body: JSON.stringify({
          entity_tipo: entityTipo,
          entity_id:   entityId,
          mode,
          obiettivo,
          template,
          answers: {
            nome, settore, descrizione,
            servizi, punti_forza: puntiForza,
            cta_text: ctaText, tono, target,
          },
        }),
      })
      setResult(data.pages || [])
    } catch (e) {
      setError(e.message || 'Errore durante la generazione')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function pageEditUrl(page) { return `/admin/pagine/${page.id}` }

  function entitySitoUrl() {
    if (entityTipo === 'struttura') return `/admin/struttura/${entityId}/sito`
    if (entityTipo === 'ristorante') return `/admin/ristoranti/${entityId}/pagine`
    if (entityTipo === 'attivita') return `/admin/attivita/${entityId}/pagine`
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
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>
            {mode === 'landing' ? 'Landing page creata!' : 'Sito creato!'}
          </h2>
          <p style={{ color: '#666', fontSize: 15, margin: 0 }}>
            {result.length} {result.length === 1 ? 'pagina generata' : 'pagine generate'} come bozza — pronte da modificare.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {result.map(page => (
            <div key={page.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} strokeWidth={1.5} color="#1a1a2e" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{page.titolo}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>/{page.slug} · bozza</div>
              </div>
              <button onClick={() => navigate(pageEditUrl(page))} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Modifica <ChevronRight size={13} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate(entitySitoUrl())} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#1a1a2e', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Gestisci tutte le pagine
          </button>
          <button onClick={() => { setResult(null); setStep(0) }} style={{ padding: '12px 20px', background: '#fff', color: '#666', border: '1px solid #e0e0e0', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            Genera un altro
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
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

      <StepDots current={step} />

      {/* ── Step 0: Obiettivo ── */}
      {step === 0 && (
        <div>
          <StepLabel n={1} label="Obiettivo" />
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

      {/* ── Step 1: Template ── */}
      {step === 1 && (
        <div>
          <StepLabel n={2} label="Template" />
          <p style={{ fontSize: 14, color: '#555', marginBottom: 18, lineHeight: 1.6 }}>
            Scegli la <strong>struttura visiva</strong> delle tue pagine.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {TEMPLATES.map(tmpl => (
              <div key={tmpl.id} onClick={() => setTemplate(tmpl.id)} style={{
                borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                border: `2px solid ${template === tmpl.id ? '#1a1a2e' : '#e8e8e8'}`,
                background: template === tmpl.id ? '#f0f4ff' : '#fff',
                transition: 'all 0.12s',
              }}>
                <div style={{ padding: '10px 10px 8px' }}>
                  <MiniWireframe blocks={tmpl.preview} />
                </div>
                <div style={{ padding: '0 12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>{tmpl.name}</div>
                    {template === tmpl.id && <Check size={12} strokeWidth={1.5} color="#1a1a2e" />}
                  </div>
                  <div style={{ fontSize: 11, color: '#777', lineHeight: 1.4, marginBottom: 3 }}>{tmpl.desc}</div>
                  <div style={{ fontSize: 10, color: '#bbb', fontStyle: 'italic' }}>{tmpl.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Tipo + Entità ── */}
      {step === 2 && (
        <div>
          <StepLabel n={3} label="Tipo e entità" />
          <Field label="Tipo di sito">
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { id: 'landing', icon: FileText, label: 'Landing page', desc: '1 pagina scroll' },
                { id: 'site',    icon: Globe,    label: 'Sito completo', desc: '4 pagine con nav' },
              ].map(({ id, icon: Icon, label, desc }) => (
                <div key={id} onClick={() => setMode(id)} style={{
                  flex: 1, padding: '14px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${mode === id ? '#1a1a2e' : '#e8e8e8'}`,
                  background: mode === id ? '#f0f4ff' : '#fff',
                  transition: 'all 0.12s',
                }}>
                  <Icon size={24} strokeWidth={1.5} color={mode === id ? '#1a1a2e' : '#bbb'} style={{ marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{desc}</div>
                  {mode === id && (
                    <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#1a1a2e', fontWeight: 700 }}>
                      <Check size={10} strokeWidth={1.5} /> Selezionato
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Field>
          <Field label="Entità di destinazione" hint="Le pagine generate verranno associate a questa entità">
            <EntitySelector onSelect={selectEntity} selectedId={entityId} />
          </Field>
        </div>
      )}

      {/* ── Step 3: Business ── */}
      {step === 3 && (
        <div>
          <StepLabel n={4} label="Il tuo business" />
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
          <Field label="Nome del business" hint="Come appare nel sito">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder={entityName || 'es. Borgo del Lago'} style={inp} maxLength={100} />
          </Field>
          <Field label="Settore / tipo attività *" hint="Più sei specifico, più i testi saranno precisi">
            <input value={settore} onChange={e => setSettore(e.target.value)} placeholder="es. Hotel boutique 4 stelle sul Lago di Garda" style={inp} maxLength={150} />
          </Field>
          <Field label="Descrizione" hint="Cosa ti rende unico? La tua storia, il tuo approccio. (opzionale)">
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="Racconta cosa ti distingue dalla concorrenza, la tua filosofia, la tua storia…" style={{ ...ta, minHeight: 80 }} maxLength={600} />
          </Field>
        </div>
      )}

      {/* ── Step 4: Contenuto + Stile ── */}
      {step === 4 && (
        <div>
          <StepLabel n={5} label="Contenuto e stile" />
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

          {/* Summary */}
          <div style={{ marginTop: 18, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e8ecff' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a2e', marginBottom: 6, letterSpacing: 0.5 }}>RIEPILOGO</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.9 }}>
              <strong>{mode === 'landing' ? 'Landing page' : 'Sito completo'}</strong>
              {' · '}<strong>{OBIETTIVI.find(o => o.id === obiettivo)?.label}</strong>
              {' · '}<strong>{TEMPLATES.find(t => t.id === template)?.name}</strong>
              <br />
              Per: <strong>{nome || entityName}</strong>{settore ? ` · ${settore}` : ''}
              <br />
              Tono: <strong>{tono}</strong> · Target: <strong>{target}</strong>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
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
            <Wand2 size={16} strokeWidth={1.5} /> Genera con AI
          </button>
        )}
      </div>
    </div>
  )
}
