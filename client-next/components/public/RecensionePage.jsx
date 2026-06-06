'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 40, lineHeight: 1, color: n <= (hover || value) ? '#f59e0b' : '#e0e0e0', transition: 'color 0.1s' }}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function RecensionePage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [stelle, setStelle]   = useState(0)
  const [autore, setAutore]   = useState('')
  const [testo, setTesto]     = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)
  const [redirect, setRedirect] = useState(null)

  useEffect(() => {
    if (!token) { setError('Link non valido.'); setLoading(false); return }
    fetch(`${API}/api/guest/recensione/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { setInfo(d); setAutore(d.autore || '') }
        setLoading(false)
      })
      .catch(() => { setError('Errore di rete.'); setLoading(false) })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stelle) return
    setSending(true)
    try {
      const res = await fetch(`${API}/api/guest/recensione/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stelle, autore, testo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore')
      setDone(true)
      if (data.redirect) setRedirect(data.redirect)
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  const primary = info?.primary || '#1a1a2e'
  const entityName = info?.entity_name || 'OltreNova'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ fontSize: 15, color: '#aaa' }}>Caricamento…</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, color: '#1a1a2e', fontWeight: 600, marginBottom: 8 }}>Link non valido</div>
        <div style={{ fontSize: 14, color: '#888' }}>{error}</div>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 32px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🙏</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>Grazie!</div>
        <div style={{ fontSize: 15, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>
          La tua recensione è stata registrata.
        </div>
        {redirect && (
          <>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
              Puoi lasciarci anche una recensione pubblica su Google o TripAdvisor — ci aiuta molto!
            </p>
            <a href={redirect} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '13px 28px', background: primary, color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              Lascia una recensione pubblica →
            </a>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 480, background: primary, borderRadius: '16px 16px 0 0', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {info.entity_logo && (
          <img src={info.entity_logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
        )}
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{entityName}</div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '0 0 16px 16px', padding: '36px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1a1a2e', textAlign: 'center' }}>Come è andata?</h1>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#888', textAlign: 'center' }}>Condividi la tua esperienza con {entityName}</p>

        {/* Stelle */}
        <div style={{ marginBottom: 28 }}>
          <StarPicker value={stelle} onChange={setStelle} />
          <div style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 8 }}>
            {stelle === 0 && 'Seleziona un voto'}
            {stelle === 1 && 'Pessimo'}
            {stelle === 2 && 'Scarso'}
            {stelle === 3 && 'Nella media'}
            {stelle === 4 && 'Buono'}
            {stelle === 5 && 'Eccellente'}
          </div>
        </div>

        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Il tuo nome</label>
          <input value={autore} onChange={e => setAutore(e.target.value)}
            placeholder="Mario Rossi"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />
        </div>

        {/* Testo */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>
            La tua recensione <span style={{ fontWeight: 400, color: '#aaa' }}>(opzionale)</span>
          </label>
          <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={4}
            placeholder="Racconta la tua esperienza…"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" disabled={!stelle || sending}
          style={{ width: '100%', padding: '14px', background: stelle ? primary : '#ccc', border: 'none', borderRadius: 10, cursor: stelle ? 'pointer' : 'default', fontSize: 16, fontWeight: 700, color: '#fff', transition: 'background 0.2s' }}>
          {sending ? 'Invio…' : 'Invia recensione'}
        </button>
      </form>
    </div>
  )
}
