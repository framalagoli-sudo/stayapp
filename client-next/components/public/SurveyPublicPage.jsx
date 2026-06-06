'use client'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

const NPS_BG = score =>
  score >= 9 ? '#16a34a' : score >= 7 ? '#d97706' : score >= 0 ? '#dc2626' : '#e5e7eb'

export default function SurveyPublicPage() {
  const token = new URLSearchParams(window.location.search).get('token')
  const [survey, setSurvey]   = useState(null)
  const [score, setScore]     = useState(null)
  const [commento, setCommento] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!token) { setError('Link non valido.'); setLoading(false); return }
    apiFetch(`/api/survey/public?token=${token}`)
      .then(d => {
        setSurvey(d)
        if (d.compilata) setDone(true)
      })
      .catch(() => setError('Survey non trovata o link scaduto.'))
      .finally(() => setLoading(false))
  }, [token])

  async function invia() {
    if (score === null) return setError('Seleziona un punteggio')
    setSaving(true); setError('')
    try {
      await apiFetch('/api/survey/public', {
        method: 'POST',
        body: JSON.stringify({ token, nps_score: score, commento }),
      })
      setDone(true)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const wrap = { minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' }
  const box  = { background: '#fff', borderRadius: 16, padding: '36px 32px', maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }

  if (loading) return <div style={wrap}><div style={{ color: '#aaa', fontSize: 15 }}>Caricamento…</div></div>
  if (error && !survey) return <div style={wrap}><div style={{ ...box, textAlign: 'center', color: '#c53030' }}>{error}</div></div>

  if (done) return (
    <div style={wrap}>
      <div style={{ ...box, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#1a1a2e' }}>Grazie mille!</h2>
        <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          Il tuo feedback è stato registrato e ci aiuterà a migliorare.
        </p>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={box}>
        {survey?.business && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 20 }}>
            {survey.business}
          </div>
        )}

        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#1a1a2e', lineHeight: 1.3 }}>
          {survey?.nome ? `Ciao ${survey.nome}!` : 'Ciao!'} 👋
        </h2>
        <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          Quanto saresti propenso a raccomandare {survey?.business || 'noi'} a un amico o collega?
        </p>

        {/* NPS scale */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setScore(n)} style={{
                width: 44, height: 44, borderRadius: 10,
                border: score === n ? 'none' : '1.5px solid #e5e7eb',
                background: score === n ? NPS_BG(n) : '#fff',
                color: score === n ? '#fff' : '#555',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#bbb' }}>Per niente</span>
            <span style={{ fontSize: 11, color: '#bbb' }}>Assolutamente</span>
          </div>
        </div>

        {/* Commento */}
        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>
            Vuoi aggiungere qualcosa? <span style={{ color: '#bbb' }}>(opzionale)</span>
          </label>
          <textarea value={commento} onChange={e => setCommento(e.target.value)} rows={3}
            placeholder="Il tuo feedback ci aiuta a migliorare…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#333' }} />
        </div>

        {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <button onClick={invia} disabled={saving || score === null} style={{
          width: '100%', padding: '13px 0', background: score !== null ? '#1a1a2e' : '#e5e7eb',
          color: score !== null ? '#fff' : '#aaa', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: score !== null ? 'pointer' : 'default', transition: 'background 0.15s',
        }}>
          {saving ? 'Invio in corso…' : 'Invia feedback →'}
        </button>
      </div>
    </div>
  )
}
