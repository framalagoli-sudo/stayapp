'use client'
import { useState, useEffect } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()

async function publicFetch(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const text = await res.text()
  try { return text ? JSON.parse(text) : {} } catch { return {} }
}

// ─── BookingWidget ────────────────────────────────────────────────────────────
// Props:
//   entityTipo: 'struttura' | 'ristorante' | 'attivita'
//   entityId:   uuid
//   primaryColor: string (ereditato dal tema)

export default function BookingWidget({ entityTipo, entityId, primaryColor = '#00b5b5' }) {
  const [risorse, setRisorse] = useState([])
  const [loading, setLoading] = useState(true)

  // Step wizard: 'risorsa' | 'data' | 'slot' | 'form' | 'done'
  const [step, setStep] = useState('risorsa')
  const [selected, setSelected] = useState({ risorsa: null, data: '', slot: null })
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefono: '', n_persone: 1, note: '' })
  const [sending, setSending] = useState(false)
  const [errore, setErrore] = useState('')
  const [prenotazione, setPrenotazione] = useState(null)

  useEffect(() => {
    if (!entityId) return
    publicFetch(`/api/booking/public/risorse/${entityTipo}/${entityId}`)
      .then(data => setRisorse(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [entityTipo, entityId])

  // Quando cambia data o risorsa, ricarica disponibilità
  useEffect(() => {
    if (!selected.risorsa || !selected.data) return
    setSlots([])
    setLoadingSlots(true)
    publicFetch(`/api/booking/public/disponibilita/${selected.risorsa.id}?data=${selected.data}`)
      .then(d => setSlots(d.slots || []))
      .finally(() => setLoadingSlots(false))
  }, [selected.risorsa, selected.data])

  function selectRisorsa(r) {
    setSelected({ risorsa: r, data: '', slot: null })
    setSlots([])
    setStep('data')
  }

  function selectData(data) {
    setSelected(s => ({ ...s, data, slot: null }))
    setStep('slot')
  }

  function selectSlot(slot) {
    setSelected(s => ({ ...s, slot }))
    setStep('form')
  }

  function patchForm(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }
    if (!form.email.trim()) { setErrore("L'email è obbligatoria"); return }
    setSending(true); setErrore('')
    try {
      const body = {
        risorsa_id: selected.risorsa.id,
        data: selected.data,
        ...(selected.risorsa.modalita === 'slot'
          ? { ora_inizio: selected.slot.ora }
          : { servizio: selected.slot.servizio, ora_inizio: selected.slot.ora }),
        cliente_nome: form.nome.trim(),
        cliente_email: form.email.trim(),
        cliente_telefono: form.telefono.trim() || null,
        n_persone: form.n_persone,
        note_cliente: form.note.trim() || null,
        promozione_id: selected.slot.promo?.id || null,
      }
      const res = await fetch(`${API_BASE}/api/booking/public/prenota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore')
      setPrenotazione(data)
      setStep('done')
    } catch (e) { setErrore(e.message) }
    finally { setSending(false) }
  }

  function reset() {
    setStep('risorsa'); setSelected({ risorsa: null, data: '', slot: null })
    setSlots([]); setForm({ nome: '', email: '', telefono: '', n_persone: 1, note: '' })
    setPrenotazione(null); setErrore('')
  }

  const today = new Date().toISOString().slice(0, 10)

  if (loading) return <div style={wrapStyle}>Caricamento...</div>
  if (risorse.length === 0) return null

  // ── STEP: DONE ──────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: primaryColor, marginBottom: 8 }}>Prenotazione confermata!</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          Hai prenotato <strong>{selected.risorsa.nome}</strong>
        </div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          {formatData(selected.data)} {selected.slot.servizio ? `— ${selected.slot.servizio}` : ''} ore {selected.slot.ora}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          Riceverai una conferma a <strong>{form.email}</strong>
        </div>
        <button onClick={reset} style={{ ...btnStyle(primaryColor), marginTop: 8 }}>Nuova prenotazione</button>
      </div>
    </div>
  )

  return (
    <div style={wrapStyle}>
      {/* Breadcrumb */}
      <Breadcrumb step={step} risorsa={selected.risorsa} data={selected.data} primaryColor={primaryColor}
        onStep={(s) => { if (['risorsa','data','slot'].includes(s) && step !== 'done') setStep(s) }} />

      {/* ── STEP: SCEGLI RISORSA ─────────────────────────────────────────────── */}
      {step === 'risorsa' && (
        <div>
          <div style={titleStyle}>Cosa vuoi prenotare?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {risorse.map(r => (
              <button key={r.id} onClick={() => selectRisorsa(r)} style={cardBtnStyle(primaryColor)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.colore, flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{r.nome}</div>
                    {r.descrizione && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{r.descrizione}</div>}
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                      {r.modalita === 'slot'
                        ? `${r.durata_minuti} min${r.prezzo > 0 ? ` · €${r.prezzo}` : ''}`
                        : `${r.max_coperti} posti${r.prezzo > 0 ? ` · €${r.prezzo} a persona` : ''}`
                      }
                    </div>
                  </div>
                </div>
                <span style={{ color: primaryColor, fontSize: 18 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: SCEGLI DATA ────────────────────────────────────────────────── */}
      {step === 'data' && (
        <div>
          <div style={titleStyle}>Scegli la data</div>
          <input
            type="date"
            min={today}
            value={selected.data}
            onChange={e => selectData(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: `2px solid ${primaryColor}`, borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={() => setStep('risorsa')} style={backBtnStyle}>← Indietro</button>
        </div>
      )}

      {/* ── STEP: SCEGLI SLOT ────────────────────────────────────────────────── */}
      {step === 'slot' && (
        <div>
          <div style={titleStyle}>
            {selected.risorsa.modalita === 'coperti' ? 'Scegli servizio e orario' : 'Scegli orario'}
          </div>

          {loadingSlots ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Verifica disponibilità...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>😔</div>
              <div>Nessuna disponibilità per questa data.</div>
              <button onClick={() => setStep('data')} style={{ ...backBtnStyle, marginTop: 12 }}>← Scegli un'altra data</button>
            </div>
          ) : (
            <>
              {selected.risorsa.modalita === 'coperti' ? (
                // Coperti: raggruppa per servizio
                Object.entries(
                  slots.reduce((acc, s) => { acc[s.servizio] = [...(acc[s.servizio] || []), s]; return acc }, {})
                ).map(([servizio, orari]) => (
                  <div key={servizio} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{servizio}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {orari.map(slot => (
                        <button key={slot.ora} onClick={() => selectSlot(slot)} style={slotBtnStyle(primaryColor, false)}>
                          <div style={{ fontWeight: 700 }}>{slot.ora}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{slot.disponibili} posti</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Slot orari: griglia
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map(slot => (
                    <button key={slot.ora} onClick={() => selectSlot(slot)}
                      style={slotBtnStyle(primaryColor, !!slot.promo)}>
                      {slot.promo && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: slot.promo.colore, borderRadius: 4, padding: '2px 5px', marginBottom: 2 }}>
                          {slot.promo.badge}
                        </div>
                      )}
                      <div style={{ fontWeight: 700 }}>{slot.ora}</div>
                      <div style={{ fontSize: 11, color: slot.promo ? primaryColor : '#888' }}>
                        {slot.promo ? `€${slot.promo.prezzo}` : (slot.prezzo > 0 ? `€${slot.prezzo}` : 'Libero')}
                      </div>
                      {slot.totale > 1 && (
                        <div style={{ fontSize: 10, color: '#aaa' }}>{slot.disponibili}/{slot.totale}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep('data')} style={backBtnStyle}>← Cambia data</button>
            </>
          )}
        </div>
      )}

      {/* ── STEP: FORM CONTATTI ──────────────────────────────────────────────── */}
      {step === 'form' && (
        <div>
          <div style={titleStyle}>I tuoi dati</div>

          {/* Riepilogo */}
          <div style={{ background: '#f8f8f8', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 14 }}>
            <div style={{ fontWeight: 600 }}>{selected.risorsa.nome}</div>
            <div style={{ color: '#666', marginTop: 2 }}>
              {formatData(selected.data)} — {selected.slot.servizio ? `${selected.slot.servizio} ` : ''}{selected.slot.ora}
              {selected.slot.promo
                ? <span style={{ color: selected.slot.promo.colore, fontWeight: 600 }}> · €{selected.slot.promo.prezzo} ({selected.slot.promo.badge})</span>
                : selected.slot.prezzo > 0 ? <span> · €{selected.slot.prezzo}</span> : ''}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Nome e cognome *" value={form.nome} onChange={e => patchForm('nome', e.target.value)} style={inputStyle(primaryColor)} />
            <input type="email" placeholder="Email *" value={form.email} onChange={e => patchForm('email', e.target.value)} style={inputStyle(primaryColor)} />
            <input type="tel" placeholder="Telefono" value={form.telefono} onChange={e => patchForm('telefono', e.target.value)} style={inputStyle(primaryColor)} />

            {(selected.risorsa.modalita === 'coperti' || selected.risorsa.quantita > 1) && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Numero persone</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => patchForm('n_persone', Math.max(1, form.n_persone - 1))} style={counterBtn}>−</button>
                  <span style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{form.n_persone}</span>
                  <button onClick={() => patchForm('n_persone', Math.min(selected.slot.disponibili || 20, form.n_persone + 1))} style={counterBtn}>+</button>
                  <span style={{ fontSize: 13, color: '#888' }}>(max {selected.slot.disponibili})</span>
                </div>
              </div>
            )}

            <textarea placeholder="Note (opzionale)" value={form.note} onChange={e => patchForm('note', e.target.value)}
              rows={2} style={{ ...inputStyle(primaryColor), resize: 'vertical' }} />
          </div>

          {errore && <div style={{ marginTop: 10, color: '#c0392b', fontSize: 13 }}>{errore}</div>}

          <button onClick={submit} disabled={sending} style={{ ...btnStyle(primaryColor), marginTop: 16, width: '100%', padding: '14px' }}>
            {sending ? 'Invio in corso...' : 'Conferma prenotazione'}
          </button>
          <button onClick={() => setStep('slot')} style={backBtnStyle}>← Indietro</button>
        </div>
      )}
    </div>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ step, risorsa, data, primaryColor, onStep }) {
  const steps = [
    { key: 'risorsa', label: risorsa ? risorsa.nome : 'Servizio' },
    { key: 'data',    label: data ? formatData(data) : 'Data' },
    { key: 'slot',    label: 'Orario' },
    { key: 'form',    label: 'Dati' },
  ]
  const currentIdx = steps.findIndex(s => s.key === step)
  if (step === 'done') return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span onClick={() => i < currentIdx && onStep(s.key)} style={{
            fontSize: 12, padding: '3px 8px', borderRadius: 20,
            background: i === currentIdx ? primaryColor : i < currentIdx ? '#e8f0fe' : '#f0f0f0',
            color: i === currentIdx ? '#fff' : i < currentIdx ? primaryColor : '#aaa',
            cursor: i < currentIdx ? 'pointer' : 'default',
            fontWeight: i <= currentIdx ? 600 : 400,
          }}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span style={{ color: '#ccc', fontSize: 12 }}>›</span>}
        </span>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatData(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Stili ────────────────────────────────────────────────────────────────────
const wrapStyle   = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 520 }
const titleStyle  = { fontSize: 17, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }
const backBtnStyle = { marginTop: 14, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0 }
const counterBtn  = { width: 32, height: 32, borderRadius: '50%', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }

const btnStyle = (color) => ({
  background: color, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px',
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
})

const inputStyle = (color) => ({
  width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  onFocus: `border-color: ${color}`,
})

const cardBtnStyle = (color) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  width: '100%', padding: '14px 16px', background: '#f9f9f9',
  border: '1px solid #ebebeb', borderRadius: 12, cursor: 'pointer',
  textAlign: 'left', transition: 'border-color 0.15s',
})

const slotBtnStyle = (color, isPromo) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '10px 14px', borderRadius: 10, border: `2px solid ${isPromo ? color : '#e0e0e0'}`,
  background: isPromo ? color + '0d' : '#fff', cursor: 'pointer', minWidth: 72,
})
