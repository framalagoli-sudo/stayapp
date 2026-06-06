'use client'
import { useState } from 'react'
import { useNavigate } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function MfaVerifyPage() {
  const { refreshAAL, signOut } = useAuth()
  const navigate   = useNavigate()
  const [code, setCode]       = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    if (!factor) { setLoading(false); return setError('Nessun fattore 2FA trovato.') }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() })
    if (err) { setLoading(false); return setError('Codice non valido, riprova.') }
    await refreshAAL()
    setLoading(false)
    navigate('/admin')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: '#1a1a2e' }}>Verifica identità</h1>
        <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>Inserisci il codice a 6 cifre dall'app authenticator</p>

        <label style={labelStyle}>Codice 2FA</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          maxLength={6}
          placeholder="000000"
          autoFocus
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 24, letterSpacing: 8, textAlign: 'center', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <button type="submit" disabled={loading || code.length < 6} style={btnStyle}>{loading ? 'Verifica…' : 'Verifica'}</button>
        <button type="button" onClick={signOut} style={{ ...btnStyle, marginTop: 8, background: 'transparent', color: '#666', border: '1px solid #ddd' }}>
          Esci
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }
const btnStyle   = { width: '100%', padding: 12, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'block' }
