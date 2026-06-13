'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fieldVisible(campo, dati) {
  if (!campo.condizione?.campo_id) return true
  const rawVal = dati[campo.condizione.campo_id]
  const val = typeof rawVal === 'boolean' ? String(rawVal) : String(rawVal ?? '').toLowerCase()
  const target = String(campo.condizione.valore ?? '').toLowerCase()
  switch (campo.condizione.operatore) {
    case 'eq':       return val === target
    case 'neq':      return val !== target
    case 'contains': return val.includes(target)
    default:         return true
  }
}

export default function FormPublicPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [dati, setDati]               = useState({})
  const [hp, setHp]                   = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) { setError('Token form mancante'); setLoading(false); return }
    fetch(`${API_BASE}/api/form-builder/public/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setForm(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  function setField(id, value) { setDati(d => ({ ...d, [id]: value })) }

  // Multi-step
  const allStepNumbers = form
    ? [...new Set((form.campi || []).map(c => c.step ?? 0))].sort((a, b) => a - b)
    : [0]
  const totalSteps = Math.max(allStepNumbers.length, 1)
  const isMultiStep = !!(form?.multi_step && totalSteps > 1)
  const currentStepNumber = allStepNumbers[currentStep] ?? 0

  // Campi visibili per lo step corrente con filtro condizioni
  const visibleCampi = (form?.campi || []).filter(c => {
    if (isMultiStep && (c.step ?? 0) !== currentStepNumber) return false
    return fieldVisible(c, dati)
  })

  function validateCurrentStep() {
    return visibleCampi.filter(c => {
      if (c.tipo === 'consenso' || c.required) {
        const val = dati[c.id]
        return typeof val === 'boolean' ? !val : !String(val ?? '').trim()
      }
      return false
    })
  }

  function handleNext() {
    const mancanti = validateCurrentStep()
    if (mancanti.length) {
      setSubmitError(`Campi obbligatori: ${mancanti.map(c => c.label).join(', ')}`)
      return
    }
    setSubmitError('')
    setCurrentStep(s => s + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    if (isMultiStep && currentStep < totalSteps - 1) {
      handleNext()
      return
    }

    // Esclude i valori di campi non visibili (dipendenti da condizioni)
    const datiPuliti = {}
    for (const c of (form?.campi || [])) {
      if (fieldVisible(c, dati)) datiPuliti[c.id] = dati[c.id]
    }

    const mancanti = (form?.campi || []).filter(c => {
      if (!fieldVisible(c, dati)) return false
      if (c.tipo === 'consenso' || c.required) {
        const val = datiPuliti[c.id]
        return typeof val === 'boolean' ? !val : !String(val ?? '').trim()
      }
      return false
    })
    if (mancanti.length) {
      setSubmitError(`Campi obbligatori mancanti: ${mancanti.map(c => c.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/form-builder/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datiPuliti, _hp: hp }),
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
        {form.descrizione && <p style={{ margin: '0 0 20px 0', color: '#888', fontSize: 14 }}>{form.descrizione}</p>}

        {/* Barra progresso multi-step */}
        {isMultiStep && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#888' }}>Passo {currentStep + 1} di {totalSteps}</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: '#eee', borderRadius: 2 }}>
              <div style={{ height: '100%', background: '#1a1a2e', borderRadius: 2, width: `${((currentStep + 1) / totalSteps) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Honeypot anti-bot */}
          <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            <input tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} name="_hp" />
          </div>

          {visibleCampi.map(c => (
            <div key={c.id} style={{ marginBottom: 16 }}>
              {c.tipo === 'consenso' ? (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 14, color: '#444' }}>
                  <input
                    type="checkbox"
                    checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)}
                    required
                    style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                  />
                  <span>
                    {c.privacy_url ? (
                      <a href={c.privacy_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0' }}>
                        {c.label || 'Accetto il trattamento dei dati personali'}
                      </a>
                    ) : (
                      c.label || 'Accetto il trattamento dei dati personali'
                    )}
                    <span style={{ color: '#c53030' }}> *</span>
                  </span>
                </label>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                    {c.label}{c.required && <span style={{ color: '#c53030', marginLeft: 2 }}>*</span>}
                  </label>
                  {c.tipo === 'textarea' ? (
                    <textarea value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)}
                      placeholder={c.placeholder} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                  ) : c.tipo === 'select' ? (
                    <select value={dati[c.id] || ''} onChange={e => setField(c.id, e.target.value)} style={inputStyle}>
                      <option value="">— Seleziona —</option>
                      {(c.opzioni || []).map((op, i) => <option key={i} value={op}>{op}</option>)}
                    </select>
                  ) : c.tipo === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#555' }}>
                      <input type="checkbox" checked={!!dati[c.id]} onChange={e => setField(c.id, e.target.checked)} style={{ width: 16, height: 16 }} />
                      {c.placeholder || 'Sì'}
                    </label>
                  ) : (
                    <input type={c.tipo} value={dati[c.id] || ''}
                      onChange={e => setField(c.id, e.target.value)}
                      placeholder={c.placeholder} required={c.required}
                      style={inputStyle} />
                  )}
                </>
              )}
            </div>
          ))}

          {submitError && <p style={{ color: '#c53030', fontSize: 13, margin: '12px 0' }}>{submitError}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {isMultiStep && currentStep > 0 && (
              <button type="button" onClick={() => { setSubmitError(''); setCurrentStep(s => s - 1) }}
                style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                ← Indietro
              </button>
            )}
            {isMultiStep && currentStep < totalSteps - 1 ? (
              <button type="button" onClick={handleNext}
                style={{ flex: 1, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Avanti →
              </button>
            ) : (
              <button type="submit" disabled={submitting}
                style={{ flex: 1, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Invio in corso…' : 'Invia'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
