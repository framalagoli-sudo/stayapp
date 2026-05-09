import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../lib/api'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function lunedìDellaSett(ref) {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Colore occupancy: 0%=verde, 50%=giallo, 100%=rosso
function occupancyColor(count, max) {
  if (!max || count === 0) return '#e8f5e9'
  const pct = count / max
  if (pct >= 1) return '#fce4e4'
  if (pct >= 0.7) return '#fff3cd'
  return '#e3f2fd'
}

function occupancyText(count, max) {
  if (!max || count === 0) return '—'
  if (count >= max) return `${count} / PIENO`
  return `${count} pren.`
}

export default function BookingCalendarioPage() {
  const navigate = useNavigate()
  const [risorse, setRisorse] = useState([])
  const [occupancy, setOccupancy] = useState({})
  const [weekStart, setWeekStart] = useState(() => lunedìDellaSett(new Date()))
  const [loading, setLoading] = useState(true)

  // Giorno selezionato per drill-down
  const [selectedCell, setSelectedCell] = useState(null) // { risorsa_id, data }
  const [dayBookings, setDayBookings] = useState([])
  const [loadingDay, setLoadingDay] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dataDa = isoDate(weekStart)
  const dataA  = isoDate(addDays(weekStart, 6))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rs, occ] = await Promise.all([
        apiFetch('/api/booking/risorse'),
        apiFetch(`/api/booking/occupancy?data_da=${dataDa}&data_a=${dataA}`),
      ])
      setRisorse(rs)
      setOccupancy(occ)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [dataDa, dataA])

  useEffect(() => { load() }, [load])

  async function openCell(risorsa_id, data) {
    setSelectedCell({ risorsa_id, data })
    setLoadingDay(true)
    try {
      const data2 = await apiFetch(`/api/booking/prenotazioni?risorsa_id=${risorsa_id}&data=${data}`)
      setDayBookings(data2)
    } catch (e) { setDayBookings([]) }
    finally { setLoadingDay(false) }
  }

  function prevWeek() { setWeekStart(w => addDays(w, -7)) }
  function nextWeek() { setWeekStart(w => addDays(w, 7)) }
  function goToday()  { setWeekStart(lunedìDellaSett(new Date())) }

  const today = isoDate(new Date())

  const selectedRisorsa = risorse.find(r => r.id === selectedCell?.risorsa_id)

  const STATI_COLOR = {
    confermata: '#2e7d32', in_attesa: '#e65100', cancellata: '#999', completata: '#1565c0', no_show: '#b71c1c',
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Caricamento...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Calendario prenotazioni</h1>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            {MESI[weekStart.getMonth()]} {weekStart.getFullYear()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={prevWeek} style={btnStyle}>‹</button>
          <button onClick={goToday}  style={btnStyle}>Oggi</button>
          <button onClick={nextWeek} style={btnStyle}>›</button>
          <button onClick={() => navigate('/admin/booking/risorse')} style={{ ...btnStyle, background: '#1a1a2e', color: '#fff' }}>
            + Gestisci risorse
          </button>
          <button onClick={() => navigate('/admin/booking/prenotazioni')} style={btnStyle}>
            Lista prenotazioni
          </button>
        </div>
      </div>

      {risorse.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nessuna risorsa configurata</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Crea le tue prime risorse prenotabili per iniziare.</div>
          <button onClick={() => navigate('/admin/booking/risorse')} style={{ ...btnStyle, background: '#1a1a2e', color: '#fff', padding: '10px 20px' }}>
            Crea risorsa
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={thStyle({ width: 160 })}>Risorsa</th>
                {weekDays.map(d => {
                  const iso = isoDate(d)
                  const isToday = iso === today
                  return (
                    <th key={iso} style={thStyle({ textAlign: 'center', background: isToday ? '#e8f0fe' : undefined })}>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{DAY_LABELS[d.getDay()]}</div>
                      <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 600, color: isToday ? '#1a73e8' : '#1a1a2e' }}>
                        {d.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {risorse.map(r => (
                <tr key={r.id}>
                  <td style={tdStyle({ fontWeight: 600, fontSize: 13 })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.colore, flexShrink: 0 }} />
                      <div>
                        <div>{r.nome}</div>
                        <div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>
                          {r.modalita === 'coperti' ? `max ${r.max_coperti} coperti` : `${r.durata_minuti}min${r.quantita > 1 ? ` × ${r.quantita}` : ''}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const iso = isoDate(d)
                    const cell = occupancy[r.id]?.[iso]
                    const count = cell?.count || 0
                    const maxSlots = r.modalita === 'coperti' ? null : null // usato per colore relativo
                    const bg = occupancyColor(count, r.quantita || 1)
                    const isSelected = selectedCell?.risorsa_id === r.id && selectedCell?.data === iso

                    return (
                      <td key={iso}
                        onClick={() => count > 0 ? openCell(r.id, iso) : null}
                        style={{
                          ...tdStyle({ textAlign: 'center', cursor: count > 0 ? 'pointer' : 'default' }),
                          background: isSelected ? '#e8f0fe' : count > 0 ? bg : '#fafafa',
                          border: isSelected ? '2px solid #1a73e8' : '1px solid #f0f0f0',
                        }}>
                        <span style={{ fontSize: 12, color: count === 0 ? '#ccc' : '#333' }}>
                          {occupancyText(count, r.quantita)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pannello dettaglio giorno */}
      {selectedCell && (
        <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {selectedRisorsa?.nome} — {selectedCell.data}
            </h3>
            <button onClick={() => setSelectedCell(null)} style={{ ...btnStyle, padding: '4px 10px' }}>✕</button>
          </div>

          {loadingDay ? (
            <div style={{ color: '#999', fontSize: 14 }}>Caricamento...</div>
          ) : dayBookings.length === 0 ? (
            <div style={{ color: '#999', fontSize: 14 }}>Nessuna prenotazione per questo giorno.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayBookings.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '10px 14px', borderRadius: 8, background: '#f8f8f8',
                  borderLeft: `4px solid ${STATI_COLOR[b.stato] || '#ccc'}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 56, color: '#333' }}>
                    {b.ora_inizio?.slice(0, 5) || b.servizio}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.cliente_nome}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {b.cliente_email}{b.cliente_telefono ? ` · ${b.cliente_telefono}` : ''} · {b.n_persone} {b.n_persone === 1 ? 'persona' : 'persone'}
                    </div>
                    {b.note_cliente && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 2 }}>{b.note_cliente}</div>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: STATI_COLOR[b.stato], textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {b.stato}
                  </div>
                  {b.importo_totale > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32', whiteSpace: 'nowrap' }}>
                      €{b.importo_totale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const btnStyle = {
  background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '8px 14px',
  fontSize: 13, cursor: 'pointer', fontWeight: 500,
}
const thStyle = (extra = {}) => ({
  padding: '12px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#555', borderBottom: '2px solid #f0f0f0', background: '#fafafa', ...extra,
})
const tdStyle = (extra = {}) => ({
  padding: '10px', borderBottom: '1px solid #f0f0f0', fontSize: 13, verticalAlign: 'middle', ...extra,
})
