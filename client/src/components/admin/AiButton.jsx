import { useState } from 'react'
import { apiFetch } from '../../lib/api'
import { Sparkles, X, RefreshCw, AlertCircle } from 'lucide-react'

const TONI = [
  { key: 'professionale', label: 'Professionale' },
  { key: 'amichevole',    label: 'Amichevole' },
  { key: 'entusiasta',    label: 'Entusiasta' },
  { key: 'informale',     label: 'Informale' },
]

export default function AiButton({
  tipo,
  contesto = '',
  nomeBusiness = '',
  onInsert,
  label = 'Genera con AI',
  temaSuggerito = '',
  showTono = true,
  placeholder = 'Descrivi brevemente cosa vuoi generare…',
}) {
  const [open, setOpen]           = useState(false)
  const [tema, setTema]           = useState(temaSuggerito)
  const [tono, setTono]           = useState('professionale')
  const [generating, setGenerating] = useState(false)
  const [result, setResult]       = useState('')
  const [error, setError]         = useState('')
  const [usage, setUsage]         = useState(null)

  async function generate() {
    if (!tema.trim()) return
    setGenerating(true); setError(''); setResult('')
    try {
      const res = await apiFetch('/api/ai/genera', {
        method: 'POST',
        body: JSON.stringify({ tipo, tema, tono, contesto, nome_business: nomeBusiness }),
      })
      setResult(res.testo)
      setUsage(res.usage)
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  function insert() {
    onInsert(result)
    setOpen(false)
    setResult('')
    setTema(temaSuggerito)
  }

  function close() {
    setOpen(false)
    setResult('')
    setError('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
      >
        <Sparkles size={11} strokeWidth={2} /> {label}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg, #6c63ff, #48bfe3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={14} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Genera con AI</div>
                  {usage && <div style={{ fontSize: 11, color: '#aaa' }}>{usage.remaining}/{usage.limit} rimaste questo mese</div>}
                </div>
              </div>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }}>Brief *</label>
              <textarea
                value={tema} onChange={e => setTema(e.target.value)} rows={3}
                placeholder={placeholder}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {showTono && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 6 }}>Tono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TONI.map(t => (
                    <button key={t.key} type="button" onClick={() => setTono(t.key)}
                      style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px solid', borderColor: tono === t.key ? '#6c63ff' : '#ddd', background: tono === t.key ? '#f0efff' : '#fff', color: tono === t.key ? '#6c63ff' : '#555', fontSize: 11, fontWeight: tono === t.key ? 700 : 400, cursor: 'pointer' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', color: '#c53030', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                <AlertCircle size={13} strokeWidth={1.5} /> {error}
              </div>
            )}

            {result ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Risultato</div>
                <textarea
                  value={result} onChange={e => setResult(e.target.value)} rows={6}
                  style={{ width: '100%', background: '#f8f8ff', border: '1.5px solid #e0deff', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, color: '#333', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={insert} style={{ flex: 1, padding: '8px 0', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Usa questo testo
                  </button>
                  <button onClick={generate} disabled={generating} title="Rigenera"
                    style={{ padding: '8px 12px', background: '#f0efff', color: '#6c63ff', border: '1.5px solid #e0deff', borderRadius: 7, cursor: 'pointer' }}>
                    <RefreshCw size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generate} disabled={generating || !tema.trim()}
                style={{ width: '100%', padding: '9px 0', background: generating || !tema.trim() ? '#ccc' : 'linear-gradient(135deg, #6c63ff, #48bfe3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: generating || !tema.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                {generating
                  ? <><RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Generazione…</>
                  : <><Sparkles size={13} strokeWidth={2} /> Genera</>}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
