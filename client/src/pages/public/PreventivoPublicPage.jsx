import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function fmt(n, currency = 'EUR') {
  return Number(n).toLocaleString('it-IT', { style: 'currency', currency })
}

function calcSubtotale(v) {
  return (v.qty || 1) * (v.prezzo_unitario || 0) * (1 - (v.sconto_pct || 0) / 100)
}

const STATO_INFO = {
  bozza:     { label: 'In preparazione', color: '#666',    bg: '#f5f5f5' },
  inviato:   { label: 'In attesa di risposta', color: '#2b6cb0', bg: '#ebf8ff' },
  accettato: { label: 'Accettato',      color: '#276749', bg: '#f0fff4' },
  rifiutato: { label: 'Non accettato',  color: '#c53030', bg: '#fff5f5' },
  scaduto:   { label: 'Scaduto',        color: '#b45309', bg: '#fffbeb' },
}

export default function PreventivoPublicPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [firmaNome, setFirmaNome] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) { setError('Token mancante'); setLoading(false); return }
    fetch(`${API_BASE}/api/preventivi/public/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  async function handleAccetta(e) {
    e.preventDefault()
    if (!firmaNome.trim()) { setSubmitError('Inserisci il tuo nome per accettare'); return }
    setSubmitting(true); setSubmitError('')
    try {
      const res = await fetch(`${API_BASE}/api/preventivi/public/${token}/accetta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma_nome: firmaNome }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Errore')
      setAccepted(true)
      setData(d => ({ ...d, stato: 'accettato', accettato_at: body.accettato_at, firma_nome: firmaNome }))
    } catch (e) { setSubmitError(e.message) }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#888' }}>Caricamento preventivo…</p>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#c53030' }}>Preventivo non trovato</h2>
        <p style={{ color: '#888' }}>{error}</p>
      </div>
    </div>
  )

  const { voci = [], iva_pct = 0, valuta = 'EUR', stato } = data
  const imponibile = voci.reduce((acc, v) => acc + calcSubtotale(v), 0)
  const iva = imponibile * (iva_pct / 100)
  const totale = imponibile + iva
  const statoInfo = STATO_INFO[stato] || STATO_INFO.bozza

  const canAccept = stato === 'inviato'
  const isScaduto = data.scadenza && new Date(data.scadenza) < new Date() && stato !== 'accettato'

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '20px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Preventivo da</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data.aziende?.ragione_sociale || 'Azienda'}</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stato badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
              {data.numero} — {data.titolo}
            </div>
            {data.scadenza && (
              <div style={{ fontSize: 13, color: isScaduto ? '#b45309' : '#888', marginTop: 4 }}>
                {isScaduto ? '⚠ Scaduto il' : 'Valido fino al'} {new Date(data.scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: statoInfo.bg, color: statoInfo.color }}>
            {statoInfo.label}
          </span>
        </div>

        {/* Voci */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Dettaglio</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: '#888', fontWeight: 600 }}>Descrizione</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#888', fontWeight: 600, width: 50 }}>Qtà</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#888', fontWeight: 600, width: 100 }}>Prezzo</th>
                  {voci.some(v => v.sconto_pct > 0) && (
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: '#888', fontWeight: 600, width: 70 }}>Sconto</th>
                  )}
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: '#888', fontWeight: 600, width: 100 }}>Totale</th>
                </tr>
              </thead>
              <tbody>
                {voci.map((v, i) => (
                  <tr key={v.id || i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 6px', color: '#1a1a2e' }}>{v.descrizione || '—'}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', color: '#555' }}>{v.qty}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', color: '#555' }}>{fmt(v.prezzo_unitario, valuta)}</td>
                    {voci.some(v => v.sconto_pct > 0) && (
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: '#888' }}>
                        {v.sconto_pct > 0 ? `-${v.sconto_pct}%` : ''}
                      </td>
                    )}
                    <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(calcSubtotale(v), valuta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totali */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 16, borderTop: '1px solid #eee', marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#555' }}>Imponibile: <strong>{fmt(imponibile, valuta)}</strong></div>
            {iva_pct > 0 && (
              <div style={{ fontSize: 13, color: '#555' }}>IVA {iva_pct}%: <strong>{fmt(iva, valuta)}</strong></div>
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginTop: 4 }}>
              Totale: {fmt(totale, valuta)}
            </div>
          </div>
        </div>

        {/* Note */}
        {data.note && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#888' }}>Note</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.note}</p>
          </div>
        )}

        {/* Firma / Accettazione */}
        {stato === 'accettato' ? (
          <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#276749' }}>Preventivo accettato</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              Firmato da <strong>{data.firma_nome}</strong>
              {data.accettato_at && <> il {new Date(data.accettato_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</>}
            </div>
          </div>
        ) : canAccept && !isScaduto ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700 }}>Accetta il preventivo</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px 0' }}>
              Inserisci il tuo nome per accettare ufficialmente questo preventivo.
            </p>
            <form onSubmit={handleAccetta}>
              <input
                type="text"
                value={firmaNome}
                onChange={e => setFirmaNome(e.target.value)}
                placeholder="Nome e cognome"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
              />
              {submitError && (
                <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 12px 0' }}>{submitError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Invio in corso…' : '✓ Accetto il preventivo'}
              </button>
            </form>
          </div>
        ) : isScaduto ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏰</div>
            <div style={{ fontSize: 14, color: '#b45309', fontWeight: 600 }}>Questo preventivo è scaduto</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Contatta {data.aziende?.ragione_sociale || 'l\'azienda'} per richiederne uno aggiornato.</div>
          </div>
        ) : stato === 'rifiutato' ? (
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#c53030', fontWeight: 600 }}>Preventivo non accettato</div>
          </div>
        ) : (
          <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#888' }}>Questo preventivo è in fase di preparazione e non è ancora disponibile per l'accettazione.</div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 32 }}>
          Inviato con StayApp
        </p>
      </div>
    </div>
  )
}
