'use client'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome_azienda: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/signup-status`)
      .then(r => r.json())
      .then(d => { if (!d.signup_enabled) setClosed(true) })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Le password non coincidono.')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_azienda: form.nome_azienda, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore registrazione'); setLoading(false); return }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (signInErr) { setError(signInErr.message); setLoading(false); return }

      navigate('/admin/onboarding')
    } catch {
      setError('Errore di rete. Riprova.')
      setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#999', fontFamily: 'system-ui' }}>
      Caricamento…
    </div>
  )

  if (closed) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a2e' }}>Registrazioni chiuse</h2>
        <p style={{ color: '#888', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
          Le registrazioni pubbliche sono temporaneamente disabilitate.
        </p>
        <Link to="/admin/login" style={{ color: '#1a1a2e', fontSize: 14, fontWeight: 600 }}>
          Hai già un account? Accedi
        </Link>
      </div>
    </div>
  )

  const field = {
    width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, boxSizing: 'border-box', marginBottom: 14, outline: 'none', fontFamily: 'inherit',
  }
  const label = { fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', letterSpacing: 0.5 }}>OltreNova</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Crea il tuo account — 14 giorni gratuiti</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={label}>Nome della tua azienda / attività *</label>
          <input
            value={form.nome_azienda}
            onChange={e => setForm(f => ({ ...f, nome_azienda: e.target.value }))}
            required style={field}
            placeholder="es. Studio Rossi, Hotel Bellavista, Palestra Fit…"
          />

          <label style={label}>Email *</label>
          <input
            type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required style={field} placeholder="email@tuazienda.it"
          />

          <label style={label}>Password *</label>
          <input
            type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required minLength={8} style={field} placeholder="Minimo 8 caratteri"
          />

          <label style={label}>Conferma password *</label>
          <input
            type="password" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            required style={{ ...field, marginBottom: 20 }} placeholder="Ripeti la password"
          />

          {error && (
            <div style={{ background: '#fff5f5', color: '#c53030', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid #fed7d7' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: '#1a1a2e', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Registrazione in corso…' : 'Crea account gratuito'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
          Hai già un account?{' '}
          <Link to="/admin/login" style={{ color: '#1a1a2e', fontWeight: 600 }}>Accedi</Link>
        </div>
      </div>
    </div>
  )
}
