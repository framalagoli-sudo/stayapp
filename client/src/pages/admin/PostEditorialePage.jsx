import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useProperty } from '../../hooks/useProperty'
import { Save, Trash2, ArrowLeft, Calendar, AlertCircle, Sparkles, X, RefreshCw } from 'lucide-react'

const CANALI = [
  { key: 'instagram',       label: 'Instagram' },
  { key: 'facebook',        label: 'Facebook' },
  { key: 'linkedin',        label: 'LinkedIn' },
  { key: 'tiktok',          label: 'TikTok' },
  { key: 'x',               label: 'X (Twitter)' },
  { key: 'google_business', label: 'Google Business' },
]

const STATI = [
  { key: 'bozza',      label: 'Bozza' },
  { key: 'pianificato', label: 'Pianificato' },
  { key: 'pubblicato', label: 'Pubblicato' },
]

const STATO_COLOR = {
  bozza:       '#666',
  pianificato: '#2b6cb0',
  pubblicato:  '#276749',
}

const TONI = [
  { key: 'amichevole',    label: 'Amichevole' },
  { key: 'professionale', label: 'Professionale' },
  { key: 'entusiasta',    label: 'Entusiasta' },
  { key: 'informale',     label: 'Informale / divertente' },
]

export default function PostEditorialePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = id === 'nuovo'
  const { property } = useProperty()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // ── AI modal state ────────────────────────────────────────────────────────
  const [aiOpen, setAiOpen]           = useState(false)
  const [aiTema, setAiTema]           = useState('')
  const [aiTono, setAiTono]           = useState('amichevole')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError]         = useState('')
  const [aiResult, setAiResult]       = useState('')
  const [aiUsage, setAiUsage]         = useState(null) // { remaining, limit }

  const [titolo, setTitolo]           = useState('')
  const [testo, setTesto]             = useState('')
  const [canali, setCanali]           = useState([])
  const [dataPianificata, setData]    = useState(searchParams.get('data') || '')
  const [oraPianificata, setOra]      = useState('09:00')
  const [stato, setStato]             = useState('bozza')
  const [note, setNote]               = useState('')
  const [immagineUrl, setImmagine]    = useState('')

  useEffect(() => {
    if (isNew) return
    apiFetch(`/api/piano-editoriale/${id}`)
      .then(p => {
        setTitolo(p.titolo || '')
        setTesto(p.testo || '')
        setCanali(p.canali || [])
        setStato(p.stato || 'bozza')
        setNote(p.note || '')
        setImmagine(p.immagine_url || '')
        if (p.data_pianificata) {
          const d = new Date(p.data_pianificata)
          setData(d.toISOString().slice(0, 10))
          setOra(d.toTimeString().slice(0, 5))
        }
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id, isNew])

  function toggleCanale(k) {
    setCanali(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k])
  }

  function buildDataPianificata() {
    if (!dataPianificata) return null
    return `${dataPianificata}T${oraPianificata}:00`
  }

  async function save() {
    setSaving(true); setError('')
    const body = { titolo, testo, canali, data_pianificata: buildDataPianificata(), stato, note, immagine_url: immagineUrl }
    try {
      if (isNew) {
        const created = await apiFetch('/api/piano-editoriale', { method: 'POST', body: JSON.stringify(body) })
        navigate(`/admin/piano-editoriale/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/piano-editoriale/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      }
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo post?')) return
    try {
      await apiFetch(`/api/piano-editoriale/${id}`, { method: 'DELETE' })
      navigate('/admin/piano-editoriale')
    } catch (e) { setError(e.message) }
  }

  async function generateAI() {
    if (!aiTema.trim()) return
    setAiGenerating(true); setAiError(''); setAiResult('')
    const canalePrimario = canali[0] || 'instagram'
    try {
      const res = await apiFetch('/api/ai/social-post', {
        method: 'POST',
        body: JSON.stringify({
          tema: aiTema,
          tono: aiTono,
          canale: canalePrimario,
          nome_business: property?.name || '',
        }),
      })
      setAiResult(res.testo)
      setAiUsage(res.usage)
    } catch (e) {
      setAiError(e.message)
    }
    setAiGenerating(false)
  }

  function insertAiText() {
    setTesto(aiResult)
    setAiOpen(false)
    setAiResult('')
    setAiTema('')
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const charsLeft = 2200 - testo.length // limite approssimativo Instagram

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/piano-editoriale')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <Calendar size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          {isNew ? 'Nuovo post' : (titolo || 'Modifica post')}
        </h1>
        {!isNew && (
          <button onClick={handleDelete} style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#c53030' }}>
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 16 }}>
        {/* Titolo interno */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Titolo interno (non pubblicato)</label>
          <input value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Es. Post promozione estate" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Testo */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888' }}>Testo del post</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: charsLeft < 100 ? '#c53030' : '#aaa' }}>{testo.length} car.</span>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <Sparkles size={12} strokeWidth={2} /> Genera con AI
              </button>
            </div>
          </div>
          <textarea
            value={testo} onChange={e => setTesto(e.target.value)}
            rows={7} placeholder="Scrivi il testo del post…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>

        {/* AI Modal */}
        {aiOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Genera con AI</div>
                    {aiUsage && (
                      <div style={{ fontSize: 11, color: '#aaa' }}>{aiUsage.remaining}/{aiUsage.limit} generazioni rimaste questo mese</div>
                    )}
                  </div>
                </div>
                <button onClick={() => { setAiOpen(false); setAiResult(''); setAiError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Canale attivo */}
              {canali.length > 0 && (
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                  Canale: <strong>{CANALI.find(c => c.key === canali[0])?.label || canali[0]}</strong>
                  {canali.length > 1 && <span style={{ color: '#aaa' }}> (verrà usato il primo)</span>}
                </div>
              )}

              {/* Tema */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Tema / brief *</label>
                <textarea
                  value={aiTema}
                  onChange={e => setAiTema(e.target.value)}
                  placeholder="Es: Promozione weekend estivo con sconto 20%, evidenzia l'atmosfera rilassata…"
                  rows={3}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {/* Tono */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>Tono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TONI.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAiTono(t.key)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid', borderColor: aiTono === t.key ? '#6c63ff' : '#ddd', background: aiTono === t.key ? '#f0efff' : '#fff', color: aiTono === t.key ? '#6c63ff' : '#555', fontSize: 12, fontWeight: aiTono === t.key ? 700 : 400, cursor: 'pointer' }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {aiError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  <AlertCircle size={14} strokeWidth={1.5} /> {aiError}
                </div>
              )}

              {/* Result */}
              {aiResult && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Testo generato</div>
                  <textarea
                    value={aiResult}
                    onChange={e => setAiResult(e.target.value)}
                    rows={7}
                    style={{ width: '100%', background: '#f8f8ff', border: '1.5px solid #e0deff', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: '#333', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={insertAiText} style={{ flex: 1, padding: '9px 0', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Usa questo testo
                    </button>
                    <button onClick={generateAI} disabled={aiGenerating} style={{ padding: '9px 14px', background: '#f0efff', color: '#6c63ff', border: '1.5px solid #e0deff', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                      <RefreshCw size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Generate button */}
              {!aiResult && (
                <button
                  onClick={generateAI}
                  disabled={aiGenerating || !aiTema.trim()}
                  style={{ width: '100%', padding: '10px 0', background: aiGenerating || !aiTema.trim() ? '#ccc' : 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: aiGenerating || !aiTema.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {aiGenerating ? (
                    <><RefreshCw size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Generazione…</>
                  ) : (
                    <><Sparkles size={15} strokeWidth={2} /> Genera post</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* URL immagine */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>URL immagine (opzionale)</label>
          <input value={immagineUrl} onChange={e => setImmagine(e.target.value)} placeholder="https://… o URL da Storage" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          {immagineUrl && (
            <img src={immagineUrl} alt="" style={{ marginTop: 8, maxHeight: 160, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} onError={e => e.target.style.display = 'none'} />
          )}
        </div>

        {/* Canali */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Canali</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CANALI.map(c => {
              const active = canali.includes(c.key)
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCanale(c.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: active ? '#1a1a2e' : '#ddd',
                    background: active ? '#1a1a2e' : '#fff',
                    color: active ? '#fff' : '#555',
                    fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400,
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Data e ora */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Data pianificata</label>
            <input type="date" value={dataPianificata} onChange={e => setData(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Ora</label>
            <input type="time" value={oraPianificata} onChange={e => setOra(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}>
              {STATI.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Note interne (non pubblicate)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Brief, link, hashtag, istruzioni…" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
