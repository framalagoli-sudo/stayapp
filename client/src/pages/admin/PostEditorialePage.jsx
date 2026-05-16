import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { Save, Trash2, ArrowLeft, Calendar, AlertCircle } from 'lucide-react'

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

export default function PostEditorialePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = id === 'nuovo'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

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
            <span style={{ fontSize: 11, color: charsLeft < 100 ? '#c53030' : '#aaa' }}>{testo.length} car.</span>
          </div>
          <textarea
            value={testo} onChange={e => setTesto(e.target.value)}
            rows={7} placeholder="Scrivi il testo del post…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
          />
        </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
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
