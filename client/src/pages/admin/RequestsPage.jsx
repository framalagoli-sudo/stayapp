import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { Bell } from 'lucide-react'

const STATUS_LABELS = { open: 'Aperta', in_progress: 'In gestione', resolved: 'Risolta', cancelled: 'Annullata' }
const STATUS_COLORS = { open: '#e53e3e', in_progress: '#dd6b20', resolved: '#38a169', cancelled: '#aaa' }
const TYPE_LABELS   = { reception: 'Reception', maintenance: 'Manutenzione', housekeeping: 'Pulizie', other: 'Altro' }

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RequestsPage() {
  const { profile } = useAuth()
  const [requests,  setRequests]  = useState([])
  const [filter,    setFilter]    = useState('open')
  const [loading,   setLoading]   = useState(true)
  const [newCount,  setNewCount]  = useState(0)   // badge richieste arrivate in real-time
  const [toast,     setToast]     = useState(null) // testo notifica temporanea
  const toastTimer = useRef(null)

  // Carica richieste iniziali
  useEffect(() => {
    if (profile) fetchRequests()
  }, [profile, filter])

  // Supabase Realtime — ascolta INSERT sulla tabella requests
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('requests-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        (payload) => {
          const req = payload.new
          // Controlla che la richiesta sia pertinente al ruolo
          if (profile.role === 'admin_struttura' || profile.role === 'staff') {
            if (req.property_id !== profile.property_id) return
          }
          // Aggiunge in testa se il filtro corrente la include
          if (filter === 'all' || filter === req.status) {
            setRequests(prev => [req, ...prev])
          }
          // Badge + toast
          setNewCount(n => n + 1)
          showToast(`Nuova richiesta: ${TYPE_LABELS[req.type] || req.type}${req.room ? ` — Camera ${req.room}` : ''}`)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, filter])

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  async function fetchRequests() {
    setLoading(true)
    setNewCount(0)
    const params = new URLSearchParams()
    if (profile.role === 'admin_struttura' || profile.role === 'staff') {
      if (profile.property_id) params.set('property_id', profile.property_id)
    }
    if (filter !== 'all') params.set('status', filter)
    try {
      const data = await apiFetch(`/api/requests?${params}`)
      setRequests(data)
    } catch (_) {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e) {
      alert(e.message)
    }
  }

  const showProperty = profile && ['super_admin', 'admin', 'admin_gruppo', 'admin_azienda'].includes(profile.role)

  return (
    <div style={{ maxWidth: 720, position: 'relative' }}>

      {/* Toast notifica real-time */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1a1a2e', color: '#fff',
          padding: '12px 18px', borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.25s ease',
        }}>
          <Bell size={15} strokeWidth={2} color="#fff" />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          Richieste
          {newCount > 0 && (
            <span style={{
              marginLeft: 8, background: '#e53e3e', color: '#fff',
              fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              verticalAlign: 'middle', animation: 'pulse 1.5s infinite',
              display: 'inline-block',
            }}>
              {newCount} nuov{newCount === 1 ? 'a' : 'e'}
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38a169', boxShadow: '0 0 0 2px #38a16940' }} title="Real-time attivo" />
          <span style={{ fontSize: 12, color: '#888' }}>Live</span>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['open', 'in_progress', 'resolved', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd',
            background: filter === s ? '#1a1a2e' : '#fff',
            color: filter === s ? '#fff' : '#333',
            cursor: 'pointer', fontSize: 13, fontWeight: filter === s ? 600 : 400,
          }}>
            {s === 'all' ? 'Tutte' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Caricamento…</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#aaa' }}>
          <Bell size={36} strokeWidth={1.5} color="#ddd" style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15 }}>Nessuna richiesta.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              showProperty={showProperty}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ req, showProperty, onUpdateStatus }) {
  const [note, setNote]         = useState(req.note || '')
  const [editNote, setEditNote] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  async function saveNote() {
    setSavingNote(true)
    try {
      await apiFetch(`/api/requests/${req.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      })
      setEditNote(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingNote(false)
    }
  }

  const isNew = Date.now() - new Date(req.created_at).getTime() < 60_000

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: isNew ? '3px solid #e53e3e' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {TYPE_LABELS[req.type] || req.type}
            </span>
            {req.room && (
              <span style={{ fontSize: 12, color: '#666', background: '#f5f5f5', padding: '2px 8px', borderRadius: 8 }}>
                Camera {req.room}
              </span>
            )}
            {showProperty && req.properties?.name && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#f0f4ff', color: '#1a1a2e', padding: '2px 8px', borderRadius: 10 }}>
                {req.properties.name}
              </span>
            )}
            {isNew && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#e53e3e', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
                NUOVA
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: STATUS_COLORS[req.status],
            background: `${STATUS_COLORS[req.status]}18`,
            padding: '3px 10px', borderRadius: 12,
          }}>
            {STATUS_LABELS[req.status]}
          </span>
          <span style={{ fontSize: 11, color: '#aaa' }}>{formatDateTime(req.created_at)}</span>
        </div>
      </div>

      <p style={{ margin: '10px 0 12px', color: '#444', fontSize: 14, lineHeight: 1.6 }}>{req.message}</p>

      {/* Note interne */}
      <div style={{ marginBottom: 12 }}>
        {editNote ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Nota interna…"
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={saveNote} disabled={savingNote}
                style={{ padding: '6px 12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                {savingNote ? '…' : 'Salva'}
              </button>
              <button onClick={() => { setNote(req.note || ''); setEditNote(false) }}
                style={{ padding: '6px 12px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditNote(true)}
            style={{ fontSize: 12, color: note ? '#555' : '#bbb', cursor: 'pointer', fontStyle: note ? 'normal' : 'italic' }}
          >
            {note || 'Aggiungi nota interna…'}
          </div>
        )}
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {req.status === 'open' && (
          <button onClick={() => onUpdateStatus(req.id, 'in_progress')} style={btnStyle('#dd6b20')}>
            Prendi in carico
          </button>
        )}
        {req.status !== 'resolved' && req.status !== 'cancelled' && (
          <button onClick={() => onUpdateStatus(req.id, 'resolved')} style={btnStyle('#38a169')}>
            Risolvi
          </button>
        )}
        {req.status === 'open' && (
          <button onClick={() => onUpdateStatus(req.id, 'cancelled')} style={btnStyle('#aaa')}>
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}

const btnStyle = (color) => ({
  padding: '6px 14px', background: color, color: '#fff', border: 'none',
  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
})
