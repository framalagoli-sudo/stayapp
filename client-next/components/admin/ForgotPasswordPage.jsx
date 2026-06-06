'use client'
import { useState } from 'react'
import { Link } from 'next/navigation'
import { apiFetch } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch (err) {
      setError('Impossibile inviare l\'email. Verifica l\'indirizzo e riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: '#1a1a2e' }}>OltreNova</h1>
        <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>Ripristino password</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', margin: '0 0 8px' }}>Email inviata</p>
            <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px', lineHeight: 1.6 }}>
              Controlla la casella <strong>{email}</strong> e clicca il link per scegliere una nuova password.
              Il link scade dopo <strong>1 ora</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Non hai ricevuto nulla? Controlla lo spam o{' '}
              <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>
                riprova
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>La tua email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={inputStyle}
              placeholder="admin@esempio.it"
            />
            <p style={{ fontSize: 13, color: '#888', margin: '-8px 0 20px', lineHeight: 1.5 }}>
              Riceverai un link sicuro per scegliere una nuova password. Valido 1 ora.
            </p>

            {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

            <button type="submit" disabled={loading || !email.trim()} style={{ ...buttonStyle, opacity: loading || !email.trim() ? 0.6 : 1 }}>
              {loading ? 'Invio in corso…' : 'Invia link di ripristino'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
          <Link to="/admin/login" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }
const buttonStyle = { width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }
