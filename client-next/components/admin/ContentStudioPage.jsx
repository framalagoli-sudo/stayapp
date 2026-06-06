'use client'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAzienda } from '@/context/AziendaContext'
import {
  Sparkles, Target, Calendar, Pen, Copy, Check, CalendarPlus,
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ExternalLink,
  Zap, Share2, Package, FileText,
} from 'lucide-react'
import PostSocialModal from '@/components/admin/PostSocialModal'

const CANALI = [
  { k: 'instagram',       label: 'Instagram',        color: '#E1306C' },
  { k: 'facebook',        label: 'Facebook',         color: '#1877F2' },
  { k: 'linkedin',        label: 'LinkedIn',         color: '#0A66C2' },
  { k: 'tiktok',          label: 'TikTok',           color: '#010101' },
  { k: 'google_business', label: 'Google Business',  color: '#4285F4' },
]

const TONI = [
  { k: 'friendly',       label: 'Friendly & Caldo' },
  { k: 'professionale',  label: 'Professionale' },
  { k: 'lusso',          label: 'Lusso & Esclusivo' },
  { k: 'popolare',       label: 'Popolare & Diretto' },
  { k: 'tecnico',        label: 'Esperto & Tecnico' },
]

const TIPI_BUSINESS = [
  'Hotel / B&B / Agriturismo', 'Ristorante / Bar / Caffè',
  'Attività / Esperienza', 'Negozio / E-commerce',
  'Studio professionale', 'Palestra / Wellness',
  'Agenzia / Studio creativo', 'Altro',
]

const NOMI_MESI = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio',
  'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const card = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 20 }
const inputStyle = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
const taStyle = { ...inputStyle, resize: 'vertical', fontSize: 13 }

function CanaleBadge({ canale }) {
  const c = CANALI.find(x => x.k === canale) || { label: canale, color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: c.color + '20', color: c.color }}>
      {c.label}
    </span>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4,
      background: copied ? '#f0fff4' : '#f5f5f7', border: '1px solid #eee',
      borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
      color: copied ? '#276749' : '#555' }}>
      {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
      {copied ? 'Copiato!' : 'Copia'}
    </button>
  )
}

function PillBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer',
      fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
      borderColor: active ? (color || '#1a1a2e') : '#ddd',
      background: active ? (color ? color + '18' : '#1a1a2e') : '#fff',
      color: active ? (color || '#fff') : '#555',
    }}>
      {children}
    </button>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5',
      color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
      <AlertCircle size={14} strokeWidth={1.5} /> {msg}
    </div>
  )
}

// ── Tab 1: Strategia ──────────────────────────────────────────────────────────

const PILLAR_EMOJIS = [
  '✨','🎯','💡','🔥','❤️','📸','🎨','💬','🏆','🌟',
  '📣','🤝','🌱','💎','🚀','📊','🎁','🙌','💪','🌍',
  '✅','📖','🎤','🍀','⚡','🎶','🏅','🛠️','🌈','👀',
]

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 48, height: 40, fontSize: 20, textAlign: 'center',
          border: `1.5px solid ${open ? '#1a1a2e' : '#ddd'}`, borderRadius: 8,
          background: open ? '#f5f5f8' : '#fff', cursor: 'pointer', lineHeight: 1,
        }}
        title="Scegli emoji"
      >
        {value || '✨'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 46, left: 0, zIndex: 50,
          background: '#fff', border: '1px solid #ddd', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: 10,
          display: 'grid', gridTemplateColumns: 'repeat(6, 32px)', gap: 4, width: 230,
        }}>
          {PILLAR_EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onChange(e); setOpen(false) }}
              style={{
                width: 32, height: 32, fontSize: 18, border: 'none', borderRadius: 6,
                background: value === e ? '#f0f0f8' : 'transparent',
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function emptyStrategy() {
  return {
    tono: 'friendly', target: '', usp: '', piattaforme: ['instagram', 'facebook'],
    pillar: [{ id: '1', emoji: '✨', nome: '', descrizione: '' }],
    voice_tips: [''],
    hashtag_base: [],
    frequenza: { instagram: 4, facebook: 3, linkedin: 1, tiktok: 2, google_business: 2 },
  }
}

function ManualEditor({ initial, nome, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    tono: initial?.tono || 'friendly',
    target: initial?.target || '',
    usp: initial?.usp || '',
    piattaforme: initial?.piattaforme || ['instagram', 'facebook'],
    pillar: initial?.pillar?.length ? initial.pillar.map(p => ({ ...p })) : [{ id: '1', emoji: '✨', nome: '', descrizione: '' }],
    voice_tips: initial?.voice_tips?.length ? [...initial.voice_tips] : [''],
    hashtag_input: (initial?.hashtag_base || []).join(' '),
    frequenza: { instagram: 4, facebook: 3, linkedin: 1, tiktok: 2, google_business: 2, ...(initial?.frequenza || {}) },
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePiattaforma(k) {
    setForm(f => ({
      ...f,
      piattaforme: f.piattaforme.includes(k) ? f.piattaforme.filter(x => x !== k) : [...f.piattaforme, k],
    }))
  }

  function setPillar(i, key, val) {
    setForm(f => { const p = [...f.pillar]; p[i] = { ...p[i], [key]: val }; return { ...f, pillar: p } })
  }
  function addPillar() {
    setForm(f => ({ ...f, pillar: [...f.pillar, { id: String(Date.now()), emoji: '🎯', nome: '', descrizione: '' }] }))
  }
  function removePillar(i) {
    setForm(f => ({ ...f, pillar: f.pillar.filter((_, j) => j !== i) }))
  }

  function setTip(i, val) {
    setForm(f => { const t = [...f.voice_tips]; t[i] = val; return { ...f, voice_tips: t } })
  }
  function addTip()       { setForm(f => ({ ...f, voice_tips: [...f.voice_tips, ''] })) }
  function removeTip(i)   { setForm(f => ({ ...f, voice_tips: f.voice_tips.filter((_, j) => j !== i) })) }

  async function save() {
    if (!form.target.trim() || !form.usp.trim()) return setError('Target e USP sono obbligatori.')
    if (form.pillar.some(p => !p.nome.trim())) return setError('Ogni pillar deve avere un nome.')
    setSaving(true); setError('')
    try {
      const hashtag_base = form.hashtag_input
        .split(/[\s,]+/).map(h => h.startsWith('#') ? h : `#${h}`).filter(h => h.length > 1)
      const { strategy: s } = await apiFetch('/api/content-studio/strategia', {
        method: 'PUT',
        body: JSON.stringify({
          tono: form.tono, target: form.target, usp: form.usp,
          piattaforme: form.piattaforme, pillar: form.pillar,
          voice_tips: form.voice_tips.filter(t => t.trim()),
          hashtag_base, frequenza: form.frequenza,
        }),
      })
      onSaved(s)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const secLabel = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }
  const miniBtn  = (extra = {}) => ({ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#555', ...extra })

  return (
    <div style={{ maxWidth: 680 }}>
      <ErrorBanner msg={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Tono */}
        <div>
          <label style={secLabel}>Tono di voce</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TONI.map(t => <PillBtn key={t.k} active={form.tono === t.k} onClick={() => setForm(f => ({ ...f, tono: t.k }))}>{t.label}</PillBtn>)}
          </div>
        </div>

        {/* Target + USP */}
        <div>
          <label style={secLabel}>Chi sono i tuoi clienti ideali? *</label>
          <textarea value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            rows={2} placeholder="Es: Coppie 30-50 anni che cercano relax nel verde…" style={taStyle} />
        </div>
        <div>
          <label style={secLabel}>Cosa ti rende unico? (USP) *</label>
          <textarea value={form.usp} onChange={e => setForm(f => ({ ...f, usp: e.target.value }))}
            rows={2} placeholder="Es: Unico hotel con piscina panoramica sulla valle…" style={taStyle} />
        </div>

        {/* Piattaforme */}
        <div>
          <label style={secLabel}>Piattaforme</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CANALI.map(c => <PillBtn key={c.k} active={form.piattaforme.includes(c.k)} color={c.color} onClick={() => togglePiattaforma(c.k)}>{c.label}</PillBtn>)}
          </div>
        </div>

        {/* Content Pillar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ ...secLabel, marginBottom: 0 }}>Content Pillar</label>
            <button onClick={addPillar} style={miniBtn({ color: '#1a1a2e', borderColor: '#1a1a2e' })}>+ Aggiungi</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.pillar.map((p, i) => (
              <div key={p.id || i} style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <EmojiPicker value={p.emoji} onChange={val => setPillar(i, 'emoji', val)} />
                  <input value={p.nome} onChange={e => setPillar(i, 'nome', e.target.value)}
                    placeholder="Nome pillar (es. Behind the scenes)" style={{ ...inputStyle, flex: 1 }} />
                  {form.pillar.length > 1 && (
                    <button onClick={() => removePillar(i)} style={{ ...miniBtn(), color: '#c00', borderColor: '#fcc' }}>✕</button>
                  )}
                </div>
                <textarea value={p.descrizione} onChange={e => setPillar(i, 'descrizione', e.target.value)}
                  rows={2} placeholder="Descrizione: cosa pubblicare, esempi concreti…" style={{ ...taStyle, marginBottom: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Voice tips */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ ...secLabel, marginBottom: 0 }}>Consigli tono di voce</label>
            <button onClick={addTip} style={miniBtn({ color: '#1a1a2e', borderColor: '#1a1a2e' })}>+ Aggiungi</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {form.voice_tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input value={tip} onChange={e => setTip(i, e.target.value)}
                  placeholder={`Consiglio ${i + 1}…`} style={{ ...inputStyle, flex: 1 }} />
                {form.voice_tips.length > 1 && (
                  <button onClick={() => removeTip(i)} style={{ ...miniBtn(), color: '#c00', borderColor: '#fcc' }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hashtag */}
        <div>
          <label style={secLabel}>Hashtag base (separati da spazio o virgola)</label>
          <input value={form.hashtag_input} onChange={e => setForm(f => ({ ...f, hashtag_input: e.target.value }))}
            placeholder="#tag1 #tag2 #tag3…" style={inputStyle} />
        </div>

        {/* Frequenza */}
        <div>
          <label style={secLabel}>Frequenza consigliata (post/settimana)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {CANALI.filter(c => form.piattaforme.includes(c.k)).map(c => (
              <div key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: c.color, fontWeight: 600, flex: 1 }}>{c.label}</span>
                <input type="number" min={0} max={14} value={form.frequenza[c.k] ?? 0}
                  onChange={e => setForm(f => ({ ...f, frequenza: { ...f.frequenza, [c.k]: Number(e.target.value) } }))}
                  style={{ ...inputStyle, width: 56, textAlign: 'center' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} disabled={saving} style={{
            flex: 1, background: saving ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 24px', cursor: saving ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 14,
          }}>
            {saving ? 'Salvataggio…' : 'Salva strategia'}
          </button>
          {onCancel && (
            <button onClick={onCancel} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '12px 20px', cursor: 'pointer', fontSize: 14, color: '#555' }}>
              Annulla
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StrategiaTab({ strategy, nome, onSaved }) {
  const hasStrategy = strategy?.pillar?.length > 0
  const [mode, setMode] = useState(hasStrategy ? 'view' : 'ai') // 'view' | 'ai' | 'manual'
  const [form, setForm] = useState({
    tono: strategy?.tono || 'friendly',
    target: strategy?.target || '',
    usp: strategy?.usp || '',
    piattaforme: strategy?.piattaforme || ['instagram', 'facebook'],
    tipo_business: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function togglePiattaforma(k) {
    setForm(f => ({
      ...f,
      piattaforme: f.piattaforme.includes(k)
        ? f.piattaforme.filter(x => x !== k)
        : [...f.piattaforme, k],
    }))
  }

  async function genera() {
    if (!form.target.trim() || !form.usp.trim()) return setError('Compila Target e USP per procedere')
    setLoading(true); setError('')
    try {
      const { strategy: s } = await apiFetch('/api/content-studio/strategia', {
        method: 'POST',
        body: JSON.stringify({ ...form, nome_business: nome }),
      })
      onSaved(s)
      setMode('view')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (mode === 'manual') return (
    <ManualEditor
      initial={hasStrategy ? strategy : null}
      nome={nome}
      onSaved={s => { onSaved(s); setMode('view') }}
      onCancel={() => setMode(hasStrategy ? 'view' : 'ai')}
    />
  )

  if (mode === 'ai') return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Rispondi a 4 domande — l'AI genera la tua guida editoriale personalizzata con content pillar, tono di voce, frequenza e hashtag base.
      </p>
      <ErrorBanner msg={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>Tipo di business</label>
          <select value={form.tipo_business} onChange={e => setForm(f => ({ ...f, tipo_business: e.target.value }))} style={inputStyle}>
            <option value="">Seleziona…</option>
            {TIPI_BUSINESS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>Tono di voce</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TONI.map(t => (
              <PillBtn key={t.k} active={form.tono === t.k} onClick={() => setForm(f => ({ ...f, tono: t.k }))}>
                {t.label}
              </PillBtn>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Chi sono i tuoi clienti ideali? *</label>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px' }}>Es: "Coppie 30-50 anni che cercano relax nel verde, amano la cucina locale e il turismo slow"</p>
          <textarea value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            rows={2} placeholder="Descrivi il tuo cliente ideale…" style={taStyle} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Cosa ti rende unico? (USP) *</label>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 8px' }}>Es: "Unico hotel con piscina panoramica sulla valle, colazione con prodotti dell'orto biologico"</p>
          <textarea value={form.usp} onChange={e => setForm(f => ({ ...f, usp: e.target.value }))}
            rows={2} placeholder="Il tuo punto di forza principale…" style={taStyle} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>Piattaforme che usi (o vuoi usare)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CANALI.map(c => (
              <PillBtn key={c.k} active={form.piattaforme.includes(c.k)} color={c.color}
                onClick={() => togglePiattaforma(c.k)}>
                {c.label}
              </PillBtn>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={genera} disabled={loading} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 24px', cursor: loading ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 14,
          }}>
            <Sparkles size={16} strokeWidth={1.5} />
            {loading ? 'Generazione in corso (30-60s)…' : 'Genera strategia con AI'}
          </button>
          <button onClick={() => setMode('manual')} style={{
            background: '#fff', border: '1px solid #ddd', borderRadius: 10,
            padding: '12px 18px', cursor: 'pointer', fontSize: 14, color: '#555', fontWeight: 500,
          }}>
            Crea manualmente
          </button>
        </div>
      </div>
    </div>
  )

  // Vista strategia salvata
  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: '#f0f0f5', color: '#444', fontWeight: 600 }}>
            {TONI.find(t => t.k === strategy.tono)?.label || strategy.tono}
          </span>
          {strategy.generato_il && (
            <span style={{ fontSize: 12, color: '#aaa' }}>Salvata il {strategy.generato_il}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('manual')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
            <Pen size={12} strokeWidth={1.5} /> Modifica
          </button>
          <button onClick={() => { setForm({ tono: strategy.tono || 'friendly', target: strategy.target || '', usp: strategy.usp || '', piattaforme: strategy.piattaforme || [], tipo_business: '' }); setMode('ai') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
            <RefreshCw size={13} strokeWidth={1.5} /> Rigenera AI
          </button>
        </div>
      </div>

      {/* Target + USP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Target</div>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>{strategy.target}</p>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Punto di forza (USP)</div>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0 }}>{strategy.usp}</p>
        </div>
      </div>

      {/* Pillar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Content Pillar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {(strategy.pillar || []).map((p, i) => (
            <div key={p.id || i} style={card}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{p.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.nome}</div>
              <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{p.descrizione}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice tips */}
      {strategy.voice_tips?.length > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Consigli tono di voce</div>
          {strategy.voice_tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < strategy.voice_tips.length - 1 ? 10 : 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
              <span style={{ color: '#1a1a2e', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {tip}
            </div>
          ))}
        </div>
      )}

      {/* Frequenza + Hashtag */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {strategy.frequenza && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Frequenza consigliata / settimana</div>
            {Object.entries(strategy.frequenza).filter(([, v]) => v > 0).map(([k, v]) => {
              const c = CANALI.find(x => x.k === k)
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                  <span style={{ color: c?.color || '#555', fontWeight: 600 }}>{c?.label || k}</span>
                  <span style={{ color: '#888' }}>{v} post/sett.</span>
                </div>
              )
            })}
          </div>
        )}
        {strategy.hashtag_base?.length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Hashtag base</div>
              <CopyBtn text={strategy.hashtag_base.join(' ')} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {strategy.hashtag_base.map((h, i) => (
                <span key={i} style={{ fontSize: 12, background: '#f0f0f8', color: '#5a5a8e', borderRadius: 6, padding: '3px 8px' }}>{h}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Piano Mensile ──────────────────────────────────────────────────────

const EMPTY_NEW_POST = { giorno: '', canale: 'instagram', pillar: '', titolo: '', testo: '', note_visive: '' }

function PianoMensileTab({ strategy }) {
  const navigate = useNavigate()
  const now = new Date()
  const [mese, setMese] = useState(now.getMonth() + 1)
  const [anno, setAnno] = useState(now.getFullYear())
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPost, setNewPost] = useState(EMPTY_NEW_POST)

  const pillarList = strategy?.pillar || []

  function prevMese() {
    if (mese === 1) { setMese(12); setAnno(a => a - 1) } else setMese(m => m - 1)
    setPosts([]); setCreated(0); setShowAddForm(false)
  }
  function nextMese() {
    if (mese === 12) { setMese(1); setAnno(a => a + 1) } else setMese(m => m + 1)
    setPosts([]); setCreated(0); setShowAddForm(false)
  }

  async function generaAI() {
    setLoading(true); setError(''); setCreated(0)
    try {
      const { posts: p } = await apiFetch('/api/content-studio/piano', {
        method: 'POST', body: JSON.stringify({ mese, anno, crea_bozze: false }),
      })
      setPosts(p || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function salvaBozze() {
    if (!posts.length) return
    setSaving(true); setError(''); setCreated(0)
    const mesePad = String(mese).padStart(2, '0')
    try {
      const bozze = posts.map(p => ({
        titolo: p.titolo || 'Post social',
        testo: p.testo || '',
        canali: [p.canale],
        stato: 'bozza',
        data_pianificata: `${anno}-${mesePad}-${String(Math.min(Number(p.giorno) || 1, 28)).padStart(2, '0')}`,
        note: p.note_visive || '',
      }))
      await Promise.all(bozze.map(b => apiFetch('/api/piano-editoriale', { method: 'POST', body: JSON.stringify(b) })))
      setCreated(bozze.length)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  function addManualPost() {
    if (!newPost.titolo.trim() || !newPost.testo.trim()) return
    const giorno = Math.max(1, Math.min(31, Number(newPost.giorno) || 1))
    setPosts(ps => [...ps, { ...newPost, giorno, _manual: true }].sort((a, b) => a.giorno - b.giorno))
    setNewPost(EMPTY_NEW_POST)
    setShowAddForm(false)
  }

  return (
    <div style={{ maxWidth: 740 }}>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, ...card }}>
        <button onClick={prevMese} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={18} strokeWidth={1.5} color="#555" />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
          {NOMI_MESI[mese]} {anno}
        </div>
        <button onClick={nextMese} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} strokeWidth={1.5} color="#555" />
        </button>
      </div>

      <ErrorBanner msg={error} />

      {created > 0 && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#276749', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {created} bozze salvate nel piano editoriale</span>
          <button onClick={() => navigate('/admin/piano-editoriale')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: 13 }}>
            Vai al piano <ExternalLink size={12} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Azioni principali */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {strategy?.pillar?.length > 0 && (
          <button onClick={generaAI} disabled={loading} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: 10, padding: '11px 18px', cursor: loading ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 14, minWidth: 180,
          }}>
            <Sparkles size={15} strokeWidth={1.5} />
            {loading ? 'Generazione…' : `Genera con AI`}
          </button>
        )}
        <button onClick={() => { setShowAddForm(f => !f); setNewPost(EMPTY_NEW_POST) }} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
          border: '1.5px solid #1a1a2e', borderRadius: 10, padding: '11px 16px',
          cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1a1a2e',
        }}>
          <Pen size={14} strokeWidth={1.5} /> Aggiungi manualmente
        </button>
        {posts.length > 0 && !loading && (
          <button onClick={salvaBozze} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#f0fff4',
            border: '1.5px solid #276749', borderRadius: 10, padding: '11px 16px',
            cursor: saving ? 'default' : 'pointer', fontWeight: 600, fontSize: 14, color: '#276749',
          }}>
            {saving ? 'Salvataggio…' : `Salva ${posts.length} bozze`}
          </button>
        )}
      </div>

      {/* Form aggiunta manuale */}
      {showAddForm && (
        <div style={{ ...card, marginBottom: 16, border: '1.5px solid #1a1a2e20' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Nuovo post</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>Giorno</div>
              <input type="number" min={1} max={31} value={newPost.giorno}
                onChange={e => setNewPost(f => ({ ...f, giorno: e.target.value }))}
                placeholder="1" style={{ ...inputStyle, textAlign: 'center' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>Titolo</div>
              <input value={newPost.titolo} onChange={e => setNewPost(f => ({ ...f, titolo: e.target.value }))}
                placeholder="Titolo interno del post" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Piattaforma</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CANALI.map(c => (
                <PillBtn key={c.k} active={newPost.canale === c.k} color={c.color} onClick={() => setNewPost(f => ({ ...f, canale: c.k }))}>
                  {c.label}
                </PillBtn>
              ))}
            </div>
          </div>
          {pillarList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>Content Pillar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <PillBtn active={!newPost.pillar} onClick={() => setNewPost(f => ({ ...f, pillar: '' }))}>Libero</PillBtn>
                {pillarList.map(p => (
                  <PillBtn key={p.id} active={newPost.pillar === p.nome} onClick={() => setNewPost(f => ({ ...f, pillar: p.nome }))}>
                    {p.emoji} {p.nome}
                  </PillBtn>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>Testo / Caption</div>
            <textarea value={newPost.testo} onChange={e => setNewPost(f => ({ ...f, testo: e.target.value }))}
              rows={4} placeholder="Scrivi la caption completa…" style={taStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>Note visive (opzionale)</div>
            <input value={newPost.note_visive} onChange={e => setNewPost(f => ({ ...f, note_visive: e.target.value }))}
              placeholder="Suggerimento foto/immagine…" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addManualPost} disabled={!newPost.titolo.trim() || !newPost.testo.trim()} style={{
              background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              opacity: (!newPost.titolo.trim() || !newPost.testo.trim()) ? 0.5 : 1,
            }}>
              Aggiungi alla lista
            </button>
            <button onClick={() => setShowAddForm(false)} style={{
              background: '#fff', border: '1px solid #ddd', borderRadius: 8,
              padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: '#555',
            }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ ...card, borderLeft: p._manual ? '3px solid #1a1a2e' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#444', minWidth: 56 }}>
                  {NOMI_MESI[mese].slice(0, 3)} {p.giorno}
                </span>
                <CanaleBadge canale={p.canale} />
                {p.pillar && <span style={{ fontSize: 11, background: '#f5f5f7', borderRadius: 20, padding: '2px 8px', color: '#666' }}>{p.pillar}</span>}
                {p._manual && <span style={{ fontSize: 10, background: '#1a1a2e10', color: '#1a1a2e', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>Manuale</span>}
                <div style={{ flex: 1 }} />
                <CopyBtn text={p.testo} />
                <button onClick={() => setPosts(ps => ps.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '2px 4px', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>{p.titolo}</div>
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{p.testo}</div>
              {p.note_visive && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#888', background: '#fafafa', borderRadius: 6, padding: '6px 10px' }}>
                  📸 {p.note_visive}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!posts.length && !showAddForm && !strategy?.pillar?.length && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <Calendar size={40} strokeWidth={1} color="#ddd" style={{ display: 'block', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14 }}>Genera un piano con AI oppure aggiungi i post manualmente.</p>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Caption Studio ─────────────────────────────────────────────────────

function CaptionStudioTab({ strategy }) {
  const navigate = useNavigate()
  const [captionMode, setCaptionMode] = useState('ai') // 'ai' | 'manual'
  const [piattaforma, setPiattaforma] = useState('instagram')
  const [pillar, setPillar] = useState('')
  const [topic, setTopic] = useState('')
  const [contesto, setContesto] = useState('')
  const [varianti, setVarianti] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Manual mode
  const [manualTesto, setManualTesto] = useState('')
  const [manualHashtag, setManualHashtag] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pillarList = strategy?.pillar || []

  async function genera() {
    if (!topic.trim()) return setError('Inserisci un argomento per il post')
    setLoading(true); setError('')
    try {
      const { varianti: v } = await apiFetch('/api/content-studio/caption', {
        method: 'POST',
        body: JSON.stringify({ piattaforma, topic, contesto, pillar }),
      })
      setVarianti(v || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function salvaManuale() {
    if (!manualTesto.trim()) return
    setSaving(true); setSaved(false)
    try {
      const testo = manualHashtag.trim()
        ? `${manualTesto}\n\n${manualHashtag}`
        : manualTesto
      await apiFetch('/api/piano-editoriale', {
        method: 'POST',
        body: JSON.stringify({
          titolo: topic || 'Caption manuale',
          testo,
          canali: [piattaforma],
          stato: 'bozza',
          data_pianificata: null,
          note: pillar || '',
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  // Shared: platform + pillar selector
  function renderSelectors() {
    return (
      <>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Piattaforma</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CANALI.map(c => (
              <PillBtn key={c.k} active={piattaforma === c.k} color={c.color} onClick={() => setPiattaforma(c.k)}>
                {c.label}
              </PillBtn>
            ))}
          </div>
        </div>
        {pillarList.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Content Pillar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <PillBtn active={!pillar} onClick={() => setPillar('')}>Libero</PillBtn>
              {pillarList.map(p => (
                <PillBtn key={p.id} active={pillar === p.nome} onClick={() => setPillar(p.nome)}>
                  {p.emoji} {p.nome}
                </PillBtn>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#f5f5f7', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ k: 'ai', label: '✨ Genera con AI' }, { k: 'manual', label: '✍️ Scrivi manualmente' }].map(m => (
          <button key={m.k} onClick={() => { setCaptionMode(m.k); setError(''); setVarianti([]) }} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13,
            background: captionMode === m.k ? '#fff' : 'transparent',
            color: captionMode === m.k ? '#1a1a2e' : '#888',
            boxShadow: captionMode === m.k ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {captionMode === 'ai' ? (
        <>
          {renderSelectors()}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Argomento del post *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Es: Nuovo piatto estivo, evento di sabato, consiglio per i visitatori…"
              style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>
              Dettagli aggiuntivi <span style={{ fontWeight: 400, color: '#aaa' }}>(opzionale)</span>
            </label>
            <textarea value={contesto} onChange={e => setContesto(e.target.value)} rows={2}
              placeholder="Prezzo, orario, ingredienti, location, link…" style={taStyle} />
          </div>
          <ErrorBanner msg={error} />
          <button onClick={genera} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 24px', cursor: loading ? 'default' : 'pointer',
            fontWeight: 700, fontSize: 14, marginBottom: 24,
          }}>
            <Sparkles size={15} strokeWidth={1.5} />
            {loading ? 'Generazione in corso…' : 'Genera 3 varianti'}
          </button>
          {varianti.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {varianti.map((v, i) => (
                <div key={i} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#f0f0f8', color: '#5a5a8e', borderRadius: 6, padding: '3px 10px' }}>
                      Variante {v.variante} — {v.stile}
                    </span>
                    <CopyBtn text={`${v.testo}\n\n${(v.hashtag || []).join(' ')}`} />
                  </div>
                  <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-line', margin: '0 0 14px' }}>{v.testo}</p>
                  {v.hashtag?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {v.hashtag.map((h, j) => (
                        <span key={j} style={{ fontSize: 12, background: '#f0f0f8', color: '#5a5a8e', borderRadius: 6, padding: '2px 8px' }}>{h}</span>
                      ))}
                    </div>
                  )}
                  <AggiuntaAlPiano testo={`${v.testo}\n\n${(v.hashtag || []).join(' ')}`} piattaforma={piattaforma} pillar={pillar} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {renderSelectors()}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Titolo interno (opzionale)</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Es: Post lunedì — nuovo prodotto" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Caption *</label>
            <textarea value={manualTesto} onChange={e => setManualTesto(e.target.value)}
              rows={6} placeholder="Scrivi la tua caption…" style={taStyle} />
            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 2 }}>{manualTesto.length} caratteri</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Hashtag <span style={{ fontWeight: 400, color: '#aaa' }}>(opzionale)</span></label>
            <input value={manualHashtag} onChange={e => setManualHashtag(e.target.value)}
              placeholder="#tag1 #tag2 #tag3…" style={inputStyle} />
          </div>
          <ErrorBanner msg={error} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CopyBtn text={manualHashtag ? `${manualTesto}\n\n${manualHashtag}` : manualTesto} />
            <button onClick={salvaManuale} disabled={saving || !manualTesto.trim()} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: saved ? '#f0fff4' : '#1a1a2e',
              color: saved ? '#276749' : '#fff',
              border: saved ? '1px solid #c6f6d5' : 'none',
              borderRadius: 8, padding: '8px 18px', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, opacity: !manualTesto.trim() ? 0.5 : 1,
            }}>
              {saved ? <><Check size={14} strokeWidth={2} /> Aggiunto!</> : saving ? 'Salvataggio…' : <><CalendarPlus size={14} strokeWidth={1.5} /> Aggiungi al piano</>}
            </button>
            {saved && (
              <button onClick={() => navigate('/admin/piano-editoriale')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: 13 }}>
                Vai al piano <ExternalLink size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AggiuntaAlPiano({ testo, piattaforma, pillar }) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  async function aggiungi() {
    setAdding(true)
    try {
      await apiFetch('/api/piano-editoriale', {
        method: 'POST',
        body: JSON.stringify({ titolo: 'Caption AI', testo, canali: [piattaforma], stato: 'bozza', data_pianificata: null, note: pillar || '' }),
      })
      setAdded(true)
    } catch {}
    setAdding(false)
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={aggiungi} disabled={adding || added} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: added ? '#f0fff4' : '#f5f5f7',
        border: added ? '1px solid #c6f6d5' : '1px solid #eee',
        borderRadius: 6, padding: '5px 12px', cursor: added ? 'default' : 'pointer',
        fontSize: 12, fontWeight: 600, color: added ? '#276749' : '#555',
      }}>
        {added ? <><Check size={12} strokeWidth={2} /> Aggiunto!</> : adding ? '…' : <><CalendarPlus size={12} strokeWidth={1.5} /> Aggiungi al piano</>}
      </button>
      {added && (
        <button onClick={() => navigate('/admin/piano-editoriale')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: 12 }}>
          Vai al piano <ExternalLink size={11} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

// ── Tab 4: Opportunità (Gap Analyzer) ────────────────────────────────────────

function GapCard({ immagine, titolo, sub, onCrea }) {
  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
      {immagine ? (
        <img src={immagine} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f5f5f7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} strokeWidth={1.5} color="#ccc" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {titolo}
        </div>
        {sub && <div style={{ fontSize: 12, color: '#888' }}>{sub}</div>}
      </div>
      <button onClick={onCrea} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f0ff', color: '#6b21a8', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
        <Share2 size={13} strokeWidth={1.5} /> Crea post
      </button>
    </div>
  )
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 12 }}>
      <Icon size={14} strokeWidth={1.5} /> {label}
    </div>
  )
}

function OpportunitaTab({ nome }) {
  const [gap, setGap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalData, setModalData] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ titolo: '', sottotitolo: '' })

  useEffect(() => {
    apiFetch('/api/content-studio/gap')
      .then(setGap)
      .catch(() => setGap({ eventi: [], prodotti: [], articoli: [], piano_questo_mese: 0 }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: '#888' }}>Analisi in corso…</p>

  const { eventi = [], prodotti = [], articoli = [], piano_questo_mese = 0 } = gap || {}
  const totale = eventi.length + prodotti.length + articoli.length

  function apriPost(item) { setModalData(item) }

  return (
    <div style={{ maxWidth: 740 }}>

      {/* Bottone post personalizzato */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowCustomForm(f => !f)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: showCustomForm ? '#1a1a2e' : '#fff',
          color: showCustomForm ? '#fff' : '#1a1a2e',
          border: '1.5px solid #1a1a2e', borderRadius: 8, padding: '8px 16px',
          cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          <Pen size={13} strokeWidth={1.5} /> Post su argomento libero
        </button>
      </div>

      {showCustomForm && (
        <div style={{ ...card, marginBottom: 20, border: '1.5px solid #1a1a2e20' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Argomento personalizzato</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Titolo / Argomento *</label>
            <input value={customForm.titolo} onChange={e => setCustomForm(f => ({ ...f, titolo: e.target.value }))}
              placeholder="Es: Lancio nuova offerta, consiglio stagionale, dietro le quinte…" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>
              Dettagli <span style={{ fontWeight: 400, color: '#aaa' }}>(opzionale)</span>
            </label>
            <input value={customForm.sottotitolo} onChange={e => setCustomForm(f => ({ ...f, sottotitolo: e.target.value }))}
              placeholder="Prezzo, data, contesto, qualsiasi info utile per la caption…" style={inputStyle} />
          </div>
          <button
            disabled={!customForm.titolo.trim()}
            onClick={() => { apriPost({ titolo: customForm.titolo, sottotitolo: customForm.sottotitolo, immagine: '', tipo: 'personalizzato' }); setShowCustomForm(false); setCustomForm({ titolo: '', sottotitolo: '' }) }}
            style={{
              background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              opacity: !customForm.titolo.trim() ? 0.5 : 1,
            }}>
            Crea post →
          </button>
        </div>
      )}

      {/* Banner mese */}
      <div style={{ ...card, marginBottom: 24, background: piano_questo_mese === 0 ? '#fff8f0' : '#f0fff4', border: `1px solid ${piano_questo_mese === 0 ? '#fed7aa' : '#c6f6d5'}` }}>
        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>
          {piano_questo_mese === 0
            ? '⚠️ Non hai ancora pianificato post questo mese. '
            : `✅ Questo mese hai ${piano_questo_mese} post pianificati. `}
          {totale > 0
            ? <span>Hai <strong>{totale}</strong> contenuti che potresti ancora promuovere:</span>
            : totale === 0 && <span style={{ color: '#888' }}>Nessun contenuto recente da promuovere.</span>}
        </div>
      </div>

      {eventi.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={Calendar} label={`Prossimi eventi (${eventi.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eventi.map(e => {
              const dateStr = e.date_start ? new Date(e.date_start).toLocaleDateString('it-IT') : ''
              return (
                <GapCard key={e.id}
                  immagine={e.cover_url}
                  titolo={e.title}
                  sub={[dateStr, e.price ? `€${e.price}` : ''].filter(Boolean).join(' · ')}
                  onCrea={() => apriPost({
                    titolo: e.title,
                    sottotitolo: [dateStr, e.price ? `€${e.price}` : ''].filter(Boolean).join(' · '),
                    immagine: e.cover_url || '',
                    tipo: 'evento',
                  })}
                />
              )
            })}
          </div>
        </div>
      )}

      {prodotti.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={Package} label={`Prodotti attivi (${prodotti.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prodotti.map(p => (
              <GapCard key={p.id}
                immagine={p.immagini?.[0]}
                titolo={p.nome}
                sub={p.prezzo ? `€${p.prezzo}` : ''}
                onCrea={() => apriPost({
                  titolo: p.nome,
                  sottotitolo: p.prezzo ? `€${p.prezzo}` : '',
                  immagine: p.immagini?.[0] || '',
                  tipo: 'prodotto shop',
                })}
              />
            ))}
          </div>
        </div>
      )}

      {articoli.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={FileText} label={`Articoli recenti (${articoli.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {articoli.map(a => (
              <GapCard key={a.id}
                immagine={a.cover_url}
                titolo={a.title}
                sub={a.excerpt || ''}
                onCrea={() => apriPost({
                  titolo: a.title,
                  sottotitolo: a.excerpt || '',
                  immagine: a.cover_url || '',
                  tipo: 'articolo blog',
                })}
              />
            ))}
          </div>
        </div>
      )}

      {totale === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <Zap size={40} strokeWidth={1} color="#ddd" style={{ display: 'block', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14 }}>Nessun contenuto da promuovere al momento.<br />Crea eventi, prodotti o articoli di blog — appariranno qui.</p>
        </div>
      )}

      {modalData && (
        <PostSocialModal
          isOpen={true}
          onClose={() => setModalData(null)}
          titolo={modalData.titolo}
          sottotitolo={modalData.sottotitolo}
          immagine={modalData.immagine}
          tipo={modalData.tipo}
          nomeBusiness={nome}
        />
      )}
    </div>
  )
}

// ── Guida ─────────────────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    k: 'strategia', Icon: Target, label: 'Strategia',
    short: 'Il punto di partenza — definisce il tuo brand editoriale.',
    body: 'Qui inserisci chi sei, chi è il tuo cliente ideale e cosa ti differenzia dalla concorrenza. L\'AI (o tu manualmente) genera i content pillar — 5 categorie di contenuto ricorrenti come "Behind the scenes", "Consigli", "Promozioni" — più il tono di voce, la frequenza di pubblicazione consigliata per ogni piattaforma e un set di hashtag base. Tutte le altre sezioni usano questa strategia come contesto per generare contenuti coerenti con il tuo brand.',
  },
  {
    k: 'piano', Icon: Calendar, label: 'Piano Mensile',
    short: 'Il calendario editoriale — 12–16 post già scritti per il mese.',
    body: 'L\'AI legge la strategia e i dati reali del tuo business (eventi programmati, prodotti attivi, recensioni recenti) e crea un piano con post distribuiti nel mese, ognuno con giorno, piattaforma, pillar di riferimento, caption pronta e suggerimento fotografico. Puoi anche aggiungere post manualmente, rimuovere quelli che non ti convincono e salvare tutto come bozze nel Piano Editoriale, dove poi le pubblichi o le pianifichi.',
  },
  {
    k: 'caption', Icon: Pen, label: 'Caption Studio',
    short: 'Il generatore di caption — 3 varianti pronte per ogni post.',
    body: 'Scegli la piattaforma, il content pillar e scrivi l\'argomento del post. L\'AI genera 3 varianti con stili diversi: diretta e informativa, narrativa e storytelling, orientata all\'engagement. Ogni piattaforma ha istruzioni specifiche — hook forte su Instagram, tono conversazionale su Facebook, autorevole su LinkedIn. Puoi anche scrivere la caption tu a mano e salvarla direttamente nel piano editoriale.',
  },
  {
    k: 'opportunita', Icon: Zap, label: 'Opportunità',
    short: 'Il suggeritore — trasforma i tuoi contenuti esistenti in post social.',
    body: 'Analizza automaticamente i tuoi contenuti (eventi in arrivo, prodotti attivi, articoli di blog recenti) e ti mostra cosa potresti ancora promuovere sui social. Per ogni item puoi aprire l\'editor grafico: scegli il formato (feed, story, cover), il colore brand, scrivi o genera la caption con AI, scarica il PNG pronto da pubblicare e aggiungilo al piano editoriale. Puoi anche creare un post su un argomento libero, non legato ad alcun contenuto esistente.',
  },
]

function GuideAccordion() {
  const [open, setOpen] = useState(false)
  const [openSection, setOpenSection] = useState(null)

  return (
    <div style={{ marginBottom: 24, border: '1px solid #e8e8f0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header banner */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', background: open ? '#f5f5fb' : '#fafafa',
          border: 'none', cursor: 'pointer', gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} strokeWidth={1.5} color="#6b6b9e" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#444' }}>Come funziona Content Studio?</span>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} color="#aaa"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {/* Accordion sections */}
      {open && (
        <div style={{ borderTop: '1px solid #eee' }}>
          {GUIDE_SECTIONS.map(({ k, Icon, label, short, body }, i) => {
            const isOpen = openSection === k
            return (
              <div key={k} style={{ borderBottom: i < GUIDE_SECTIONS.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <button
                  onClick={() => setOpenSection(isOpen ? null : k)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 18px', background: isOpen ? '#f9f9fd' : '#fff',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Icon size={15} strokeWidth={1.5} color={isOpen ? '#1a1a2e' : '#aaa'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isOpen ? '#1a1a2e' : '#555', marginBottom: 1 }}>{label}</div>
                    {!isOpen && <div style={{ fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short}</div>}
                  </div>
                  <ChevronRight size={14} strokeWidth={1.5} color="#ccc"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px 43px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.7 }}>{body}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ContentStudioPage() {
  useAzienda()
  const [tab, setTab] = useState('strategia')
  const [strategy, setStrategy] = useState(null)
  const [nome, setNome] = useState('')
  const [loadingInit, setLoadingInit] = useState(true)

  useEffect(() => {
    apiFetch('/api/content-studio/strategia')
      .then(d => { setStrategy(d.strategy || {}); setNome(d.nome || '') })
      .catch(() => setStrategy({}))
      .finally(() => setLoadingInit(false))
  }, [])

  const TABS = [
    { k: 'strategia',   label: 'Strategia',     Icon: Target },
    { k: 'piano',       label: 'Piano Mensile',  Icon: Calendar },
    { k: 'caption',     label: 'Caption Studio', Icon: Pen },
    { k: 'opportunita', label: 'Opportunità',    Icon: Zap },
  ]

  if (loadingInit) return <p style={{ color: '#888' }}>Caricamento…</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Sparkles size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Content Studio</h1>
      </div>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 20, marginTop: 4 }}>
        Strategia editoriale, piano mensile AI e caption generator — basati sui dati reali di {nome || 'questo business'}.
      </p>

      <GuideAccordion />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '2px solid #f0f0f0' }}>
        {TABS.map(({ k, label, Icon }) => {
          const active = tab === k
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: active ? 700 : 500,
              color: active ? '#1a1a2e' : '#888',
              borderBottom: `2px solid ${active ? '#1a1a2e' : 'transparent'}`,
              marginBottom: -2,
            }}>
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'strategia'   && <StrategiaTab strategy={strategy} nome={nome} onSaved={setStrategy} />}
      {tab === 'piano'       && <PianoMensileTab strategy={strategy} />}
      {tab === 'caption'     && <CaptionStudioTab strategy={strategy} />}
      {tab === 'opportunita' && <OpportunitaTab nome={nome} />}
    </div>
  )
}
