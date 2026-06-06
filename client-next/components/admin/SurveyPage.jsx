'use client'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { BarChart2, Send, X, Star, ThumbsUp, ThumbsDown, Minus, Clock } from 'lucide-react'

const NPS_COLOR = score =>
  score >= 9 ? '#16a34a' : score >= 7 ? '#d97706' : '#dc2626'

const NPS_LABEL = score =>
  score >= 9 ? 'Promotore' : score >= 7 ? 'Neutro' : 'Detrattore'

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 3600)   return `${Math.floor(d / 60)} min fa`
  if (d < 86400)  return `${Math.floor(d / 3600)} ore fa`
  if (d < 172800) return 'ieri'
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function NpsChip({ score }) {
  const color = NPS_COLOR(score)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: color + '18', color }}>
      {score}
    </span>
  )
}

function InviaModal({ onClose, onSent }) {
  const [email, setEmail] = useState('')
  const [nome, setNome]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function invia() {
    if (!email.trim()) return setError('Email obbligatoria')
    setLoading(true); setError('')
    try {
      await apiFetch('/api/survey/invia', { method: 'POST', body: JSON.stringify({ email, nome }) })
      onSent()
      onClose()
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Invia survey NPS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} strokeWidth={1.5} color="#888" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
          Il cliente riceverà un'email con il link per valutare la sua esperienza su scala 0-10.
        </p>
        {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email cliente *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Nome cliente (opzionale)</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario Rossi"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <button onClick={invia} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: loading ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: 14 }}>
          <Send size={15} strokeWidth={1.5} />
          {loading ? 'Invio in corso…' : 'Invia survey'}
        </button>
      </div>
    </div>
  )
}

export default function SurveyPage() {
  const [risposte, setRisposte] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    try { setRisposte(await apiFetch('/api/survey')) }
    catch { setRisposte([]) }
    setLoading(false)
  }

  function onSent() {
    setSuccessMsg('Survey inviata!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  // ── KPI ──────────────────────────────────────────────────────────────────────
  const tot = risposte.length
  const promotori  = risposte.filter(r => r.nps_score >= 9).length
  const detrattori = risposte.filter(r => r.nps_score <= 6).length
  const neutri     = tot - promotori - detrattori
  const npsScore   = tot > 0 ? Math.round((promotori / tot - detrattori / tot) * 100) : null
  const pPro  = tot > 0 ? Math.round(promotori  / tot * 100) : 0
  const pNeu  = tot > 0 ? Math.round(neutri      / tot * 100) : 0
  const pDet  = tot > 0 ? Math.round(detrattori  / tot * 100) : 0
  const npsColor = npsScore === null ? '#888' : npsScore >= 50 ? '#16a34a' : npsScore >= 0 ? '#d97706' : '#dc2626'

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: '20px 22px' }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Survey & NPS</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Send size={14} strokeWidth={1.5} /> Invia survey
        </button>
      </div>

      {successMsg && (
        <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#276749' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>NPS Score</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: npsColor, lineHeight: 1 }}>{npsScore ?? '—'}</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
            {npsScore === null ? 'nessuna risposta' : npsScore >= 50 ? 'Eccellente' : npsScore >= 0 ? 'Buono' : 'Da migliorare'}
          </div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            <ThumbsUp size={12} strokeWidth={1.5} /> Promotori
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{pPro}%</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>punteggio 9-10</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            <Minus size={12} strokeWidth={1.5} /> Neutri
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{pNeu}%</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>punteggio 7-8</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            <ThumbsDown size={12} strokeWidth={1.5} /> Detrattori
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{pDet}%</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>punteggio 0-6</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Risposte</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{tot}</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>totale compilate</div>
        </div>
      </div>

      {/* Lista risposte */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Risposte recenti</div>
        {loading ? (
          <div style={{ color: '#bbb', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Caricamento…</div>
        ) : risposte.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
            <Star size={32} strokeWidth={1} color="#ddd" style={{ display: 'block', margin: '0 auto 12px' }} />
            Nessuna risposta ancora. Invia la prima survey!
          </div>
        ) : (
          risposte.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < risposte.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <NpsChip score={r.nps_score} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.nome_cliente || r.email_cliente || 'Anonimo'}</span>
                  <span style={{ fontSize: 11, color: NPS_COLOR(r.nps_score), background: NPS_COLOR(r.nps_score) + '15', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                    {NPS_LABEL(r.nps_score)}
                  </span>
                </div>
                {r.commento && <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>"{r.commento}"</div>}
                {r.email_cliente && r.nome_cliente && (
                  <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>{r.email_cliente}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#bbb', flexShrink: 0 }}>
                <Clock size={11} strokeWidth={1.5} /> {timeAgo(r.compilato_at)}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && <InviaModal onClose={() => setShowModal(false)} onSent={onSent} />}
    </div>
  )
}
