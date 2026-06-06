'use client'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  // Cattura il tipo di flusso dall'hash prima che Supabase lo rimuova
  const [flowType] = useState(() => {
    // Può arrivare da hash (link diretto Supabase) o da ?flow= (via AcceptInvitePage)
    const h = window.location.hash
    const q = new URLSearchParams(window.location.search)
    const flow = q.get('flow')
    if (flow === 'invite'   || h.includes('type=invite'))   return 'invite'
    if (flow === 'recovery' || h.includes('type=recovery')) return 'recovery'
    return 'unknown'
  })
  const [isReady,     setIsReady]     = useState(false)
  const [invalidLink, setInvalidLink] = useState(() => {
    // Via AcceptInvitePage: sessione già verificata, mai invalido
    if (new URLSearchParams(window.location.search).get('flow')) return false
    const p = new URLSearchParams(window.location.hash.slice(1))
    return !!p.get('error')
  })
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState(null)
  const [showPwd,     setShowPwd]     = useState(false)

  useEffect(() => {
    let resolved = false
    function resolve() {
      if (resolved) return
      resolved = true
      setIsReady(true)
      setInvalidLink(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { resolve(); return }
      if (event === 'SIGNED_IN' && flowType === 'invite') { resolve(); return }
      // AuthContext may have processed the token first → we get INITIAL_SESSION/SIGNED_IN
      // instead of PASSWORD_RECOVERY. Handle this race condition.
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session && flowType !== 'unknown') {
        resolve()
      }
    })

    const timer = setTimeout(() => { if (!resolved) setInvalidLink(true) }, 10000)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [flowType])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri.')
    if (password !== confirm) return setError('Le password non coincidono.')

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Sessione scaduta — richiedi un nuovo link di ripristino.')
        setLoading(false)
        return
      }
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ password, access_token: session.access_token }),
      })
      setDone(true)
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/admin/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Impossibile aggiornare la password. Richiedi un nuovo link.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Stato: link scaduto o invalido ───────────────────────────────────────
  if (invalidLink && !isReady) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ ...iconWrap, background: '#fef2f2' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', margin: '0 0 8px' }}>Link non valido o scaduto</p>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px', lineHeight: 1.6 }}>
            Il link di ripristino è valido solo per 1 ora e può essere usato una volta sola.
          </p>
          <Link to="/admin/forgot-password" style={linkBtnStyle}>
            Richiedi un nuovo link
          </Link>
        </div>
      </div>
    )
  }

  // ─── Stato: password aggiornata con successo ───────────────────────────────
  if (done) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ ...iconWrap, background: '#f0fdf4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', margin: '0 0 8px' }}>
            {flowType === 'invite' ? 'Account attivato!' : 'Password aggiornata!'}
          </p>
          <p style={{ fontSize: 14, color: '#666', margin: 0, lineHeight: 1.6 }}>
            Verrai reindirizzato al login tra pochi secondi…
          </p>
        </div>
      </div>
    )
  }

  // ─── Stato: loading (attesa token) ────────────────────────────────────────
  if (!isReady) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', margin: 0 }}>Verifica del link in corso…</p>
        </div>
      </div>
    )
  }

  // ─── Stato: form nuova password ───────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: '#1a1a2e' }}>OltreNova</h1>
        <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>
          {flowType === 'invite' ? 'Crea la tua password per accedere al pannello' : 'Scegli una nuova password'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={labelStyle}>Nuova password</label>
            <button type="button" onClick={() => setShowPwd(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', padding: 0 }}>
              {showPwd ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            placeholder="Minimo 8 caratteri"
          />

          <label style={labelStyle}>Conferma password</label>
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            style={inputStyle}
            placeholder="Ripeti la nuova password"
          />

          {/* Indicatore forza password */}
          {password.length > 0 && (
            <div style={{ marginTop: -10, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: password.length >= i * 4
                      ? password.length >= 12 ? '#22c55e' : password.length >= 8 ? '#f59e0b' : '#e53e3e'
                      : '#e8e8e8',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: password.length >= 12 ? '#22c55e' : password.length >= 8 ? '#f59e0b' : '#e53e3e' }}>
                {password.length >= 12 ? 'Password forte' : password.length >= 8 ? 'Password accettabile' : 'Troppo corta'}
              </span>
            </div>
          )}

          {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            style={{ ...buttonStyle, opacity: loading || !password || !confirm ? 0.6 : 1 }}
          >
            {loading ? 'Salvataggio…' : 'Salva nuova password'}
          </button>
        </form>
      </div>
    </div>
  )
}

const pageStyle  = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }
const cardStyle  = { background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }
const iconWrap   = { width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }
const buttonStyle = { width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }
const linkBtnStyle = { display: 'block', textAlign: 'center', padding: '11px', background: '#1a1a2e', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }
