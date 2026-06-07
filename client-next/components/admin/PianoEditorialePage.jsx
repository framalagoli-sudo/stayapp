'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle, Trash2,
  Lightbulb, X, Send, GripVertical, Eye, Pencil, Copy, User, Layers, ExternalLink, BarChart2, Clock, Hash, Users, Flag,
} from 'lucide-react'

const TIPO_INFO = {
  post:           { label: 'Post',       color: '#718096' },
  reel:           { label: 'Reel',       color: '#e53e3e' },
  story:          { label: 'Story',      color: '#ed8936' },
  carosello:      { label: 'Carosello',  color: '#38a169' },
  video:          { label: 'Video',      color: '#dd6b20' },
  blog_post:      { label: 'Blog Post',  color: '#0077b5' },
  newsletter:     { label: 'Newsletter', color: '#6366f1' },
  evento:         { label: 'Evento',     color: '#0ea5e9' },
  ads:            { label: 'Ads',        color: '#d97706' },
  collaborazione: { label: 'Collab.',    color: '#ec4899' },
}

function toEmbedUrl(url) {
  if (!url) return url
  if (url.includes('canva.com/design') && !url.includes('embed')) {
    return url.includes('?') ? `${url}&embed` : `${url}?embed`
  }
  return url
}

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
  const [showDesign, setShowDesign] = useState(false)
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
          {post.tipo_contenuto && post.tipo_contenuto !== 'post' && (() => {
            const ti = TIPO_INFO[post.tipo_contenuto]
            return ti ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: ti.color + '18', color: ti.color }}>{ti.label}</span> : null
          })()}
          {post.data_pianificata && (
            <span style={{ fontSize: 12, color: '#888' }}>
              {new Date(post.data_pianificata.slice(0, 10) + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
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
        {(post.created_by_name || post.updated_by_name) && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {post.created_by_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <User size={11} strokeWidth={1.5} />
                <span>Creato da <strong style={{ color: '#666' }}>{post.created_by_name}</strong>
                  {post.created_at && <> · {new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</>}
                </span>
              </div>
            )}
            {post.updated_by_name && post.updated_by_name !== post.created_by_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#aaa' }}>
                <User size={11} strokeWidth={1.5} />
                <span>Modificato da <strong style={{ color: '#666' }}>{post.updated_by_name}</strong></span>
              </div>
            )}
          </div>
        )}
        <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={onClone}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555' }}
          >
            <Copy size={13} strokeWidth={1.5} /> Duplica
          </button>
          {post.design_url && (
            <button
              onClick={() => setShowDesign(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#f0f0ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6366f1' }}
            >
              <Layers size={13} strokeWidth={1.5} /> Anteprima design
            </button>
          )}
        </div>
      </div>

      {/* Modal iframe design */}
      {showDesign && post.design_url && (
        <div onClick={() => setShowDesign(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '92vw', height: '92vh', background: '#1a1a2e', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1a1a2e', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} strokeWidth={1.5} color="#a5b4fc" />
                {post.titolo || 'Anteprima design'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={post.design_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                >
                  <ExternalLink size={12} strokeWidth={2} /> Apri in nuova tab
                </a>
                <button onClick={() => setShowDesign(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <iframe
              src={toEmbedUrl(post.design_url)}
              style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
              allowFullScreen
              title="Anteprima design"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PianoEditorialePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti, attivita, activeAziendaId } = useAzienda()
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id || attivita?.[0]?.azienda_id
  const now = new Date()

  // Calendar state
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts]   = useState([])
  const [drafts, setDrafts] = useState([])
  const [idee, setIdee]     = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
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

  // Stats
  const [statsData, setStatsData] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Hashtag sets
  const [hashtagSets, setHashtagSets]         = useState([])
  const [hashtagLoading, setHashtagLoading]   = useState(false)

  // Team
  const [teamMembers, setTeamMembers]   = useState([])
  const [teamLoading, setTeamLoading]   = useState(false)

  // Campagne
  const [campagne, setCampagne]         = useState([])
  const [campagneLoading, setCampagneLoading] = useState(false)
  const [campagnaFilter, setCampagnaFilter]   = useState('')

  // ── Loaders ────────────────────────────────────────────────────────────────

  async function load(y = year, m = month) {
    setLoading(true)
    try {
      const mm = String(m + 1).padStart(2, '0')
      const [data, senzaData, ideaData, daApprovare] = await Promise.all([
        apiFetch(`/api/piano-editoriale?mese=${y}-${mm}`),
        apiFetch('/api/piano-editoriale?senza_data=1'),
        apiFetch('/api/piano-editoriale/idee'),
        apiFetch('/api/piano-editoriale?richiede_approvazione=true'),
      ])
      setPosts(data)
      setDrafts(senzaData)
      setIdee(ideaData)
      setPendingApprovals((daApprovare || []).filter(p => p.stato !== 'pubblicato'))
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
  useEffect(() => {
    if (view !== 'stats') return
    if (statsData) return
    setStatsLoading(true)
    apiFetch('/api/piano-editoriale/stats')
      .then(d => setStatsData(d || []))
      .catch(() => setStatsData([]))
      .finally(() => setStatsLoading(false))
  }, [view])

  useEffect(() => {
    if (view !== 'hashtag') return
    setHashtagLoading(true)
    apiFetch('/api/piano-editoriale/hashtag-sets')
      .then(d => setHashtagSets(d || []))
      .catch(() => {})
      .finally(() => setHashtagLoading(false))
  }, [view])

  useEffect(() => {
    if (view !== 'team') return
    if (teamMembers.length) return
    setTeamLoading(true)
    apiFetch('/api/users')
      .then(d => setTeamMembers(d || []))
      .catch(() => {})
      .finally(() => setTeamLoading(false))
  }, [view])

  useEffect(() => {
    if (campagne.length) return
    apiFetch('/api/piano-editoriale/campagne')
      .then(d => setCampagne(d || []))
      .catch(() => {})
  }, [])

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
      setPendingApprovals(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleClone(postId) {
    try {
      const copy = await apiFetch(`/api/piano-editoriale/${postId}/duplica`, { method: 'POST' })
      setPreviewPost(null)
      router.push(`/admin/piano-editoriale/${copy.id}`)
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

  const campagnaMap = Object.fromEntries(campagne.map(c => [c.id, c]))

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
          borderLeft: `3px solid ${TIPO_INFO[p.tipo_contenuto]?.color || '#718096'}`,
        }}
      >
        {canDrag && (
          <span style={{ padding: '2px 1px 2px 3px', opacity: 0.4, flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'grab' }}>
            <GripVertical size={compact ? 9 : 11} strokeWidth={2.5} />
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: compact ? '2px 2px' : '4px 4px', minWidth: 0 }}>
          {p.campagna_id && campagnaMap[p.campagna_id] && (
            <span style={{ display: 'inline-block', width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: '50%', background: campagnaMap[p.campagna_id].colore, marginRight: 3, flexShrink: 0, verticalAlign: 'middle' }} />
          )}
          {p.richiede_approvazione && p.stato !== 'pubblicato' && (
            <span style={{ marginRight: 3, fontSize: compact ? 8 : 9, background: '#fef3c7', color: '#92400e', borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>⏳</span>
          )}
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
          onClick={e => { e.stopPropagation(); router.push(`/admin/piano-editoriale/${p.id}`) }}
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
              { key: 'team',      label: 'Team' },
              { key: 'campagne',  label: 'Campagne', count: campagne.length || undefined },
              { key: 'calendar', label: 'Mese' },
              { key: 'week',     label: 'Settimana' },
              { key: 'list',     label: 'Lista', count: pendingApprovals.length, countColor: '#92400e', countBg: '#fef3c7' },
              { key: 'idee',     label: 'Idee', count: idee.length },
              { key: 'stats',    label: 'Stats' },
              { key: 'hashtag',  label: 'Hashtag' },
            ].map(({ key, label, count, countColor, countBg }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === key ? '#fff' : 'transparent', color: view === key ? '#1a1a2e' : '#888', fontSize: 13, fontWeight: view === key ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {label}
                {count > 0 && (
                  <span style={{ background: countBg || (view === key ? '#1a1a2e' : '#d1d5db'), color: countColor || (view === key ? '#fff' : '#6b7280'), borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {view !== 'idee' && view !== 'stats' && view !== 'hashtag' && view !== 'team' && view !== 'campagne' &&
           (profile?.role !== 'staff' || profile?.permissions?.pe_crea !== false) && (
            <button
              onClick={() => router.push('/admin/piano-editoriale/nuovo')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} strokeWidth={1.5} /> Nuovo contenuto
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
                    onClick={() => day && router.push(`/admin/piano-editoriale/nuovo?data=${dateStr}`)}
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
                      onClick={() => router.push(`/admin/piano-editoriale/nuovo?data=${dateStr}`)}
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
            {pendingApprovals.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>⏳</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      {pendingApprovals.length} {pendingApprovals.length === 1 ? 'contenuto in attesa' : 'contenuti in attesa'} di approvazione
                    </span>
                  </div>
                </div>
                {pendingApprovals.map(p => (
                  <PostRow key={p.id} p={p} handleDelete={handleDelete} handleClone={handleClone} highlight campagnaMap={campagnaMap} />
                ))}
                <div style={{ borderTop: '1px solid #eee', margin: '4px 0 8px' }} />
              </>
            )}
            {applyLabelFilter(drafts).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 0 8px' }}>
                  Bozze non pianificate ({applyLabelFilter(drafts).length})
                </div>
                {applyLabelFilter(drafts).map(p => (
                  <PostRow key={p.id} p={p} handleDelete={handleDelete} handleClone={handleClone} campagnaMap={campagnaMap} />
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
                  <PostRow key={p.id} p={p} handleDelete={handleDelete} handleClone={handleClone} campagnaMap={campagnaMap} />
                ))}
              </>
            )}
          </div>
        )
      )}

      {/* ── Vista campagne ── */}
      {view === 'campagne' && (
        <CampaignView campagne={campagne} setCampagne={setCampagne} aziendaId={aziendaId} />
      )}

      {/* ── Vista team ── */}
      {view === 'team' && (
        teamLoading
          ? <p style={{ color: '#888' }}>Caricamento…</p>
          : <TeamView profile={profile} members={teamMembers} setMembers={setTeamMembers} />
      )}

      {/* ── Vista hashtag ── */}
      {view === 'hashtag' && (
        hashtagLoading
          ? <p style={{ color: '#888' }}>Caricamento…</p>
          : <HashtagView sets={hashtagSets} setSets={setHashtagSets} aziendaId={aziendaId} />
      )}

      {/* ── Vista stats ── */}
      {view === 'stats' && (
        statsLoading ? <p style={{ color: '#888' }}>Caricamento…</p> : <StatsView data={statsData || []} />
      )}

      {/* ── Vista idee ── */}
      {view === 'idee' && (
        <IdeeView idee={idee} setIdee={setIdee} onDelete={handleDeleteIdea} onPianifica={handlePianifica} aziendaId={aziendaId} />
      )}

      <PreviewModal
        post={previewPost}
        onClose={() => setPreviewPost(null)}
        onClone={() => previewPost && handleClone(previewPost.id)}
      />
    </div>
  )
}

// ── HashtagView ───────────────────────────────────────────────────────────────

function HashtagView({ sets, setSets, aziendaId }) {
  const [adding, setAdding]       = useState(false)
  const [nome, setNome]           = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [canale, setCanale]       = useState('')
  const [pillar, setPillar]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [filterCanale, setFilterCanale] = useState('')

  async function handleAdd() {
    if (!nome.trim() || !tagsInput.trim()) return
    setSaving(true)
    const tags = tagsInput.split(/[\s,]+/).map(t => t.replace(/^#/, '').toLowerCase().trim()).filter(Boolean)
    try {
      const set = await apiFetch('/api/piano-editoriale/hashtag-sets', {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), canale, pillar, tags, azienda_id: aziendaId }),
      })
      setSets(prev => [set, ...prev])
      setNome(''); setTagsInput(''); setCanale(''); setPillar('')
      setAdding(false)
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questo set?')) return
    try {
      await apiFetch(`/api/piano-editoriale/hashtag-sets/${id}`, { method: 'DELETE' })
      setSets(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  const filtered = filterCanale ? sets.filter(s => s.canale === filterCanale) : sets
  const canaliUsati = [...new Set(sets.map(s => s.canale).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {canaliUsati.map(c => {
            const info = CANALI_INFO[c] || { label: c, color: '#666', bg: '#f5f5f5' }
            return (
              <button key={c} onClick={() => setFilterCanale(filterCanale === c ? '' : c)}
                style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: filterCanale === c ? info.bg : '#f3f4f6',
                  color: filterCanale === c ? info.color : '#9ca3af' }}>
                {info.label}
              </button>
            )
          })}
        </div>
        <button onClick={() => setAdding(a => !a)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} strokeWidth={1.5} /> Nuovo set
        </button>
      </div>

      {adding && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '2px solid #1a1a2e', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            <input autoFocus placeholder="Nome set *  es. Estate Instagram" value={nome} onChange={e => setNome(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }} />
            <select value={canale} onChange={e => setCanale(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' }}>
              <option value="">Canale (opzionale)</option>
              {Object.entries(CANALI_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={pillar} onChange={e => setPillar(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' }}>
              <option value="">Pillar (opzionale)</option>
              {PILLARS.filter(p => p.key).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <textarea
            placeholder="#hashtag1 #hashtag2 hashtag3 — separati da spazio o virgola, # opzionale"
            value={tagsInput} onChange={e => setTagsInput(e.target.value)} rows={2}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !nome.trim() || !tagsInput.trim()}
              style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: (!nome.trim() || !tagsInput.trim()) ? 0.5 : 1 }}>
              {saving ? 'Salvataggio…' : 'Salva set'}
            </button>
            <button onClick={() => { setAdding(false); setNome(''); setTagsInput(''); setCanale(''); setPillar('') }}
              style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#555' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: '#aaa' }}>
          <Hash size={44} strokeWidth={1} style={{ marginBottom: 12, color: '#d1d5db' }} />
          <p style={{ fontWeight: 600, color: '#9ca3af', margin: '0 0 6px' }}>Nessun set hashtag</p>
          <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>Crea set riutilizzabili da inserire nei tuoi contenuti</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(set => {
            const cInfo = CANALI_INFO[set.canale]
            const pInfo = PILLARS.find(p => p.key === set.pillar)
            return (
              <div key={set.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{set.nome}</span>
                  <button onClick={() => handleDelete(set.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: 2, flexShrink: 0 }}>
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {set.tags.map(t => (
                    <span key={t} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600 }}>#{t}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {cInfo && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: cInfo.bg, color: cInfo.color }}>{cInfo.label}</span>}
                  {pInfo && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: pInfo.bg, color: pInfo.color }}>{pInfo.label}</span>}
                  <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>{set.tags.length} tag</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── StatsView ─────────────────────────────────────────────────────────────────

function StatsView({ data }) {
  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#aaa' }}>
        <BarChart2 size={44} strokeWidth={1} style={{ marginBottom: 12, color: '#d1d5db' }} />
        <p style={{ fontWeight: 600, color: '#9ca3af', margin: 0 }}>Nessun dato ancora</p>
        <p style={{ fontSize: 13, color: '#d1d5db', margin: '6px 0 0' }}>Inizia a creare contenuti per vedere le statistiche</p>
      </div>
    )
  }

  // KPI
  const totale      = data.length
  const pubblicati  = data.filter(p => p.stato === 'pubblicato').length
  const pianificati = data.filter(p => p.stato === 'pianificato').length
  const bozze       = data.filter(p => p.stato === 'bozza').length
  const inRevisione = data.filter(p => p.stato === 'in_revisione').length

  // Tasso pubblicazione (post con data nel passato)
  const oggi = new Date().toISOString().slice(0, 10)
  const conDataPassata = data.filter(p => p.data_pianificata && p.data_pianificata.slice(0, 10) <= oggi)
  const tassoPublicazione = conDataPassata.length
    ? Math.round((conDataPassata.filter(p => p.stato === 'pubblicato').length / conDataPassata.length) * 100)
    : null

  // Per tipo
  const perTipo = {}
  data.forEach(p => {
    const k = p.tipo_contenuto || 'post'
    perTipo[k] = (perTipo[k] || 0) + 1
  })
  const tipiSorted = Object.entries(perTipo).sort((a, b) => b[1] - a[1])
  const maxTipo = Math.max(...tipiSorted.map(e => e[1]))

  // Per canale
  const perCanale = {}
  data.forEach(p => {
    (p.canali || []).forEach(c => { perCanale[c] = (perCanale[c] || 0) + 1 })
  })
  const canaliSorted = Object.entries(perCanale).sort((a, b) => b[1] - a[1])
  const maxCanale = canaliSorted.length ? Math.max(...canaliSorted.map(e => e[1])) : 1

  // Trend ultimi 6 mesi
  const trend = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const key = `${y}-${m}`
    const count = data.filter(p => p.data_pianificata?.startsWith(key)).length
    trend.push({ label: MESI[d.getMonth()].slice(0, 3), count })
  }
  const maxTrend = Math.max(...trend.map(t => t.count), 1)

  const kpiStyle = { background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: '16px 20px', flex: 1, minWidth: 100 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Totale contenuti', value: totale, color: '#1a1a2e' },
          { label: 'Pubblicati', value: pubblicati, color: '#276749' },
          { label: 'Pianificati', value: pianificati, color: '#2b6cb0' },
          { label: 'Bozze', value: bozze, color: '#888' },
          ...(inRevisione > 0 ? [{ label: 'In revisione', value: inRevisione, color: '#92400e' }] : []),
          ...(tassoPublicazione !== null ? [{ label: 'Tasso pubblicazione', value: `${tassoPublicazione}%`, color: tassoPublicazione >= 70 ? '#276749' : tassoPublicazione >= 40 ? '#d97706' : '#c53030' }] : []),
        ].map(k => (
          <div key={k.label} style={kpiStyle}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Per tipo */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={14} strokeWidth={1.5} /> Per tipo di contenuto
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tipiSorted.map(([tipo, count]) => {
              const info = TIPO_INFO[tipo] || { label: tipo, color: '#718096' }
              return (
                <div key={tipo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{info.label}</span>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / maxTipo) * 100}%`, background: info.color, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Per canale */}
        {canaliSorted.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={14} strokeWidth={1.5} /> Per canale
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {canaliSorted.map(([canale, count]) => {
                const info = CANALI_INFO[canale] || { label: canale, color: '#718096', bg: '#f5f5f5' }
                return (
                  <div key={canale}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{info.label}</span>
                      <span style={{ fontSize: 12, color: '#888', fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: '#f5f5f5', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxCanale) * 100}%`, background: info.color, borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Trend 6 mesi */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} strokeWidth={1.5} /> Trend ultimi 6 mesi
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {trend.map(t => (
              <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#888', fontWeight: 700 }}>{t.count || ''}</span>
                <div style={{ width: '100%', background: '#f5f5f5', borderRadius: 4, overflow: 'hidden', height: 52, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${Math.max(4, (t.count / maxTrend) * 100)}%`, background: t.count ? '#1a1a2e' : '#e5e7eb', borderRadius: 4, transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── IdeeView ──────────────────────────────────────────────────────────────────

function IdeeView({ idee, setIdee, onDelete, onPianifica, aziendaId }) {
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
        body: JSON.stringify({ titolo: newTitolo.trim(), note: newNote.trim(), pillar: newPillar, canali: newCanali, azienda_id: aziendaId }),
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

function PostRow({ p, handleDelete, handleClone, highlight, campagnaMap = {} }) {
  const stInfo   = STATO_INFO[p.stato] || STATO_INFO.bozza
  const campagna = p.campagna_id ? campagnaMap[p.campagna_id] : null
  return (
    <div
      onClick={() => router.push(`/admin/piano-editoriale/${p.id}`)}
      style={{ background: highlight ? '#fff7ed' : '#fff', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: highlight ? '1px solid #fed7aa' : '1px solid #eee' }}
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
      {p.tipo_contenuto && p.tipo_contenuto !== 'post' && (() => {
        const ti = TIPO_INFO[p.tipo_contenuto]
        return ti ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: ti.color + '18', color: ti.color, flexShrink: 0 }}>{ti.label}</span> : null
      })()}
      {campagna && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: campagna.colore + '20', color: campagna.colore, flexShrink: 0, border: `1px solid ${campagna.colore}40` }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: campagna.colore, flexShrink: 0 }} />
          {campagna.nome}
        </span>
      )}
      {p.richiede_approvazione && p.stato !== 'pubblicato' && (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', flexShrink: 0 }}>⏳ Approvazione</span>
      )}
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

// ── TeamView ──────────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  super_admin:   { label: 'Super Admin', color: '#7c3aed', bg: '#f3e8ff' },
  admin_azienda: { label: 'Admin',       color: '#2563eb', bg: '#dbeafe' },
  staff:         { label: 'Staff',       color: '#059669', bg: '#d1fae5' },
}

const PE_PERMS = [
  { key: 'pe_crea',      label: 'Crea',      desc: 'Può creare e modificare bozze',        default: true  },
  { key: 'pe_pianifica', label: 'Pianifica', desc: 'Può impostare date e pianificare',     default: true  },
  { key: 'pe_pubblica',  label: 'Pubblica',  desc: 'Può pubblicare direttamente',          default: false },
  { key: 'pe_approva',   label: 'Approva',   desc: 'Può approvare contenuti in revisione', default: false },
]

function TeamView({ profile, members, setMembers }) {
  const [localPerms, setLocalPerms] = useState({})

  function getPerms(member) {
    return localPerms[member.id] ?? member.permissions ?? {}
  }

  async function togglePerm(member, key, defaultVal) {
    const current = getPerms(member)
    const currentVal = key in current ? current[key] : defaultVal
    const newPerms = { ...current, [key]: !currentVal }
    setLocalPerms(p => ({ ...p, [member.id]: newPerms }))
    try {
      await apiFetch(`/api/users/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: newPerms }),
      })
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: newPerms } : m))
    } catch {
      setLocalPerms(p => ({ ...p, [member.id]: current }))
    }
  }

  function initials(name) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const allMembers = [
    { id: profile?.id, full_name: profile?.full_name || 'Tu', role: profile?.role, email: null, isSelf: true },
    ...(members || []).filter(m => m.id !== profile?.id),
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
          Persone con accesso al piano editoriale. Configura cosa può fare ogni membro staff.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allMembers.map(m => {
          const ri = ROLE_LABEL[m.role] || { label: m.role || 'Sconosciuto', color: '#666', bg: '#f5f5f5' }
          const isStaffMember = m.role === 'staff'
          const perms = getPerms(m)
          return (
            <div key={m.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isStaffMember ? 14 : 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.isSelf ? '#1a1a2e' : '#f0f0ff', color: m.isSelf ? '#fff' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {initials(m.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{m.full_name || '—'}</span>
                    {m.isSelf && <span style={{ fontSize: 10, fontWeight: 600, color: '#aaa' }}>(tu)</span>}
                  </div>
                  {m.email && <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{m.email}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ri.bg, color: ri.color, flexShrink: 0 }}>{ri.label}</span>
              </div>

              {isStaffMember && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 60 }}>
                  {PE_PERMS.map(({ key, label, desc, default: def }) => {
                    const active = key in perms ? !!perms[key] : def
                    return (
                      <button
                        key={key}
                        title={desc}
                        onClick={() => togglePerm(m, key, def)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: active ? '#1a1a2e' : '#f3f4f6',
                          color: active ? '#fff' : '#9ca3af',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: active ? '#4ade80' : '#d1d5db',
                        }} />
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              {m.isSelf && (
                <div style={{ paddingLeft: 60, fontSize: 12, color: '#aaa' }}>
                  Accesso completo — admin
                </div>
              )}
            </div>
          )
        })}
      </div>
      {members.length === 0 && (
        <div style={{ marginTop: 16, padding: '20px 24px', background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af' }}>
            <Users size={18} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>Nessun membro staff. Invita collaboratori da <strong>Impostazioni → Staff</strong>.</span>
          </div>
        </div>
      )}
    </div>
  )
}


// ── CampaignView ──────────────────────────────────────────────────────────────

const COLORS_PRESET = ['#6366f1','#ec4899','#f97316','#059669','#0ea5e9','#7c3aed','#dc2626','#d97706','#0284c7','#16a34a']

function CampaignView({ campagne, setCampagne, aziendaId }) {
  const [adding, setAdding]           = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [nome, setNome]               = useState('')
  const [colore, setColore]           = useState('#6366f1')
  const [dataInizio, setDataInizio]   = useState('')
  const [dataFine, setDataFine]       = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saving, setSaving]           = useState(false)

  function resetForm() { setNome(''); setColore('#6366f1'); setDataInizio(''); setDataFine(''); setDescrizione('') }

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        const updated = await apiFetch(`/api/piano-editoriale/campagne/${editingId}`, {
          method: 'PATCH', body: JSON.stringify({ nome, colore, data_inizio: dataInizio || null, data_fine: dataFine || null, descrizione }),
        })
        setCampagne(prev => prev.map(c => c.id === editingId ? updated : c))
        setEditingId(null)
      } else {
        const created = await apiFetch('/api/piano-editoriale/campagne', {
          method: 'POST', body: JSON.stringify({ nome, colore, data_inizio: dataInizio || null, data_fine: dataFine || null, descrizione, azienda_id: aziendaId }),
        })
        setCampagne(prev => [...prev, created])
        setAdding(false)
      }
      resetForm()
    } catch {}
    setSaving(false)
  }

  function startEdit(c) {
    setEditingId(c.id); setNome(c.nome); setColore(c.colore)
    setDataInizio(c.data_inizio || ''); setDataFine(c.data_fine || ''); setDescrizione(c.descrizione || '')
    setAdding(false)
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa campagna? I post associati non verranno eliminati.')) return
    try {
      await apiFetch(`/api/piano-editoriale/campagne/${id}`, { method: 'DELETE' })
      setCampagne(prev => prev.filter(c => c.id !== id))
    } catch {}
  }

  function renderForm(submitLabel, onCancel) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '2px solid #1a1a2e', marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
          <input placeholder="Nome campagna *" value={nome} onChange={e => setNome(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }} />
          <input type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }} />
          <input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Colore</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS_PRESET.map(col => (
              <button key={col} onClick={() => setColore(col)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: colore === col ? '3px solid #1a1a2e' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
            ))}
          </div>
        </div>
        <input placeholder="Descrizione (opzionale)" value={descrizione} onChange={e => setDescrizione(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || !nome.trim()}
            style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: !nome.trim() ? 0.5 : 1 }}>
            {saving ? 'Salvataggio…' : submitLabel}
          </button>
          <button onClick={onCancel}
            style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#555' }}>
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setAdding(a => !a); setEditingId(null); resetForm() }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} strokeWidth={1.5} /> Nuova campagna
        </button>
      </div>

      {adding && !editingId && renderForm('Crea campagna', () => { resetForm(); setAdding(false) })}

      {campagne.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <Flag size={44} strokeWidth={1} style={{ marginBottom: 12, color: '#d1d5db' }} />
          <p style={{ fontWeight: 600, color: '#9ca3af', margin: '0 0 6px' }}>Nessuna campagna</p>
          <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>Raggruppa i contenuti per campagna: lanci, stagioni, promozioni</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campagne.map(c => (
            <div key={c.id}>
              {editingId === c.id && renderForm('Aggiorna', () => { resetForm(); setEditingId(null) })}
              {editingId !== c.id && (
                <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.colore, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{c.nome}</div>
                    {(c.data_inizio || c.data_fine) && (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {c.data_inizio ? new Date(c.data_inizio + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '…'}
                        {' → '}
                        {c.data_fine ? new Date(c.data_fine + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : 'in corso'}
                      </div>
                    )}
                    {c.descrizione && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.descrizione}</div>}
                  </div>
                  <button onClick={() => startEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4 }}>
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: 4 }}>
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
