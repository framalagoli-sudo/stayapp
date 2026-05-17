import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function ConfirmSubscriptionPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState('loading')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setState('error'); return }
    fetch(`${API_BASE}/api/guest/confirm-subscription?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => setState(data.ok ? 'ok' : 'error'))
      .catch(() => setState('error'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 420, width: '90%' }}>
        {state === 'loading' && (
          <>
            <Loader size={40} color="#aaa" strokeWidth={1.5} style={{ marginBottom: 16, animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#888', margin: 0, fontSize: 15 }}>Conferma in corso…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle size={48} color="#38a169" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#1a1a2e' }}>Iscrizione confermata!</h2>
            <p style={{ color: '#666', fontSize: 15, margin: 0, lineHeight: 1.6 }}>Sei ufficialmente iscritto/a alla newsletter. A presto!</p>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle size={48} color="#e53e3e" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#1a1a2e' }}>Link non valido</h2>
            <p style={{ color: '#666', fontSize: 15, margin: 0, lineHeight: 1.6 }}>Il link di conferma non è più valido o è già stato utilizzato.</p>
          </>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
