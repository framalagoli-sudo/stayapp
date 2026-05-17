import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState('loading')

  useEffect(() => {
    if (!token) { setState('error'); return }
    fetch(`${API_BASE}/api/guest/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? setState('ok') : setState('error'))
      .catch(() => setState('error'))
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {state === 'loading' && (
          <p style={{ color: '#888', fontSize: 15 }}>Elaborazione…</p>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle size={48} strokeWidth={1.5} color="#38a169" style={{ margin: '0 auto 20px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#1a1a2e' }}>Disiscrizione completata</h2>
            <p style={{ margin: 0, fontSize: 15, color: '#666', lineHeight: 1.6 }}>
              Sei stato rimosso dalla lista newsletter. Non riceverai più comunicazioni promozionali.
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle size={48} strokeWidth={1.5} color="#e53e3e" style={{ margin: '0 auto 20px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#1a1a2e' }}>Link non valido</h2>
            <p style={{ margin: 0, fontSize: 15, color: '#666', lineHeight: 1.6 }}>
              Il link di disiscrizione non è valido o è già stato utilizzato.
            </p>
          </>
        )}
        <a href="/" style={{ display: 'inline-block', marginTop: 28, fontSize: 13, color: '#888', textDecoration: 'underline' }}>
          Torna alla home
        </a>
      </div>
    </div>
  )
}
