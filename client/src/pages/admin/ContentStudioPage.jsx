import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useAzienda } from '../../context/AziendaContext'
import {
  Sparkles, Target, Calendar, Pen, Copy, Check,
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ExternalLink,
  Zap, Share2, Package, FileText,
} from 'lucide-react'
import PostSocialModal from '../../components/admin/PostSocialModal'

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

function StrategiaTab({ strategy, nome, onSaved }) {
  const hasStrategy = strategy?.pillar?.length > 0
  const [showForm, setShowForm] = useState(!hasStrategy)
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
      setShowForm(false)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (showForm) return (
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

        <button onClick={genera} disabled={loading} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 24px', cursor: loading ? 'default' : 'pointer',
          fontWeight: 700, fontSize: 14,
        }}>
          <Sparkles size={16} strokeWidth={1.5} />
          {loading ? 'Generazione in corso (30-60s)…' : 'Genera strategia con AI'}
        </button>
      </div>
    </div>
  )

  // Vista strategia salvata
  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: '#f0f0f5', color: '#444', fontWeight: 600 }}>
            {TONI.find(t => t.k === strategy.tono)?.label || strategy.tono}
          </span>
          {strategy.generato_il && (
            <span style={{ fontSize: 12, color: '#aaa' }}>Generata il {strategy.generato_il}</span>
          )}
        </div>
        <button onClick={() => { setForm({ tono: strategy.tono || 'friendly', target: strategy.target || '', usp: strategy.usp || '', piattaforme: strategy.piattaforme || [], tipo_business: '' }); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
          <RefreshCw size={13} strokeWidth={1.5} /> Rigenera
        </button>
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

function PianoMensileTab({ strategy }) {
  const navigate = useNavigate()
  const now = new Date()
  const [mese, setMese] = useState(now.getMonth() + 1)
  const [anno, setAnno] = useState(now.getFullYear())
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(0)

  function prevMese() {
    if (mese === 1) { setMese(12); setAnno(a => a - 1) } else setMese(m => m - 1)
    setPosts([]); setCreated(0)
  }
  function nextMese() {
    if (mese === 12) { setMese(1); setAnno(a => a + 1) } else setMese(m => m + 1)
    setPosts([]); setCreated(0)
  }

  async function genera(crea_bozze = false) {
    setLoading(true); setError(''); setCreated(0)
    try {
      const { posts: p, created: c } = await apiFetch('/api/content-studio/piano', {
        method: 'POST',
        body: JSON.stringify({ mese, anno, crea_bozze }),
      })
      setPosts(p || [])
      if (crea_bozze) setCreated(c)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (!strategy?.pillar?.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
      <Calendar size={40} strokeWidth={1} color="#ddd" style={{ display: 'block', margin: '0 auto 16px' }} />
      <p style={{ fontSize: 14 }}>Configura prima la <strong>Strategia</strong> per generare il piano mensile.</p>
    </div>
  )

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
          <span>✅ {created} bozze create nel piano editoriale</span>
          <button onClick={() => navigate('/admin/piano-editoriale')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#276749', fontWeight: 600, fontSize: 13 }}>
            Vai al piano <ExternalLink size={12} strokeWidth={2} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button onClick={() => genera(false)} disabled={loading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 20px', cursor: loading ? 'default' : 'pointer',
          fontWeight: 700, fontSize: 14,
        }}>
          <Sparkles size={15} strokeWidth={1.5} />
          {loading ? 'Generazione in corso (30-60s)…' : `Genera piano ${NOMI_MESI[mese]}`}
        </button>
        {posts.length > 0 && !loading && (
          <button onClick={() => genera(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
            border: '1.5px solid #1a1a2e', borderRadius: 10, padding: '12px 18px',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#1a1a2e',
          }}>
            Crea {posts.length} bozze
          </button>
        )}
      </div>

      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((p, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#444', minWidth: 56 }}>
                  {NOMI_MESI[mese].slice(0, 3)} {p.giorno}
                </span>
                <CanaleBadge canale={p.canale} />
                <span style={{ fontSize: 11, background: '#f5f5f7', borderRadius: 20, padding: '2px 8px', color: '#666' }}>{p.pillar}</span>
                <div style={{ flex: 1 }} />
                <CopyBtn text={p.testo} />
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
    </div>
  )
}

// ── Tab 3: Caption Studio ─────────────────────────────────────────────────────

function CaptionStudioTab({ strategy }) {
  const [piattaforma, setPiattaforma] = useState('instagram')
  const [pillar, setPillar] = useState('')
  const [topic, setTopic] = useState('')
  const [contesto, setContesto] = useState('')
  const [varianti, setVarianti] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Platform pills */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Piattaforma</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CANALI.map(c => (
            <PillBtn key={c.k} active={piattaforma === c.k} color={c.color} onClick={() => setPiattaforma(c.k)}>
              {c.label}
            </PillBtn>
          ))}
        </div>
      </div>

      {/* Pillar selector */}
      {pillarList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
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

      {/* Topic */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>Argomento del post *</label>
        <input value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Es: Nuovo piatto estivo, evento di sabato, consiglio per i visitatori…"
          style={inputStyle} />
      </div>

      {/* Contesto */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>
          Dettagli aggiuntivi <span style={{ fontWeight: 400, color: '#aaa' }}>(opzionale)</span>
        </label>
        <textarea value={contesto} onChange={e => setContesto(e.target.value)} rows={2}
          placeholder="Prezzo, orario, ingredienti, location, link, qualsiasi info utile…"
          style={taStyle} />
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
              <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-line', margin: '0 0 14px' }}>
                {v.testo}
              </p>
              {v.hashtag?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {v.hashtag.map((h, j) => (
                    <span key={j} style={{ fontSize: 12, background: '#f0f0f8', color: '#5a5a8e', borderRadius: 6, padding: '2px 8px' }}>{h}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
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
      <p style={{ color: '#888', fontSize: 14, marginBottom: 28, marginTop: 4 }}>
        Strategia editoriale, piano mensile AI e caption generator — basati sui dati reali di {nome || 'questo business'}.
      </p>

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
