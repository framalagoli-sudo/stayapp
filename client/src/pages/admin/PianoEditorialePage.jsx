import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, Trash2,
  Lightbulb, X, Send, GripVertical, Eye, Pencil, Copy,
} from 'lucide-react'

const CANALI_INFO = {
  instagram:       { label: 'Instagram',       color: '#e1306c', bg: '#fce8ef' },
  facebook:        { label: 'Facebook',         color: '#1877f2', bg: '#e8f1fd' },
  linkedin:        { label: 'LinkedIn',         color: '#0a66c2', bg: '#e7f0f9' },
  tiktok:          { label: 'TikTok',           color: '#010101', bg: '#f0f0f0' },
  x:               { label: 'X (Twitter)',      color: '#14171a', bg: '#eff3f4' },
  google_business: { label: 'Google Business',  color: '#34a853', bg: '#e8f5eb' },
}

const STATO_INFO = {
  bozza:        { label: 'Bozza',        color: '#666',    bg: '#f5f5f5' },
  pianificato:  { label: 'Pianificato',  color: '#2b6cb0', bg: '#ebf8ff' },
  in_revisione: { label: 'In revisione', color: '#92400e', bg: '#fef3c7' },
  pubblicato:   { label: 'Pubblicato',   color: '#276749', bg: '#f0fff4' },
}

const PILLARS = [
  { key: '',                 label: 'Nessuno',          color: '#9ca3af', bg: '#f3f4f6' },
  { key: 'educativo',        label: 'Educativo',        color: '#7c3aed', bg: '#f3e8ff' },
  { key: 'promozionale',     label: 'Promozionale',     color: '#d97706', bg: '#fef3c7' },
  { key: 'dietro_le_quinte', label: 'Dietro le quinte', color: '#059669', bg: '#d1fae5' },
  { key: 'testimonianza',    label: 'Testimonianza',    color: '#2563eb', bg: '#dbeafe' },
  { key: 'ispirazione',      label: 'Ispirazione',      color: '#db2777', bg: '#fce7f3' },
  { key: 'annuncio',         label: 'Annuncio',         color: '#dc2626', bg: '#fee2e2' },
]

const DAYS_LABEL    = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const DAYS_LABEL_LG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

// ── Shared sub-components ──────────────────────────────────────────────────────

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

function PillarBadge({ pillar }) {
  if (!pillar) return null
  const p = PILLARS.find(x => x.key === pillar) || PILLARS[0]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: p.bg, color: p.color }}>
      {p.label}
    </span>
  )
}

function PreviewModal({ post, onClose, onClone }) {
  if (!post) return null
  const stInfo = STATO_INFO[post.stato] || STATO_INFO.bozza
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 4 }}>
          <X size={18} strokeWidth={1.5} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: stInfo.bg, color: stInfo.color }}>{stInfo.label}</span>
          {post.data_pianificata && (
            <span style={{ fontSize: 12, color: '#888' }}>
              {new Date(post.data_pianificata + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        {post.titolo && <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1a1a2e', paddingRight: 24 }}>{post.titolo}</h2>}
        {post.testo && <p style={{ margin: '0 0 16px', fontSize: 14, color: '#444', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{post.testo}</p>}
        {!post.titolo && !post.testo && <p style={{ color: '#aaa', fontSize: 13 }}>Nessun contenuto</p>}
        {post.immagine_url && (
          <img src={post.immagine_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 180, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', marginBottom: 12 }}>
          <PillarBadge pillar={post.pillar} />
          <CanaliPills canali={post.canali} />
          {(post.labels || []).map(l => (
            <span key={l} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600 }}>#{l}</span>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14, display: 'flex', gap: 8 }}>
          <button
            onClick={onClone}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555' }}
          >
            <Copy size={13} strokeWidth={1.5} /> Duplica
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PianoEditorialePage() {
  const navigate = useNavigate()
  const now = new Date()

  // Calendar state
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts]   = useState([])
  const [drafts, setDrafts] = useState([])
  const [idee, setIdee]     = useState([])
  const [loading, setLoading] = useState(true)

  // Week state
  const [weekStart, setWeekStart] = useState(() => getMondayOf(now))
  const [weekPosts, setWeekPosts] = useState([])
  const [weekLoading, setWeekLoading] = useState(false)

  // UI
  const [view, setView]           = useState('calendar')
  const [error, setError]         = useState('')
  const [labelFilter, setLabelFilter] = useState([])

  // Drag & drop
  const [draggedId, setDraggedId]   = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)

  // Preview modal
  const [previewPost, setPreviewPost] = useState(null)

  // ── Loaders ────────────────────────────────────────────────────────────────

  async function load(y = year, m = month) {
    setLoading(true)
    try {
      const mm = String(m + 1).padStart(2, '0')
      const [data, senzaData, ideaData] = await Promise.all([
        apiFetch(`/api/piano-editoriale?mese=${y}-${mm}`),
        apiFetch('/api/piano-editoriale?senza_data=1'),
        apiFetch('/api/piano-editoriale/idee'),
      ])
      setPosts(data)
      setDrafts(senzaData)
      setIdee(ideaData)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function loadWeek(start) {
    setWeekLoading(true)
    try {
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const da = start.toISOString().slice(0, 10)
      const a  = end.toISOString().slice(0, 10)
      const data = await apiFetch(`/api/piano-editoriale?da=${da}&a=${a}`)
      setWeekPosts(data)
    } catch (e) { setError(e.message) }
    setWeekLoading(false)
  }

  useEffect(() => { load() }, [year, month])
  useEffect(() => { if (view === 'week') loadWeek(weekStart) }, [view, weekStart])

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function prevWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  function nextWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Eliminare questo post?')) return
    try {
      await apiFetch(`/api/piano-editoriale/${id}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== id))
      setWeekPosts(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleClone(postId) {
    try {
      const copy = await apiFetch(`/api/piano-editoriale/${postId}/duplica`, { method: 'POST' })
      setPreviewPost(null)
      navigate(`/admin/piano-editoriale/${copy.id}`)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteIdea(id) {
    if (!confirm('Eliminare questa idea?')) return
    try {
      await apiFetch(`/api/piano-editoriale/idee/${id}`, { method: 'DELETE' })
      setIdee(prev => prev.filter(i => i.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handlePianifica(idea, data_pianificata) {
    try {
      await apiFetch(`/api/piano-editoriale/idee/${idea.id}/pianifica`, {
        method: 'POST',
        body: JSON.stringify({ data_pianificata }),
      })
      setIdee(prev => prev.filter(i => i.id !== idea.id))
      load(year, month)
    } catch (e) { setError(e.message) }
  }

  async function handleDateChange(postId, newDateStr) {
    try {
      await apiFetch(`/api/piano-editoriale/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ data_pianificata: newDateStr }),
      })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, data_pianificata: newDateStr } : p))
      setWeekPosts(prev => prev.map(p => p.id === postId ? { ...p, data_pianificata: newDateStr } : p))
    } catch (e) { setError(e.message) }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const cells = buildCalendarDays(year, month)

  const allLabels = [...new Set([...posts, ...drafts, ...weekPosts].flatMap(p => p.labels || []))]

  function applyLabelFilter(list) {
    if (!labelFilter.length) return list
    return list.filter(p => (p.labels || []).some(l => labelFilter.includes(l)))
  }

  function postsForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return applyLabelFilter(posts.filter(p => p.data_pianificata?.startsWith(dateStr)))
  }

  function postsForWeekDay(date) {
    const dateStr = date.toISOString().slice(0, 10)
    return applyLabelFilter(weekPosts.filter(p => p.data_pianificata?.startsWith(dateStr)))
  }

  // Week label
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()}–${weekEnd.getDate()} ${MESI[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
    : `${weekStart.getDate()} ${MESI[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()} ${MESI[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`

  // ── Render chip (plain function, NOT component — see CLAUDE.md note 22) ──────

  function renderPostChip(p, compact = true) {
    const stInfo = STATO_INFO[p.stato] || STATO_INFO.bozza
    const canDrag = p.stato !== 'pubblicato'
    return (
      <div
        key={p.id}
        draggable={canDrag}
        onDragStart={canDrag ? e => {
          e.stopPropagation()
          setDraggedId(p.id)
          e.dataTransfer.setData('text/plain', p.id)
          e.dataTransfer.effectAllowed = 'move'
        } : undefined}
        onDragEnd={() => setDraggedId(null)}
        style={{
          fontSize: compact ? 10 : 12,
          borderRadius: 4,
          background: stInfo.bg,
          color: stInfo.color,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          opacity: draggedId === p.id ? 0.35 : 1,
          cursor: canDrag ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        {canDrag && (
          <span style={{ padding: '2px 1px 2px 3px', opacity: 0.4, flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'grab' }}>
            <GripVertical size={compact ? 9 : 11} strokeWidth={2.5} />
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: compact ? '2px 2px' : '4px 4px', minWidth: 0 }}>
          {p.titolo || p.testo?.slice(0, 30) || '—'}
        </span>
        <span
          onClick={e => { e.stopPropagation(); setPreviewPost(p) }}
          title="Anteprima"
          style={{ padding: '2px 2px', cursor: 'pointer', flexShrink: 0, opacity: 0.5, display: 'flex', alignItems: 'center' }}
        >
          <Eye size={compact ? 9 : 11} strokeWidth={2.5} />
        </span>
        <span
          onClick={e => { e.stopPropagation(); navigate(`/admin/piano-editoriale/${p.id}`) }}
          title="Modifica"
          style={{ padding: '2px 3px 2px 1px', cursor: 'pointer', flexShrink: 0, opacity: 0.5, display: 'flex', alignItems: 'center' }}
        >
          <Pencil size={compact ? 9 : 11} strokeWidth={2.5} />
        </span>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
            {[
              { key: 'calendar', label: 'Mese' },
              { key: 'week',     label: 'Settimana' },
              { key: 'list',     label: 'Lista' },
              { key: 'idee',     label: 'Idee', count: idee.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === key ? '#fff' : 'transparent', color: view === key ? '#1a1a2e' : '#888', fontSize: 13, fontWeight: view === key ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {label}
                {count > 0 && (
                  <span style={{ background: view === key ? '#1a1a2e' : '#d1d5db', color: view === key ? '#fff' : '#6b7280', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {view !== 'idee' && (
            <button
              onClick={() => navigate('/admin/piano-editoriale/nuovo')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} strokeWidth={1.5} /> Nuovo post
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {/* Label filter bar */}
      {view !== 'idee' && allLabels.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {allLabels.map(l => (
            <button
              key={l}
              onClick={() => setLabelFilter(f => f.includes(l) ? f.filter(x => x !== l) : [...f, l])}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: labelFilter.includes(l) ? '#1a1a2e' : '#f0f0ff',
                color: labelFilter.includes(l) ? '#fff' : '#6366f1', fontWeight: 700 }}
            >
              #{l}
            </button>
          ))}
          {labelFilter.length > 0 && (
            <button
              onClick={() => setLabelFilter([])}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'transparent', color: '#aaa' }}
            >
              × rimuovi filtri
            </button>
          )}
        </div>
      )}

      {/* Navigazione */}
      {view === 'calendar' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            <ChevronLeft size={16} strokeWidth={1.5} color="#555" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MESI[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            <ChevronRight size={16} strokeWidth={1.5} color="#555" />
          </button>
        </div>
      )}

      {view === 'week' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={prevWeek} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            <ChevronLeft size={16} strokeWidth={1.5} color="#555" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 220, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            <ChevronRight size={16} strokeWidth={1.5} color="#555" />
          </button>
        </div>
      )}

      {/* ── Vista mese ── */}
      {view === 'calendar' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', minWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee' }}>
              {DAYS_LABEL.map(d => (
                <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((day, idx) => {
                const dayPosts = day ? postsForDay(day) : []
                const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
                const isDragOver = dragOverDay === dateStr && dateStr !== null
                return (
                  <div
                    key={idx}
                    onClick={() => day && navigate(`/admin/piano-editoriale/nuovo?data=${dateStr}`)}
                    onDragOver={dateStr ? e => { e.preventDefault(); setDragOverDay(dateStr) } : undefined}
                    onDragLeave={dateStr ? e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null) } : undefined}
                    onDrop={dateStr ? e => {
                      e.preventDefault(); e.stopPropagation()
                      setDragOverDay(null)
                      if (draggedId) { handleDateChange(draggedId, dateStr); setDraggedId(null) }
                    } : undefined}
                    style={{
                      minHeight: 90, padding: '6px 6px',
                      borderRight: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5',
                      background: isDragOver ? '#eef2ff' : (day ? '#fff' : '#fafafa'),
                      cursor: day ? 'pointer' : 'default',
                      boxSizing: 'border-box', position: 'relative',
                      outline: isDragOver ? '2px solid #6366f1' : 'none',
                      outlineOffset: -2, transition: 'background 0.1s',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: isToday ? '#1a1a2e' : 'transparent', color: isToday ? '#fff' : '#555', fontSize: 12, fontWeight: isToday ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                          {day}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {dayPosts.slice(0, 3).map(p => renderPostChip(p, true))}
                          {dayPosts.length > 3 && <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 5 }}>+{dayPosts.length - 3} altri</div>}
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

      {/* ── Vista settimana ── */}
      {view === 'week' && (
        weekLoading ? <p style={{ color: '#888' }}>Caricamento…</p> : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', minWidth: 700 }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee' }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekStart)
                  d.setDate(d.getDate() + i)
                  const isToday = d.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderRight: i < 6 ? '1px solid #f5f5f5' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        {DAYS_LABEL[i]}
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? '#1a1a2e' : 'transparent', color: isToday ? '#fff' : '#555', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Day columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'stretch' }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekStart)
                  d.setDate(d.getDate() + i)
                  const dateStr = d.toISOString().slice(0, 10)
                  const dayPs   = postsForWeekDay(d)
                  const isDragOver = dragOverDay === dateStr
                  return (
                    <div
                      key={i}
                      onClick={() => navigate(`/admin/piano-editoriale/nuovo?data=${dateStr}`)}
                      onDragOver={e => { e.preventDefault(); setDragOverDay(dateStr) }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null) }}
                      onDrop={e => {
                        e.preventDefault(); e.stopPropagation()
                        setDragOverDay(null)
                        if (draggedId) { handleDateChange(draggedId, dateStr); setDraggedId(null) }
                      }}
                      style={{
                        minHeight: 140, padding: '8px 6px',
                        borderRight: i < 6 ? '1px solid #f5f5f5' : 'none',
                        background: isDragOver ? '#eef2ff' : '#fff',
                        cursor: 'pointer', boxSizing: 'border-box',
                        outline: isDragOver ? '2px solid #6366f1' : 'none',
                        outlineOffset: -2, transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {dayPs.map(p => renderPostChip(p, false))}
                        {dayPs.length === 0 && (
                          <div style={{ fontSize: 11, color: '#e5e7eb', textAlign: 'center', paddingTop: 24 }}>+</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Vista lista ── */}
      {view === 'list' && (
        loading ? <p style={{ color: '#888' }}>Caricamento…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {applyLabelFilter(drafts).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 0 8px' }}>
                  Bozze non pianificate ({applyLabelFilter(drafts).length})
                </div>
                {applyLabelFilter(drafts).map(p => (
                  <PostRow key={p.id} p={p} navigate={navigate} handleDelete={handleDelete} handleClone={handleClone} />
                ))}
                {applyLabelFilter(posts).length > 0 && <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />}
              </>
            )}
            {applyLabelFilter(posts).length === 0 && applyLabelFilter(drafts).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
                <Calendar size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
                <p>Nessun post in questo mese</p>
              </div>
            ) : applyLabelFilter(posts).length > 0 && (
              <>
                {applyLabelFilter(drafts).length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 0 8px' }}>Questo mese</div>
                )}
                {applyLabelFilter(posts).map(p => (
                  <PostRow key={p.id} p={p} navigate={navigate} handleDelete={handleDelete} handleClone={handleClone} />
                ))}
              </>
            )}
          </div>
        )
      )}

      {/* ── Vista idee ── */}
      {view === 'idee' && (
        <IdeeView idee={idee} setIdee={setIdee} onDelete={handleDeleteIdea} onPianifica={handlePianifica} />
      )}

      <PreviewModal
        post={previewPost}
        onClose={() => setPreviewPost(null)}
        onClone={() => previewPost && handleClone(previewPost.id)}
      />
    </div>
  )
}

// ── IdeeView ──────────────────────────────────────────────────────────────────

function IdeeView({ idee, setIdee, onDelete, onPianifica }) {
  const [adding, setAdding] = useState(false)
  const [newTitolo, setNewTitolo] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newPillar, setNewPillar] = useState('')
  const [newCanali, setNewCanali] = useState([])
  const [saving, setSaving] = useState(false)
  const [pianificaId, setPianificaId] = useState(null)
  const [pianificaData, setPianificaData] = useState('')
  const [pianificaSaving, setPianificaSaving] = useState(false)
  const [filterPillar, setFilterPillar] = useState('')

  async function handleAdd() {
    if (!newTitolo.trim()) return
    setSaving(true)
    try {
      const idea = await apiFetch('/api/piano-editoriale/idee', {
        method: 'POST',
        body: JSON.stringify({ titolo: newTitolo.trim(), note: newNote.trim(), pillar: newPillar, canali: newCanali }),
      })
      setIdee(prev => [idea, ...prev])
      setNewTitolo(''); setNewNote(''); setNewPillar(''); setNewCanali([])
      setAdding(false)
    } catch {}
    setSaving(false)
  }

  async function confirmPianifica(idea) {
    setPianificaSaving(true)
    await onPianifica(idea, pianificaData || null)
    setPianificaId(null); setPianificaData('')
    setPianificaSaving(false)
  }

  const filtered = filterPillar ? idee.filter(i => i.pillar === filterPillar) : idee

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PILLARS.filter(p => p.key).map(p => (
            <button key={p.key} onClick={() => setFilterPillar(filterPillar === p.key ? '' : p.key)}
              style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filterPillar === p.key ? p.bg : '#f3f4f6',
                color: filterPillar === p.key ? p.color : '#9ca3af' }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAdding(a => !a)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} strokeWidth={1.5} /> Nuova idea
        </button>
      </div>

      {adding && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '2px solid #1a1a2e', marginBottom: 16 }}>
          <input autoFocus placeholder="Titolo dell'idea *" value={newTitolo} onChange={e => setNewTitolo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 600, boxSizing: 'border-box', marginBottom: 10 }} />
          <textarea placeholder="Note, spunti, angolazione… (opzionale)" value={newNote} onChange={e => setNewNote(e.target.value)} rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <select value={newPillar} onChange={e => setNewPillar(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' }}>
              {PILLARS.map(p => <option key={p.key} value={p.key}>{p.key ? p.label : 'Pillar…'}</option>)}
            </select>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {Object.entries(CANALI_INFO).map(([key, info]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 20, background: newCanali.includes(key) ? info.bg : '#f5f5f5', color: newCanali.includes(key) ? info.color : '#888', fontWeight: 600 }}>
                  <input type="checkbox" checked={newCanali.includes(key)} style={{ display: 'none' }} onChange={() => setNewCanali(c => c.includes(key) ? c.filter(x => x !== key) : [...c, key])} />
                  {info.label}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !newTitolo.trim()} style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: !newTitolo.trim() ? 0.5 : 1 }}>
              {saving ? 'Salvataggio…' : 'Aggiungi'}
            </button>
            <button onClick={() => { setAdding(false); setNewTitolo(''); setNewNote(''); setNewPillar(''); setNewCanali([]) }}
              style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#555' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: '#aaa' }}>
          <Lightbulb size={44} strokeWidth={1} style={{ marginBottom: 12, color: '#d1d5db' }} />
          <p style={{ fontWeight: 600, color: '#9ca3af', margin: '0 0 6px' }}>
            {filterPillar ? 'Nessuna idea con questo pillar' : 'Nessuna idea nel backlog'}
          </p>
          <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>Aggiungi spunti prima di pianificarli sul calendario</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onDelete={onDelete} pianificaId={pianificaId} setPianificaId={setPianificaId} pianificaData={pianificaData} setPianificaData={setPianificaData} pianificaSaving={pianificaSaving} onConfirmPianifica={confirmPianifica} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onDelete, pianificaId, setPianificaId, pianificaData, setPianificaData, pianificaSaving, onConfirmPianifica }) {
  const open = pianificaId === idea.id
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', lineHeight: 1.4, flex: 1 }}>{idea.titolo || '(senza titolo)'}</div>
        <button onClick={() => onDelete(idea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ddd', flexShrink: 0, marginTop: 2 }}>
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      {idea.note && <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{idea.note}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        <PillarBadge pillar={idea.pillar} />
        <CanaliPills canali={idea.canali} />
      </div>
      {open ? (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Data (opzionale)</label>
          <input type="date" value={pianificaData} onChange={e => setPianificaData(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onConfirmPianifica(idea)} disabled={pianificaSaving}
              style={{ flex: 1, padding: '8px 0', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Send size={13} strokeWidth={1.5} /> {pianificaSaving ? 'Creazione…' : 'Crea post'}
            </button>
            <button onClick={() => { setPianificaId(null); setPianificaData('') }}
              style={{ padding: '8px 12px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#555', fontSize: 13 }}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setPianificaId(idea.id); setPianificaData('') }}
          style={{ marginTop: 'auto', padding: '7px 14px', background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start' }}>
          Pianifica →
        </button>
      )}
    </div>
  )
}

// ── PostRow (list view) ────────────────────────────────────────────────────────

function PostRow({ p, navigate, handleDelete, handleClone }) {
  const stInfo = STATO_INFO[p.stato] || STATO_INFO.bozza
  return (
    <div
      onClick={() => navigate(`/admin/piano-editoriale/${p.id}`)}
      style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1px solid #eee' }}
    >
      <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
        {p.data_pianificata ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{new Date(p.data_pianificata).getDate()}</div>
            <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase' }}>{MESI[new Date(p.data_pianificata).getMonth()]?.slice(0, 3)}</div>
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{p.titolo || '(senza titolo)'}</div>
        {p.testo && <div style={{ fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.testo}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3, alignItems: 'center' }}>
          <CanaliPills canali={p.canali} />
          {(p.labels || []).map(l => (
            <span key={l} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600 }}>#{l}</span>
          ))}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: stInfo.bg, color: stInfo.color, flexShrink: 0 }}>
        {stInfo.label}
      </span>
      <button
        onClick={e => { e.stopPropagation(); handleClone(p.id) }}
        title="Duplica"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ccc', flexShrink: 0 }}
      >
        <Copy size={14} strokeWidth={1.5} />
      </button>
      <button onClick={(e) => handleDelete(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ddd', flexShrink: 0 }}>
        <Trash2 size={15} strokeWidth={1.5} />
      </button>
    </div>
  )
}
