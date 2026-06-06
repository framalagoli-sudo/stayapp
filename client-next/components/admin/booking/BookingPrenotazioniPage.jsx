'use client'
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../../lib/api'
import { Star, Copy, Check } from 'lucide-react'

const STATI = ['', 'confermata', 'in_attesa', 'completata', 'cancellata', 'no_show']
const STATI_LABEL = { confermata: 'Confermata', in_attesa: 'In attesa', completata: 'Completata', cancellata: 'Cancellata', no_show: 'No show' }
const STATI_COLOR = { confermata: '#2e7d32', in_attesa: '#e65100', completata: '#1565c0', cancellata: '#999', no_show: '#b71c1c' }

function today() { return new Date().toISOString().slice(0, 10) }

export default function BookingPrenotazioniPage() {
  const [prenotazioni, setPrenotazioni] = useState([])
  const [risorse, setRisorse] = useState([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({ risorsa_id: '', stato: '', data_da: today(), data_a: '' })
  const [expanded, setExpanded] = useState(null)
  const [editNote, setEditNote] = useState({})
  const [recLink, setRecLink] = useState({}) // { [id]: { link, copied } }

  function patchFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
      const [data, rs] = await Promise.all([
        apiFetch(`/api/booking/prenotazioni${qs ? '?' + qs : ''}`),
        risorse.length ? Promise.resolve(risorse) : apiFetch('/api/booking/risorse'),
      ])
      setPrenotazioni(data)
      if (!risorse.length) setRisorse(rs)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])  // eslint-disable-line

  useEffect(() => { load() }, [load])

  async function updateStato(id, stato) {
    await apiFetch(`/api/booking/prenotazioni/${id}`, { method: 'PATCH', body: JSON.stringify({ stato }) })
    setPrenotazioni(ps => ps.map(p => p.id === id ? { ...p, stato } : p))
  }

  async function saveNote(id) {
    const note_interne = editNote[id] ?? ''
    await apiFetch(`/api/booking/prenotazioni/${id}`, { method: 'PATCH', body: JSON.stringify({ note_interne }) })
    setPrenotazioni(ps => ps.map(p => p.id === id ? { ...p, note_interne } : p))
    setExpanded(null)
  }

  async function generaLinkRecensione(p) {
    if (recLink[p.id]?.link) {
      await navigator.clipboard.writeText(recLink[p.id].link)
      setRecLink(r => ({ ...r, [p.id]: { ...r[p.id], copied: true } }))
      setTimeout(() => setRecLink(r => ({ ...r, [p.id]: { ...r[p.id], copied: false } })), 2000)
      return
    }
    try {
      const data = await apiFetch('/api/recensioni/genera-link', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: p.entity_tipo, entity_id: p.entity_id, autore: p.cliente_nome }),
      })
      setRecLink(r => ({ ...r, [p.id]: { link: data.link, copied: false } }))
      await navigator.clipboard.writeText(data.link)
      setRecLink(r => ({ ...r, [p.id]: { ...r[p.id], copied: true } }))
      setTimeout(() => setRecLink(r => ({ ...r, [p.id]: { ...r[p.id], copied: false } })), 2000)
    } catch {}
  }

  async function deleteP(id, nome) {
    if (!confirm(`Eliminare la prenotazione di ${nome}?`)) return
    await apiFetch(`/api/booking/prenotazioni/${id}`, { method: 'DELETE' })
    setPrenotazioni(ps => ps.filter(p => p.id !== id))
  }

  // Raggruppa per data per una lettura più facile
  const byDate = prenotazioni.reduce((acc, p) => {
    acc[p.data] = acc[p.data] || []
    acc[p.data].push(p)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Prenotazioni risorse</h1>
        <div style={{ fontSize: 13, color: '#888' }}>{prenotazioni.length} trovate</div>
      </div>

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={labelStyle}>Risorsa</div>
          <select value={filters.risorsa_id} onChange={e => patchFilter('risorsa_id', e.target.value)} style={selectStyle}>
            <option value="">Tutte</option>
            {risorse.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Stato</div>
          <select value={filters.stato} onChange={e => patchFilter('stato', e.target.value)} style={selectStyle}>
            {STATI.map(s => <option key={s} value={s}>{s || 'Tutti'}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Dal</div>
          <input type="date" value={filters.data_da} onChange={e => patchFilter('data_da', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Al</div>
          <input type="date" value={filters.data_a} onChange={e => patchFilter('data_a', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={() => setFilters({ risorsa_id: '', stato: '', data_da: '', data_a: '' })} style={ghostBtn}>Reset</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#999', padding: 20 }}>Caricamento...</div>
      ) : prenotazioni.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nessuna prenotazione trovata</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Prova a modificare i filtri o ad allargare il periodo.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sortedDates.map(data => (
            <div key={data}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {formatData(data)} {data === today() ? '— Oggi' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {byDate[data].map(p => {
                  const risorsa = p.risorse || {}
                  const isOpen = expanded === p.id
                  return (
                    <div key={p.id} style={{
                      background: '#fff', borderRadius: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      borderLeft: `4px solid ${STATI_COLOR[p.stato] || '#ddd'}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>

                        {/* Ora */}
                        <div style={{ fontWeight: 700, fontSize: 14, minWidth: 72, color: '#333' }}>
                          {p.servizio || p.ora_inizio?.slice(0, 5) || '—'}
                        </div>

                        {/* Risorsa + cliente */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente_nome}</span>
                            {p.n_persone > 1 && <span style={{ fontSize: 12, color: '#888' }}>× {p.n_persone}</span>}
                            <span style={{ fontSize: 11, background: '#f0f0f0', borderRadius: 4, padding: '2px 6px', color: '#666' }}>
                              {risorsa.nome}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            {p.cliente_email}
                            {p.cliente_telefono ? ` · ${p.cliente_telefono}` : ''}
                          </div>
                          {p.note_cliente && (
                            <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 2 }}>"{p.note_cliente}"</div>
                          )}
                        </div>

                        {/* Importo */}
                        {p.importo_totale > 0 && (
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32', whiteSpace: 'nowrap' }}>€{p.importo_totale}</div>
                        )}

                        {/* Stato selector */}
                        <select value={p.stato} onChange={e => updateStato(p.id, e.target.value)}
                          style={{ ...selectStyle, fontWeight: 600, color: STATI_COLOR[p.stato], borderColor: STATI_COLOR[p.stato] + '44' }}>
                          {STATI.slice(1).map(s => <option key={s} value={s}>{STATI_LABEL[s]}</option>)}
                        </select>

                        {/* Azioni */}
                        <button onClick={() => generaLinkRecensione(p)}
                          title={recLink[p.id]?.link ? 'Copia link recensione' : 'Genera link recensione'}
                          style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12, color: recLink[p.id]?.copied ? '#276749' : '#b7791f', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {recLink[p.id]?.copied ? <><Check size={13} strokeWidth={1.5} /> Copiato</> : <><Star size={13} strokeWidth={1.5} /> Recensione</>}
                        </button>
                        <button onClick={() => {
                          setExpanded(isOpen ? null : p.id)
                          setEditNote(n => ({ ...n, [p.id]: p.note_interne || '' }))
                        }} style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12 }}>
                          Note {isOpen ? '▲' : '▼'}
                        </button>
                        <button onClick={() => deleteP(p.id, p.cliente_nome)} style={{ ...ghostBtn, color: '#c0392b', padding: '6px 10px' }}>✕</button>
                      </div>

                      {/* Pannello note interne */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', background: '#fafafa' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Note interne (non visibili al cliente)</div>
                          <textarea
                            value={editNote[p.id] || ''}
                            onChange={e => setEditNote(n => ({ ...n, [p.id]: e.target.value }))}
                            rows={2}
                            placeholder="Aggiungi note per lo staff..."
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                          />
                          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                            <button onClick={() => saveNote(p.id)} style={primaryBtn}>Salva nota</button>
                            <button onClick={() => setExpanded(null)} style={ghostBtn}>Annulla</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatData(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }
const inputStyle  = { padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, outline: 'none' }
const selectStyle = { ...inputStyle, cursor: 'pointer', background: '#fff' }
const ghostBtn    = { background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }
const primaryBtn  = { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }
