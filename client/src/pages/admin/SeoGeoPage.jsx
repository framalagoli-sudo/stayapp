import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import {
  Search, Bot, Shield, FileCode, Save, CheckCircle, AlertCircle,
  Info, ToggleLeft, ToggleRight, ExternalLink, RefreshCw,
} from 'lucide-react'

const TABS = [
  { id: 'meta',    label: 'Meta SEO',      Icon: Search   },
  { id: 'geo',     label: 'GEO / llms.txt', Icon: Bot      },
  { id: 'robots',  label: 'Robots & AI bot', Icon: Shield  },
  { id: 'jsonld',  label: 'JSON-LD',       Icon: FileCode  },
]

const AI_BOTS = [
  { name: 'GPTBot',           desc: 'ChatGPT / OpenAI crawler' },
  { name: 'ChatGPT-User',     desc: 'ChatGPT browsing mode' },
  { name: 'ClaudeBot',        desc: 'Anthropic / Claude' },
  { name: 'PerplexityBot',    desc: 'Perplexity AI' },
  { name: 'CCBot',            desc: 'Common Crawl (training data)' },
  { name: 'cohere-ai',        desc: 'Cohere' },
  { name: 'anthropic-ai',     desc: 'Anthropic training' },
  { name: 'Google-Extended',  desc: 'Google AI / Gemini' },
]

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e0e0e0', fontSize: 14,
  fontFamily: 'system-ui, sans-serif', outline: 'none',
  background: '#fff', color: '#111', boxSizing: 'border-box',
}

function InfoBox({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, background: '#f0faf8', border: '1px solid #b2dfd8', borderRadius: 10, padding: '12px 14px', marginBottom: 24 }}>
      <Info size={16} strokeWidth={1.5} color="#0F7B6C" style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: '#1a4a42', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  )
}

export default function SeoGeoPage() {
  const [tab, setTab]       = useState('meta')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)

  // Campi locali per ogni tab
  const [meta, setMeta]     = useState({ title: '', description: '', og_title: '', og_description: '', og_image: '', keywords: '' })
  const [llmsTxt, setLlmsTxt] = useState('')
  const [aiAllowed, setAiAllowed] = useState(true)
  const [jsonld, setJsonld] = useState('')
  const [jsonldError, setJsonldError] = useState(null)

  useEffect(() => {
    apiFetch('/api/landing-seo')
      .then(d => {
        setData(d)
        setMeta(d.meta || {})
        setLlmsTxt(d.llms_txt || '')
        setAiAllowed(d.ai_bots_allowed !== false)
        try { setJsonld(JSON.stringify(d.jsonld || {}, null, 2)) } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(payload) {
    setSaving(true); setSaved(false); setError(null)
    try {
      await apiFetch('/api/landing-seo', { method: 'PATCH', body: JSON.stringify(payload) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function saveMeta()    { save({ meta }) }
  function saveLlms()    { save({ llms_txt: llmsTxt }) }
  function saveRobots()  { save({ ai_bots_allowed: aiAllowed }) }
  function saveJsonld()  {
    try {
      const parsed = JSON.parse(jsonld)
      setJsonldError(null)
      save({ jsonld: parsed })
    } catch (e) {
      setJsonldError('JSON non valido: ' + e.message)
    }
  }

  if (loading) return <div style={{ padding: 32, color: '#666' }}>Caricamento…</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>SEO & GEO</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>
        Gestisci la visibilità di oltrenova.com nei motori di ricerca e nei chatbot AI (ChatGPT, Perplexity, Claude…).
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', background: 'none', border: 'none',
            borderBottom: tab === id ? '2px solid #0F7B6C' : '2px solid transparent',
            marginBottom: -2, cursor: 'pointer',
            color: tab === id ? '#0F7B6C' : '#666',
            fontWeight: tab === id ? 700 : 500, fontSize: 14,
            transition: 'color .15s',
          }}>
            <Icon size={15} strokeWidth={1.8} /> {label}
          </button>
        ))}
      </div>

      {/* Feedback globale */}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0faf8', border: '1px solid #0F7B6C', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#0F7B6C', fontWeight: 600, fontSize: 14 }}>
          <CheckCircle size={16} strokeWidth={2} /> Salvato con successo
        </div>
      )}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', border: '1px solid #f87171', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#b91c1c', fontSize: 14 }}>
          <AlertCircle size={16} strokeWidth={2} /> {error}
        </div>
      )}

      {/* ── Tab: Meta SEO ── */}
      {tab === 'meta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InfoBox>
            Questi tag vengono letti da Google, Bing e dagli AI crawler. Il <strong>title</strong> e la <strong>description</strong> appaiono nei risultati di ricerca. Gli <strong>og:</strong> tag controllano l'anteprima quando OltreNova viene condiviso su WhatsApp, LinkedIn, ecc.
          </InfoBox>
          <Field label="Title (tag &lt;title&gt;)" hint="Max 60 caratteri — appare nella scheda del browser e in Google">
            <input style={inp} value={meta.title || ''} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} placeholder="OltreNova — Oltre il solito sito." maxLength={80} />
            <CharCount val={meta.title} max={60} />
          </Field>
          <Field label="Meta description" hint="Max 155 caratteri — il testo sotto il titolo in Google">
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={meta.description || ''} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} placeholder="La piattaforma all-in-one per la tua attività…" maxLength={200} />
            <CharCount val={meta.description} max={155} />
          </Field>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          <Field label="OG Title (social sharing)" hint="Titolo mostrato su WhatsApp, LinkedIn, Facebook">
            <input style={inp} value={meta.og_title || ''} onChange={e => setMeta(m => ({ ...m, og_title: e.target.value }))} placeholder="OltreNova — App, Sito, CRM, AI per la tua attività" maxLength={90} />
          </Field>
          <Field label="OG Description">
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={meta.og_description || ''} onChange={e => setMeta(m => ({ ...m, og_description: e.target.value }))} placeholder="La piattaforma all-in-one per hotel, ristoranti…" maxLength={200} />
          </Field>
          <Field label="OG Image URL" hint="URL assoluta dell'immagine di anteprima (1200×630px consigliato)">
            <input style={inp} value={meta.og_image || ''} onChange={e => setMeta(m => ({ ...m, og_image: e.target.value }))} placeholder="https://oltrenova.com/og-image.png" />
          </Field>
          <Field label="Keywords" hint="Separate da virgola — aiutano gli AI crawler a categorizzare il sito">
            <input style={inp} value={meta.keywords || ''} onChange={e => setMeta(m => ({ ...m, keywords: e.target.value }))} placeholder="app per hotel, CRM attività, sito professionale, chatbot AI…" />
          </Field>
          <SaveBtn onClick={saveMeta} saving={saving} />
        </div>
      )}

      {/* ── Tab: GEO / llms.txt ── */}
      {tab === 'geo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InfoBox>
            <strong>llms.txt</strong> è il file che ChatGPT, Perplexity, Claude e altri AI leggono per capire cosa fa OltreNova. È il modo più diretto per essere citati nelle risposte AI. Servito dinamicamente all'indirizzo <a href="https://oltrenova.com/llms.txt" target="_blank" rel="noopener noreferrer" style={{ color: '#0F7B6C' }}>oltrenova.com/llms.txt <ExternalLink size={11} style={{ verticalAlign: 'middle' }} /></a>.
          </InfoBox>
          <Field label="Contenuto llms.txt" hint="Formato Markdown. Descrivi cosa fa OltreNova, a chi è rivolto, le feature principali e i link utili.">
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 420, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              value={llmsTxt}
              onChange={e => setLlmsTxt(e.target.value)}
              spellCheck={false}
            />
          </Field>
          <SaveBtn onClick={saveLlms} saving={saving} />
        </div>
      )}

      {/* ── Tab: Robots & AI Bot ── */}
      {tab === 'robots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <InfoBox>
            Il <strong>robots.txt</strong> dice agli spider web cosa possono o non possono indicizzare. Se l'AI indexing è <strong>attivo</strong>, i crawler dei chatbot AI possono leggere e includere OltreNova nelle loro risposte. Servito a <a href="https://oltrenova.com/robots.txt" target="_blank" rel="noopener noreferrer" style={{ color: '#0F7B6C' }}>oltrenova.com/robots.txt <ExternalLink size={11} style={{ verticalAlign: 'middle' }} /></a>.
          </InfoBox>

          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', border: '1.5px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Indicizzazione AI</div>
                <div style={{ fontSize: 13, color: '#666' }}>Permette ai crawler AI di leggere e citare OltreNova</div>
              </div>
              <button onClick={() => setAiAllowed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {aiAllowed
                  ? <ToggleRight size={44} strokeWidth={1.5} color="#0F7B6C" />
                  : <ToggleLeft  size={44} strokeWidth={1.5} color="#ccc" />
                }
              </button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
              background: aiAllowed ? '#f0faf8' : '#fef2f2',
              border: `1px solid ${aiAllowed ? '#b2dfd8' : '#fca5a5'}`,
            }}>
              {aiAllowed
                ? <><CheckCircle size={15} color="#0F7B6C" strokeWidth={2} /> <span style={{ fontSize: 13, color: '#1a4a42', fontWeight: 600 }}>I crawler AI possono indicizzare OltreNova — ottimo per GEO</span></>
                : <><AlertCircle size={15} color="#dc2626" strokeWidth={2} /> <span style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>I crawler AI sono bloccati</span></>
              }
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1.5px solid #e0e0e0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#333' }}>Bot AI controllati</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {AI_BOTS.map(({ name, desc }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f9f9f9', border: '1px solid #eee' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiAllowed ? '#0F7B6C' : '#f87171', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SaveBtn onClick={saveRobots} saving={saving} />
        </div>
      )}

      {/* ── Tab: JSON-LD ── */}
      {tab === 'jsonld' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InfoBox>
            <strong>JSON-LD</strong> è il linguaggio dei dati strutturati: dice a Google e agli AI esattamente cosa è OltreNova, che tipo di applicazione è, a chi è rivolta e dove trovarla. Viene iniettato come <code>&lt;script type="application/ld+json"&gt;</code> nella landing page. Usa lo schema <a href="https://schema.org/SoftwareApplication" target="_blank" rel="noopener noreferrer" style={{ color: '#0F7B6C' }}>schema.org/SoftwareApplication</a>.
          </InfoBox>
          <Field label="JSON-LD" hint="Deve essere JSON valido. Formato: schema.org/SoftwareApplication">
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 380, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, borderColor: jsonldError ? '#f87171' : '#e0e0e0' }}
              value={jsonld}
              onChange={e => { setJsonld(e.target.value); setJsonldError(null) }}
              spellCheck={false}
            />
            {jsonldError && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, color: '#dc2626', fontSize: 13 }}>
                <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} /> {jsonldError}
              </div>
            )}
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <SaveBtn onClick={saveJsonld} saving={saving} />
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 8, border: '1.5px solid #0F7B6C', color: '#0F7B6C', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              <ExternalLink size={15} strokeWidth={1.8} /> Testa su Google
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componenti ────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 5 }}>{label}</label>
      {hint && <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  )
}

function CharCount({ val, max }) {
  const n = (val || '').length
  const over = n > max
  return (
    <div style={{ fontSize: 11, color: over ? '#dc2626' : '#aaa', textAlign: 'right', marginTop: 3 }}>
      {n}/{max}
    </div>
  )
}

function SaveBtn({ onClick, saving }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: saving ? '#ccc' : '#0F7B6C', color: '#fff',
        border: 'none', borderRadius: 8, padding: '10px 22px',
        fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
      }}
    >
      {saving ? <RefreshCw size={15} strokeWidth={2} /> : <Save size={15} strokeWidth={2} />}
      {saving ? 'Salvataggio…' : 'Salva'}
    </button>
  )
}
