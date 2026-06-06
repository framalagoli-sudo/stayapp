'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function FormPublicPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [dati, setDati]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) { setError('Token form mancante'); setLoading(false); return }
    fetch(`${API_BASE}/api/form-builder/public/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setForm(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  function setField(id, value) { setDati(d => ({ ...d, [id]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    // Validazione required
    const mancanti = (form?.campi || []).filter(c => c.required && !dati[c.id]?.toString().trim())
    if (mancanti.length) {
      setSubmitError(`Campi obbligatori mancanti: ${mancanti.map(c => c.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/form-builder/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dati),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Errore invio')

      if (body.redirect_url) {
        window.location.href = body.redirect_url
      } else {
        setSuccess(true)
      }
    } catch (e) { setSubmitError(e.message) }
    setSubmitting(false)
  }

  const inputStyle = {
    width: '100%', border: '1px solid #ddd', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#888' }}>Caricamento…</p>
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div><div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div><p style={{ color: '#c53030' }}>{error}</p></div>
    </div>
  )
  if (success) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 8px 0', color: '#1a1a2e' }}>Grazie!</h2>
        <p style={{ color: '#888', margin: 0 }}>Il tuo messaggio è stato inviato con successo.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 560, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{form.nome}</h2>
        {form.descrizione && <p style={{ margin: '0 0 24px 0', color: '#888', fontSize: 14 }}>{form.descrizione}</p>}

        <form onSubmit={handleSubmit}>
          {(form.campi || []).map(c => (
            <div key={c.id} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                {c.label}{c.required && <span style={{ color: '#c53030', marginLeft: 2 }}>*</span>}
              </label>

              {c.tipo === 'textarea' ? (
                <textarea
                  value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)}
                  placeholder={c.placeholder} rows={4} required={c.required}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              ) : c.tipo === 'select' ? (
                <select
                  value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)}
                  required={c.required} style={inputStyle}
                >
                  <option value="">— Seleziona —</option>
                  {(c.opzioni || []).map((op, i) => <option key={i} value={op}>{op}</option>)}
                </select>
              ) : c.tipo === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#555' }}>
                  <input
                    type="checkbox"
                    checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)}
                    required={c.required}
                    style={{ width: 16, height: 16 }}
                  />
                  {c.placeholder || 'Sì'}
                </label>
              ) : (
                <input
                  type={c.tipo} value={dati[c.id] || ''}
                  onChange={e => setField(c.id, e.target.value)}
                  placeholder={c.placeholder} required={c.required}
                  style={inputStyle}
                />
              )}
            </div>
          ))}

          {submitError && <p style={{ color: '#c53030', fontSize: 13, margin: '12px 0' }}>{submitError}</p>}

          <button
            type="submit" disabled={submitting}
            style={{ width: '100%', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8 }}
          >
            {submitting ? 'Invio in corso…' : 'Invia'}
          </button>
        </form>
      </div>
    </div>
  )
}
