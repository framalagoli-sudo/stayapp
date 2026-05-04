import { useState, useEffect } from 'react'
import { Mail, Phone, Building2, MessageSquare, Trash2, Eye, EyeOff, Inbox } from 'lucide-react'
import { apiFetch } from '../../lib/api'

const PRIMARY = '#1A6490'
const ACCENT  = '#C4952A'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default function DemoRequestsPage() {
  const [richieste, setRichieste] = useState([])
  const [loading, setLoading]     = useState(true)
  const [aperta, setAperta]       = useState(null)   // id richiesta espansa

  useEffect(() => {
    apiFetch('/api/demo')
      .then(d => setRichieste(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function toggleLetto(r) {
    const updated = await apiFetch(`/api/demo/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ letto: !r.letto }),
    })
    setRichieste(prev => prev.map(x => x.id === r.id ? updated : x))
  }

  async function elimina(id) {
    if (!window.confirm('Eliminare questa richiesta?')) return
    await apiFetch(`/api/demo/${id}`, { method: 'DELETE' })
    setRichieste(prev => prev.filter(x => x.id !== id))
    if (aperta === id) setAperta(null)
  }

  function toggleAperta(id) {
    setAperta(prev => prev === id ? null : id)
    // Segna automaticamente come letta all'apertura
    const r = richieste.find(x => x.id === id)
    if (r && !r.letto) toggleLetto(r)
  }

  const nuove    = richieste.filter(r => !r.letto).length
  const totale   = richieste.length

  if (loading) return <div style={{ color: '#888', padding: 32 }}>Caricamento…</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Richieste demo</h1>
          <p style={{ color: '#888', marginTop: 6, fontSize: 14 }}>
            {totale === 0 ? 'Nessuna richiesta ancora.' : `${totale} richieste totali · ${nuove} non lette`}
          </p>
        </div>
        {nuove > 0 && (
          <div style={{ background: ACCENT, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
            {nuove} nuov{nuove === 1 ? 'a' : 'e'}
          </div>
        )}
      </div>

      {/* Lista vuota */}
      {totale === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb' }}>
          <Inbox size={48} strokeWidth={1} color="#ddd" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16 }}>Nessuna richiesta demo ricevuta.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Le richieste dal form della landing page appariranno qui.</p>
        </div>
      )}

      {/* Richieste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {richieste.map(r => (
          <div key={r.id} style={{
            background: '#fff', borderRadius: 12,
            border: r.letto ? '1px solid #e8e8e8' : `1px solid ${PRIMARY}40`,
            boxShadow: r.letto ? 'none' : `0 2px 16px ${PRIMARY}12`,
            overflow: 'hidden',
          }}>
            {/* Riga riassuntiva */}
            <div
              onClick={() => toggleAperta(r.id)}
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
            >
              {/* Badge letto */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.letto ? '#ddd' : ACCENT, flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{r.nome}</span>
                  {r.tipo_attivita && (
                    <span style={{ background: '#f0f4f8', color: '#4A6070', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                      {r.tipo_attivita}
                    </span>
                  )}
                  {!r.letto && (
                    <span style={{ background: ACCENT, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      Nuova
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#4A6070', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Mail size={13} strokeWidth={1.5} /> {r.email}
                  </span>
                  {r.telefono && (
                    <span style={{ fontSize: 13, color: '#4A6070', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={13} strokeWidth={1.5} /> {r.telefono}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#bbb', whiteSpace: 'nowrap' }}>{fmt(r.created_at)}</div>

              {/* Azioni */}
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => toggleLetto(r)}
                  title={r.letto ? 'Segna come non letta' : 'Segna come letta'}
                  style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' }}
                >
                  {r.letto
                    ? <EyeOff size={15} strokeWidth={1.5} />
                    : <Eye size={15} strokeWidth={1.5} />}
                </button>
                <button
                  onClick={() => elimina(r.id)}
                  title="Elimina"
                  style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#e53935' }}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Dettaglio espanso */}
            {aperta === r.id && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0f0f0' }}>
                {r.messaggio ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      Messaggio
                    </div>
                    <p style={{ fontSize: 14, color: '#333', lineHeight: 1.7, background: '#f9f9fb', borderRadius: 8, padding: '12px 16px', margin: 0 }}>
                      {r.messaggio}
                    </p>
                  </div>
                ) : (
                  <p style={{ marginTop: 16, fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>Nessun messaggio aggiuntivo.</p>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <a
                    href={`mailto:${r.email}?subject=Re: Richiesta info StayApp`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PRIMARY, color: '#fff', padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                  >
                    <Mail size={15} strokeWidth={1.5} /> Rispondi via email
                  </a>
                  {r.telefono && (
                    <a
                      href={`https://wa.me/${r.telefono.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
