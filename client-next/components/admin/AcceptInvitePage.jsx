'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AcceptInvitePage() {
  const router = useRouter()
  const params   = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  const type      = params.get('type') || 'recovery'

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleAccept() {
    if (!tokenHash) { setError('Link non valido.'); return }
    setLoading(true)
    setError(null)
    try {
      const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (otpErr) throw otpErr
      router.push(`/admin/reset-password?flow=${type === 'invite' ? 'invite' : 'recovery'}`)
    } catch (err) {
      setError('Link non valido o scaduto. Chiedi all\'amministratore di reinviare l\'invito.')
      setLoading(false)
    }
  }

  if (!tokenHash) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#e53e3e', fontSize: 14, textAlign: 'center' }}>Link non valido.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 22, color: '#1a1a2e' }}>OltreNova</h1>
        <p style={{ margin: '0 0 28px', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
          Sei stato invitato a collaborare sul pannello OltreNova.<br />
          Clicca il pulsante per impostare la tua password.
        </p>

        {error && (
          <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={loading}
          style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Verifica in corso…' : 'Accetta invito →'}
        </button>
      </div>
    </div>
  )
}

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }
const cardStyle = { background: '#fff', padding: 40, borderRadius: 12, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', textAlign: 'center' }
const btnStyle  = { width: '100%', padding: 13, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }
