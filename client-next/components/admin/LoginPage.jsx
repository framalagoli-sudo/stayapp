'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { signIn, refreshAAL } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp]         = useState('')
  const [step, setStep]         = useState('password') // 'password' | 'totp'
  const [factorId, setFactorId] = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)

  async function handlePassword(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    if (err) { setLoading(false); return setError(err.message) }

    // Controlla se serve 2FA
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      const { data } = await supabase.auth.mfa.listFactors()
      const factor = data?.totp?.[0]
      if (factor) { setFactorId(factor.id); setStep('totp'); setLoading(false); return }
    }
    setLoading(false)
    router.push('/admin')
  }

  async function handleTotp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: totp.trim() })
    if (err) { setLoading(false); return setError('Codice non valido, riprova.') }
    await refreshAAL()
    setLoading(false)
    router.push('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      {step === 'password' ? (
        <form onSubmit={handlePassword} style={cardStyle}>
          <img src="/logo-onlight.png" alt="OltreNova" style={{ height: 34, width: 'auto', display: 'block', marginBottom: 14 }} />
          <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>Accedi al pannello amministrativo</p>

          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="admin@esempio.it" />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', padding: 0 }}>
                {showPwd ? 'Nascondi' : 'Mostra'}
              </button>
              <Link href="/admin/forgot-password" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Password dimenticata?</Link>
            </div>
          </div>
          <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />

          {error && <p style={errorStyle}>{error}</p>}
          <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Accesso…' : 'Accedi'}</button>
        </form>
      ) : (
        <form onSubmit={handleTotp} style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: '#1a1a2e' }}>Verifica identità</h1>
          <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>Inserisci il codice a 6 cifre dall'app authenticator</p>

          <label style={labelStyle}>Codice 2FA</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totp}
            onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            placeholder="000000"
            autoFocus
            style={{ ...inputStyle, fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
          />

          {error && <p style={errorStyle}>{error}</p>}
          <button type="submit" disabled={loading || totp.length < 6} style={buttonStyle}>{loading ? 'Verifica…' : 'Verifica'}</button>
          <button type="button" onClick={() => { setStep('password'); setError(null); setTotp('') }} style={{ ...buttonStyle, marginTop: 8, background: 'transparent', color: '#666', border: '1px solid #ddd' }}>
            ← Torna al login
          </button>
        </form>
      )}
    </div>
  )
}

const cardStyle  = { background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }
const buttonStyle = { width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'block', marginBottom: 0 }
const errorStyle  = { color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }
