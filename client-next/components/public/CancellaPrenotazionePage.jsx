'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()

export default function CancellaPrenotazionePage() {
  const params = useSearchParams()
  const token = params.get('token')

  const [stato, setStato] = useState('loading') // loading | ok | error | invalid
  const [messaggio, setMessaggio] = useState('')

  useEffect(() => {
    if (!token) { setStato('invalid'); return }

    fetch(`${API_BASE}/api/booking/public/cancella?token=${token}`)
      .then(async res => {
        const data = await res.json()
        if (res.ok) { setStato('ok'); setMessaggio(data.messaggio || 'Prenotazione cancellata.') }
        else { setStato('error'); setMessaggio(data.error || 'Errore durante la cancellazione.') }
      })
      .catch(() => { setStato('error'); setMessaggio('Impossibile raggiungere il server.') })
  }, [token])

  const icons = { loading: '⏳', ok: '✓', error: '✕', invalid: '⚠️' }
  const colors = { loading: '#888', ok: '#2e7d32', error: '#c0392b', invalid: '#e65100' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '90%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{icons[stato]}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors[stato], marginBottom: 12 }}>
          {stato === 'loading' && 'Annullamento in corso...'}
          {stato === 'ok'      && 'Prenotazione cancellata'}
          {stato === 'error'   && 'Impossibile cancellare'}
          {stato === 'invalid' && 'Link non valido'}
        </h1>
        {messaggio && (
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>{messaggio}</p>
        )}
        {stato === 'invalid' && (
          <p style={{ fontSize: 14, color: '#888' }}>Il link di cancellazione non è valido o è già stato utilizzato.</p>
        )}
        {stato === 'ok' && (
          <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
            Se hai bisogno di assistenza puoi contattarci direttamente.
          </p>
        )}
      </div>
    </div>
  )
}
