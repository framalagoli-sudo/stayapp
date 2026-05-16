import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { Calendar, Plus, ChevronLeft, ChevronRight, List, AlertCircle, Trash2 } from 'lucide-react'

const CANALI_INFO = {
  instagram:       { label: 'Instagram',       color: '#e1306c', bg: '#fce8ef' },
  facebook:        { label: 'Facebook',         color: '#1877f2', bg: '#e8f1fd' },
  linkedin:        { label: 'LinkedIn',         color: '#0a66c2', bg: '#e7f0f9' },
  tiktok:          { label: 'TikTok',           color: '#010101', bg: '#f0f0f0' },
  x:               { label: 'X (Twitter)',      color: '#14171a', bg: '#eff3f4' },
  google_business: { label: 'Google Business',  color: '#34a853', bg: '#e8f5eb' },
}

const STATO_INFO = {
  bozza:      { label: 'Bozza',      color: '#666',   bg: '#f5f5f5' },
  pianificato: { label: 'Pianificato', color: '#2b6cb0', bg: '#ebf8ff' },
  pubblicato:  { label: 'Pubblicato', color: '#276749', bg: '#f0fff4' },
}

function CanaliPills({ canali = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {canali.map(c => {
        const info = CANALI_INFO[c] || { label: c, color: '#666', bg: '#f5f5f5' }
        return (
          <span key={c} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: info.bg, color: info.color }}>
            {info.label}
          </span>
        )
      })}
    </div>
  )
}

const DAYS_LABEL = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function buildCalendarDays(year, month) {
  // month: 0-indexed JS month
  const firstDay = new Date(year, month, 1).getDay() // 0=dom
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // normalizza a lunedì=0
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function PianoEditorialePage() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]   = useState('calendar') // 'calendar' | 'list'
  const [error, setError] = useState('')

  async function load(y = year, m = month) {
    setLoading(true)
    try {
      const mm = String(m + 1).padStart(2, '0')
      const data = await apiFetch(`/api/piano-editoriale?mese=${y}-${mm}`)
      setPosts(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo post?')) return
    try {
      await apiFetch(`/api/piano-editoriale/${id}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  const cells = buildCalendarDays(year, month)

  function postsForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter(p => p.data_pianificata?.startsWith(dateStr))
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Piano Editoriale</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setView('calendar')} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === 'calendar' ? '#fff' : 'transparent', color: view === 'calendar' ? '#1a1a2e' : '#888', fontSize: 13, fontWeight: view === 'calendar' ? 600 : 400 }}>
              Calendario
            </button>
            <button onClick={() => setView('list')} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === 'list' ? '#fff' : 'transparent', color: view === 'list' ? '#1a1a2e' : '#888', fontSize: 13, fontWeight: view === 'list' ? 600 : 400 }}>
              Lista
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/piano-editoriale/nuovo')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Plus size={16} strokeWidth={1.5} /> Nuovo post
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {/* Navigazione mese */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
          <ChevronLeft size={16} strokeWidth={1.5} color="#555" />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MESI[month]} {year}</span>
        <button onClick={nextMonth} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
          <ChevronRight size={16} strokeWidth={1.5} color="#555" />
        </button>
      </div>

      {/* Vista calendario */}
      {view === 'calendar' && (
        <div style={{ overflowX: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', minWidth: 560 }}>
          {/* Intestazioni giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee' }}>
            {DAYS_LABEL.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Celle */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              const dayPosts = day ? postsForDay(day) : []
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
              return (
                <div
                  key={idx}
                  onClick={() => day && navigate(`/admin/piano-editoriale/nuovo?data=${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                  style={{
                    minHeight: 90, padding: '6px 6px', borderRight: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5',
                    background: day ? '#fff' : '#fafafa', cursor: day ? 'pointer' : 'default',
                    boxSizing: 'border-box', position: 'relative',
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: isToday ? '#1a1a2e' : 'transparent',
                        color: isToday ? '#fff' : '#555',
                        fontSize: 12, fontWeight: isToday ? 700 : 400,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 4,
                      }}>
                        {day}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayPosts.slice(0, 3).map(p => {
                          const stInfo = STATO_INFO[p.stato] || STATO_INFO.bozza
                          return (
                            <div
                              key={p.id}
                              onClick={e => { e.stopPropagation(); navigate(`/admin/piano-editoriale/${p.id}`) }}
                              style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, background: stInfo.bg, color: stInfo.color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                            >
                              {p.titolo || p.testo?.slice(0, 30) || '—'}
                            </div>
                          )
                        })}
                        {dayPosts.length > 3 && (
                          <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 5 }}>+{dayPosts.length - 3} altri</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </div>
      )}

      {/* Vista lista */}
      {view === 'list' && (
        loading ? <p style={{ color: '#888' }}>Caricamento…</p> :
        posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
            <Calendar size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
            <p>Nessun post in questo mese</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {posts.map(p => {
              const stInfo = STATO_INFO[p.stato] || STATO_INFO.bozza
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/piano-editoriale/${p.id}`)}
                  style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1px solid #eee' }}
                >
                  <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                    {p.data_pianificata ? (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>
                          {new Date(p.data_pianificata).getDate()}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase' }}>
                          {MESI[new Date(p.data_pianificata).getMonth()]?.slice(0, 3)}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{p.titolo || '(senza titolo)'}</div>
                    {p.testo && <div style={{ fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.testo}</div>}
                    <CanaliPills canali={p.canali} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: stInfo.bg, color: stInfo.color, flexShrink: 0 }}>
                    {stInfo.label}
                  </span>
                  <button onClick={(e) => handleDelete(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ddd', flexShrink: 0 }}>
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
