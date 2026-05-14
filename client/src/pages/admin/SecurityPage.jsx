import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function SecurityPage() {
  const { refreshAAL } = useAuth()
  const [factors, setFactors]     = useState([])
  const [step, setStep]           = useState('idle') // 'idle' | 'qr' | 'confirm'
  const [enrollData, setEnroll]   = useState(null)   // { id, totp: { qr_code, secret } }
  const [code, setCode]           = useState('')
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => { loadFactors() }, [])

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp?.filter(f => f.factor_type === 'totp') ?? [])
  }

  async function startEnroll() {
    setError(null); setSuccess(null); setLoading(true)
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setLoading(false)
    if (err) return setError(err.message)
    setEnroll(data)
    setStep('qr')
  }

  async function confirmEnroll(e) {
    e.preventDefault()
    setError(null); setLoading(true)
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollData.id, code: code.trim() })
    setLoading(false)
    if (err) return setError('Codice non valido, riprova.')
    await loadFactors()
    await refreshAAL()
    setStep('idle'); setCode(''); setEnroll(null)
    setSuccess('2FA attivato con successo. Dal prossimo accesso ti verrà chiesto il codice.')
  }

  async function unenroll(factorId) {
    if (!window.confirm('Disattivare il 2FA? Il tuo account sarà meno sicuro.')) return
    setError(null); setLoading(true)
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId })
    setLoading(false)
    if (err) return setError(err.message)
    await loadFactors()
    await refreshAAL()
    setSuccess('2FA disattivato.')
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified')
  const is2FAActive = verifiedFactors.length > 0

  return (
    <div style={{ padding: '24px 32px', maxWidth: 560 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Sicurezza account</h2>
      <p style={{ margin: '0 0 32px', color: '#6b7280', fontSize: 14 }}>Gestisci l'autenticazione a due fattori (2FA)</p>

      {/* Stato attuale */}
      <div style={{ background: is2FAActive ? '#f0fdf4' : '#fef9c3', border: `1px solid ${is2FAActive ? '#bbf7d0' : '#fde68a'}`, borderRadius: 10, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: is2FAActive ? '#22c55e' : '#f59e0b', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111827' }}>
            {is2FAActive ? '2FA attivo' : '2FA non attivo'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {is2FAActive
              ? 'Il tuo account è protetto. Ogni accesso richiede il codice dall\'app.'
              : 'Attiva il 2FA per proteggere il tuo account con Google Authenticator o Authy.'}
          </p>
        </div>
      </div>

      {success && <p style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>{success}</p>}
      {error && <p style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>{error}</p>}

      {/* Step: idle */}
      {step === 'idle' && !is2FAActive && (
        <button onClick={startEnroll} disabled={loading} style={btnPrimary}>
          {loading ? 'Preparazione…' : 'Attiva 2FA'}
        </button>
      )}

      {step === 'idle' && is2FAActive && (
        <div>
          {verifiedFactors.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Authenticator app</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>ID: {f.id.slice(0, 12)}…</p>
              </div>
              <button onClick={() => unenroll(f.id)} disabled={loading} style={btnDanger}>Disattiva</button>
            </div>
          ))}
        </div>
      )}

      {/* Step: mostra QR */}
      {step === 'qr' && enrollData && (
        <div>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
            Scansiona il QR con <strong>Google Authenticator</strong> o <strong>Authy</strong>, poi inserisci il codice a 6 cifre per confermare.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollData.totp.qr_code)}`}
              alt="QR Code 2FA"
              style={{ width: 200, height: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff' }}
            />
          </div>
          <details style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>Non riesci a scansionare? Inserisci la chiave manualmente</summary>
            <p style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: 13, background: '#f3f4f6', padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all' }}>{enrollData.totp.secret}</p>
          </details>
          <form onSubmit={confirmEnroll}>
            <label style={labelStyle}>Codice di verifica</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 22, letterSpacing: 8, textAlign: 'center', marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={loading || code.length < 6} style={btnPrimary}>{loading ? 'Verifica…' : 'Conferma e attiva'}</button>
            <button type="button" onClick={() => { setStep('idle'); setCode(''); setEnroll(null) }} style={{ ...btnPrimary, marginTop: 8, background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db' }}>Annulla</button>
          </form>
        </div>
      )}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }
const btnPrimary = { width: '100%', padding: '11px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'block', marginBottom: 0 }
const btnDanger  = { padding: '6px 14px', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
